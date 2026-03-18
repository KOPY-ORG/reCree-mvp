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

export async function calculateMatchScore(
  referenceUrl: string,
  recreationUrl: string
): Promise<number> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const [refData, recData] = await Promise.all([
    urlToInlineData(referenceUrl),
    urlToInlineData(recreationUrl),
  ]);

  const result = await model.generateContent([
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
  ]);

  const text = result.response.text().trim();
  const match = text.match(/\{"score"\s*:\s*(\d+(?:\.\d+)?)\}/)
    ?? text.match(/"score"\s*:\s*(\d+(?:\.\d+)?)/);
  if (!match?.[1]) return 0;
  return Math.min(100, Math.max(0, parseFloat(match[1])));
}
