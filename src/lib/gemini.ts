import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function urlToInlineData(url: string): Promise<{
  inlineData: { data: string; mimeType: string };
}> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  return { inlineData: { data: base64, mimeType } };
}

/**
 * 503(과부하) 재시도: 최대 3회, 지수 백오프. 503 외 에러는 즉시 전파한다.
 *
 * calculateMatchScore 안에 있던 것을 그대로 꺼냈다. TourAPI 국문 보강의 일괄 번역이
 * 같은 과부하를 맞는데, 거기서는 한 건이 아니라 목록 전체의 영문이 한꺼번에 날아간다.
 * 같은 정책을 두 벌 쓰지 않으려고 함수로 뺐다.
 */
export async function retryOn503<T>(call: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
    try {
      return await call();
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("503")) throw e; // 503 외 에러는 즉시 전파
    }
  }
  throw lastError;
}

export async function calculateMatchScore(
  referenceUrl: string,
  recreationUrl: string
): Promise<number> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const [refData, recData] = await Promise.all([
    urlToInlineData(referenceUrl),
    urlToInlineData(recreationUrl),
  ]);

  const prompt = [
    {
      text: `두 사진의 장면 재현 유사도를 0-100으로 평가해줘.
Photo 1: 원본 참조 사진 (연예인/드라마 장면)
Photo 2: 사용자 재현 사진
평가 기준: 배경/장소(50%), 포즈/구도(35%), 조명/분위기(10%), 전체 구성(5%)
중요: 이 사진은 일반인 팬이 최선을 다해 재현한 것이므로, 조명·분위기·카메라 품질 차이는 크게 감점하지 말 것. 장소와 포즈가 비슷하면 후하게 평가할 것.
JSON만 반환: {"score": <number>}`,
    },
    refData,
    recData,
  ];

  const text = await retryOn503(async () => {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  });

  const match =
    text.match(/\{"score"\s*:\s*(\d+(?:\.\d+)?)\}/) ??
    text.match(/"score"\s*:\s*(\d+(?:\.\d+)?)/);
  if (!match?.[1]) return 0;
  return Math.min(100, Math.max(0, parseFloat(match[1])));
}
