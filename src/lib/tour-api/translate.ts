// ─── 국문 → 영문 일괄 번역 ────────────────────────────────────────────────────
// queries.ts 의 국문 보강 경로만 쓴다. TourAPI 영문 응답이 비어 있을 때,
// 국문으로 받은 제목·주소를 화면에 올릴 수 있게 만든다.
//
// 파일을 따로 둔 이유는 나중에 이 함수 하나만 캐싱으로 감싸기 위해서다.
// 이번에는 캐시를 붙이지 않는다. (TourAPI 응답 자체의 캐시 금지와는 별개다 —
// 번역 결과는 TourAPI 응답이 아니라 그것을 재료로 만든 파생물이다)

import { GoogleGenerativeAI } from "@google/generative-ai";
import { retryOn503 } from "@/lib/gemini";

/** draft-actions.ts 의 AI 초안·번역과 같은 모델을 쓴다 */
const MODEL = "gemini-2.5-flash";

/**
 * 한 번에 보낼 최대 항목 수.
 *
 * 요점은 건당 호출을 만들지 않는 것이다 — 20건짜리 목록은 제목+주소로 40개가 되어도
 * 이 크기 안에 들어가 호출 1회로 끝난다. 축제처럼 수백 건이 올 때만 잘리고,
 * 잘린 조각은 순차가 아니라 병렬로 나간다.
 */
const CHUNK_SIZE = 60;

function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL,
    // 번역은 매번 같은 답이 나와야 한다. 응답 형식도 모델에게 강제해 파싱 실패를 줄인다
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });
}

/**
 * 조각 하나를 번역한다. 요청한 키 중 문자열로 돌아온 것만 남긴다 —
 * 모델이 키를 빠뜨리거나 지어내도 호출부가 국문 원문으로 버틴다.
 */
async function translateChunk(entries: [string, string][]): Promise<Record<string, string>> {
  const model = getGemini();
  const fieldList = entries.map(([k, v]) => `"${k}": ${JSON.stringify(v)}`).join("\n");

  const prompt = `You are a professional Korean-to-English translator for Korean tourism content.
Translate each value from Korean to natural English.
- Place, festival and venue names: use the official English name if one exists, otherwise romanize it.
- Addresses: romanize in Korean road-address order (building number, road, district, city).
- Keep each translation short. Do not add explanations, notes, or parentheses that were not in the source.
Return ONLY a valid JSON object with exactly the same keys.

Values to translate:
${fieldList}`;

  const text = await retryOn503(async () => {
    const result = await model.generateContent(prompt);
    return result.response
      .text()
      .trim()
      .replace(/^```json\n?/, "")
      .replace(/\n?```$/, "");
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return {};

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [key] of entries) {
    const value = parsed[key];
    if (typeof value === "string" && value.trim() !== "") out[key] = value.trim();
  }
  return out;
}

/**
 * 키-값 맵을 통째로 번역해 같은 키로 돌려준다 (draft-actions.ts 의 translateFields 와 같은 왕복).
 * 배열 인덱스로 짝을 맞추지 않는다 — 모델이 순서를 바꾸거나 한 건을 빠뜨려도 어긋나지 않는다.
 *
 * throw 하지 않는다. 실패한 키는 결과에서 빠지고 호출부가 국문 원문을 그대로 쓴다.
 * 목록에 한글이 보이는 편이 섹션이 통째로 죽는 것보다 낫다.
 */
export async function translateKoToEn(
  values: Record<string, string>
): Promise<Record<string, string>> {
  const entries = Object.entries(values).filter(([, v]) => v.trim() !== "");
  if (entries.length === 0) return {};

  const chunks: [string, string][][] = [];
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    chunks.push(entries.slice(i, i + CHUNK_SIZE));
  }

  // 한 조각이 죽어도 나머지 조각의 번역은 살린다
  const settled = await Promise.allSettled(chunks.map(translateChunk));

  const out: Record<string, string> = {};
  for (const result of settled) {
    if (result.status === "fulfilled") Object.assign(out, result.value);
    else console.error("[translateKoToEn] 번역 실패 — 국문 원문을 그대로 쓴다:", result.reason);
  }
  return out;
}
