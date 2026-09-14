// ─── 국문 → 영문 일괄 번역 ────────────────────────────────────────────────────
// queries.ts 의 국문 보강 경로만 쓴다. TourAPI 영문 응답이 비어 있을 때,
// 국문으로 받은 제목·주소를 화면에 올릴 수 있게 만든다.
//
// 결과는 캐싱한다. TourAPI 응답 자체의 캐시 금지와는 별개다 —
// 캐시에 들어가는 것은 공공데이터가 아니라 우리가 만든 파생물(번역문)이고,
// 이 파일은 TourAPI 를 부르지 않는다. 국문 문자열을 받아 영문을 돌려줄 뿐이다.

import { unstable_cache } from "next/cache";
import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import { retryOn503 } from "@/lib/gemini";

/** draft-actions.ts 의 AI 초안·번역과 같은 모델을 쓴다 */
const MODEL = "gemini-2.5-flash";

/**
 * 한 번에 보낼 최대 항목 수.
 *
 * 작게 잘라 병렬로 던지고 싶어지지만 그러면 안 된다. 이 키의 실측 할당량은
 * gemini-2.5-flash 기준 하루 20회(GenerateRequestsPerDayPerProjectPerModel-FreeTier)라
 * 조각 수가 곧 하루치 예산의 소모량이다. 조각을 넷으로 쪼개면 한 번 둘러보는 데
 * 하루 예산의 1/5 이 나간다. 지연은 조각화가 아니라 thinking 을 끄는 쪽으로 줄인다.
 *
 * 상한을 20 으로 둔 것은 품질 때문이다 — 45개를 한 번에 보냈을 때 모델이 따옴표를
 * 빠뜨린 JSON 을 돌려준 적이 있다. 20개는 실측에서 20/20 을 안정적으로 채웠다.
 * 지금 호출부는 어느 경로도 20개를 넘지 않아 실제로는 잘리지 않는다.
 */
const CHUNK_SIZE = 20;

/**
 * 번역 한 건의 제한 시간. 넘으면 국문 원문을 그대로 쓴다 — 실패 폴백과 같은 길이다.
 *
 * thinking 을 끈 20개 조각의 실측이 3.1초다. 두 배 가까운 여유를 두되,
 * 모델이 느린 날 사용자를 붙잡아 두지 않도록 여기서 끊는다.
 * 재시도까지 이 시한을 공유한다(아래 signal) — 3회 재시도가 시한을 3배로 늘리면 의미가 없다.
 */
const TRANSLATE_TIMEOUT_MS = 5_000;

/**
 * SDK 0.24 의 GenerationConfig 에는 thinkingConfig 가 없다. 요청 본문에는 그대로 실려 나가고
 * 서버가 받아들인다 — 타입에만 없다.
 *
 * 이걸 끄는 것이 이 파일에서 가장 큰 지연 감소다. 실측으로 20개 항목 기준
 * 사고 토큰 1,006개 대 출력 212개였고, 끄면 17.6초가 3.1초가 된다.
 * 번역은 추론이 필요한 작업이 아니라 사전을 찾는 작업이라 품질 손실도 없었다.
 */
type ThinkingGenerationConfig = GenerationConfig & {
  thinkingConfig?: { thinkingBudget: number };
};

function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  const generationConfig: ThinkingGenerationConfig = {
    // 번역은 매번 같은 답이 나와야 한다. 응답 형식도 모델에게 강제해 파싱 실패를 줄인다
    temperature: 0,
    responseMimeType: "application/json",
    thinkingConfig: { thinkingBudget: 0 },
  };
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL,
    generationConfig,
  });
}

/**
 * 조각 하나를 번역해 "국문 → 영문" 맵을 돌려준다.
 *
 * 프롬프트에는 t0, t1 … 이라는 자리 이름을 붙여 보내고 그 이름으로 되받는다.
 * 배열 인덱스로 짝을 맞추지 않는 이유와 같다 — 모델이 순서를 바꾸거나 한 건을 빠뜨려도
 * 엉뚱한 이름에 붙지 않는다. 요청한 자리 중 문자열로 돌아온 것만 남긴다.
 */
async function translateChunk(texts: string[]): Promise<Record<string, string>> {
  const model = getGemini();
  const fieldList = texts.map((v, i) => `"t${i}": ${JSON.stringify(v)}`).join("\n");

  const prompt = `You are a professional Korean-to-English translator for Korean tourism content.
Translate each value from Korean to natural English.
- Place, festival and venue names: use the official English name if one exists, otherwise romanize it.
- Keep each translation short. Do not add explanations, notes, or parentheses that were not in the source.
Return ONLY a valid JSON object with exactly the same keys.

Values to translate:
${fieldList}`;

  // 시한은 재시도 전체가 공유한다 — 한 번 만료되면 남은 재시도는 즉시 중단된다.
  // 만료는 503 이 아니므로 retryOn503 이 그대로 전파하고, 호출부가 국문 원문으로 간다.
  const signal = AbortSignal.timeout(TRANSLATE_TIMEOUT_MS);

  const text = await retryOn503(async () => {
    const result = await model.generateContent(prompt, { signal });
    return result.response
      .text()
      .trim()
      .replace(/^```json\n?/, "")
      .replace(/\n?```$/, "");
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};

  // 큰 조각에서 모델이 따옴표를 빠뜨린 JSON 을 돌려준 적이 있다.
  // 여기서 던지면 조각 하나가 통째로 날아갈 뿐이라 조용히 비운다 — 호출부가 국문을 쓴다
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  } catch {
    console.error("[translateKoToEn] JSON 파싱 실패 — 국문 원문을 그대로 쓴다");
    return {};
  }

  const out: Record<string, string> = {};
  texts.forEach((source, i) => {
    const value = parsed[`t${i}`];
    if (typeof value === "string" && value.trim() !== "") out[source] = value.trim();
  });
  return out;
}

/**
 * 캐시 수명 30일.
 *
 * 같은 국문 문자열은 언제 물어봐도 같은 영문이 나온다 — 시간이 지나 틀려지는 값이 아니라
 * 짧게 잡을 이유가 없다. 짧게 잡으면 같은 동네를 내일 다시 열었을 때 또 한 번을 쓰는데,
 * 하루 20회짜리 예산에서는 그게 곧 기능이 멈추는 길이다.
 *
 * 항목 하나가 이름 스무 쌍 남짓이라 1~2KB다. 오래 둬도 캐시가 부풀지 않는다.
 * 프롬프트나 모델을 바꿔 결과를 갈아야 할 때는 revalidateTag 로 태그를 털면 된다.
 */
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const CACHE_TAG = "tour-api-translate";

/**
 * 번역 본체. unstable_cache 가 인자를 키에 넣으므로 받는 배열이 곧 캐시 키다.
 *
 * 비어 있으면 던진다. 캐시는 함수가 돌려준 것을 그대로 담기 때문에, 실패해서 빈 맵을
 * 돌려주면 그 빈 맵이 30일 동안 굳는다 — 한 번의 429 가 그 지역의 번역을 한 달간 막는다.
 * 던지면 아무것도 담기지 않고 다음 요청이 다시 시도한다.
 */
async function translateAll(texts: string[]): Promise<Record<string, string>> {
  const chunks: string[][] = [];
  for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
    chunks.push(texts.slice(i, i + CHUNK_SIZE));
  }

  // 한 조각이 죽어도 나머지 조각의 번역은 살린다
  const settled = await Promise.allSettled(chunks.map(translateChunk));

  const out: Record<string, string> = {};
  for (const result of settled) {
    if (result.status === "fulfilled") Object.assign(out, result.value);
    else console.error("[translateKoToEn] 조각 실패:", result.reason);
  }

  if (Object.keys(out).length === 0) throw new Error("번역 결과가 비었다 — 캐시에 남기지 않는다");
  return out;
}

const cachedTranslateAll = unstable_cache(translateAll, ["tour-api-translate"], {
  revalidate: CACHE_TTL_SECONDS,
  tags: [CACHE_TAG],
});

/**
 * 국문 문자열들을 영문으로. 국문 → 영문 맵을 돌려준다.
 *
 * 키를 contentId 가 아니라 국문 문자열 자체로 잡는다. 캐시 적중률 때문이다 —
 * contentId 를 섞으면 같은 이름도 지역마다 다른 키가 되어 한 번도 재사용되지 않는다.
 * 중복을 지우고 정렬해서 넘기므로, TourAPI 가 순서를 바꿔 돌려줘도 같은 키로 떨어진다.
 *
 * 문자열 하나씩 캐싱하지 않는다. 그러면 캐시가 빈 항목마다 호출이 한 번씩 생겨
 * 20건짜리 목록이 20회가 된다 — 하루 예산이 한 번에 사라진다.
 * 목록 단위로 캐싱하면 적중이면 0회, 아니면 1회다.
 *
 * throw 하지 않는다. 실패·시한 초과하면 빈 맵이고 호출부가 국문 원문을 그대로 쓴다.
 */
export async function translateKoToEn(texts: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(texts.map((t) => t.trim()).filter((t) => t !== ""))].sort();
  if (unique.length === 0) return {};

  try {
    return await cachedTranslateAll(unique);
  } catch (e) {
    console.error("[translateKoToEn] 번역 실패 — 국문 원문을 그대로 쓴다:", e);
    return {};
  }
}
