"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: "gemini-2.5-flash",
  });
}

// ─── 단일 AI 초안 생성 ──────────────────────────────────────────────────────────

export async function generateAIDraft(
  postId: string,
): Promise<{ error?: string }> {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        postPlaces: {
          include: { place: true },
        },
      },
    });

    if (!post) return { error: "포스트를 찾을 수 없습니다." };
    if (post.status !== "IMPORTED")
      return { error: "IMPORTED 상태인 포스트만 AI 초안을 생성할 수 있습니다." };

    const postPlace = post.postPlaces[0];
    const place = postPlace?.place;

    // importNote 파싱
    let importNote: Record<string, string> = {};
    try {
      if (post.importNote) importNote = JSON.parse(post.importNote);
    } catch {
      // 파싱 실패 시 빈 객체 유지
    }

    const operatingHoursText = place?.operatingHours
      ? Array.isArray(place.operatingHours)
        ? (place.operatingHours as string[]).join("\n")
        : JSON.stringify(place.operatingHours)
      : "정보 없음";

    const prompt = `You are a content writer for reCree, a travel guide platform for international K-culture (K-POP, K-Drama) fans.
Based on the information below, write an engaging content draft that makes international fans want to visit this place.

## Place Info
- Name (Korean): ${place?.nameKo ?? "Unknown"}
- Name (English): ${place?.nameEn ?? ""}
- Address: ${place?.addressKo ?? place?.addressEn ?? "N/A"}
- Operating Hours: ${operatingHoursText}
- Phone: ${place?.phone ?? "N/A"}
- Google Maps Rating: ${place?.rating ?? "N/A"}

## Collected Info
- Category: ${importNote.category ?? ""}
- Artist / Work: ${importNote.artist_work ?? ""}
- Context notes: ${postPlace?.context ?? ""}
- Vibe notes: ${Array.isArray(postPlace?.vibe) ? postPlace.vibe.join(", ") : ""}
- Must-try notes: ${postPlace?.mustTry ?? ""}
- Tip notes: ${postPlace?.tip ?? ""}
- Source note: ${post.sourceNote ?? ""}
- Existing title (reference): ${post.titleKo ?? ""}

## Field Guidelines

### Titles & Subtitles
- titleKo: Max 30 chars. Hook K-culture fans. Include artist/work name if relevant. (Korean)
- titleEn: Max 60 chars. Natural English translation/adaptation of titleKo.
- subtitleKo: Max 20 chars. One-line core appeal of the place. (Korean)
- subtitleEn: Max 40 chars. Natural English translation of subtitleKo.

### Spot Insight (shown as a visual summary card alongside an image — keep it SHORT & scannable)
- contextKo: Max 80 chars. Why this place is special for K-culture fans. (Korean)
- contextEn: Max 120 chars. English version of contextKo.
- vibes: 1–3 single words capturing the atmosphere. (English preferred, e.g. "Local", "Cozy", "Iconic")
- mustTryKo: Max 40 chars. The one thing to try here. (Korean)
- mustTryEn: Max 60 chars. English version of mustTryKo.
- tipKo: Max 40 chars. One practical visit tip. (Korean)
- tipEn: Max 60 chars. English version of tipKo.

### Story (longer narrative body — 2~3 sentences each)
- storyKo: 100–200 chars. Story about why this place matters to K-culture fans. Written warmly for Korean readers.
- storyEn: 150–300 chars. English version of storyKo. Natural, engaging tone for international fans.

Return ONLY valid JSON with no other text:
{
  "titleKo": "...",
  "titleEn": "...",
  "subtitleKo": "...",
  "subtitleEn": "...",
  "contextKo": "...",
  "contextEn": "...",
  "vibes": ["..."],
  "mustTryKo": "...",
  "mustTryEn": "...",
  "tipKo": "...",
  "tipEn": "...",
  "storyKo": "...",
  "storyEn": "..."
}`;

    const model = getGemini();
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // JSON 추출 (마크다운 코드블록 처리)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Gemini 응답:", text);
      return { error: "AI 응답을 파싱할 수 없습니다." };
    }

    const draft = JSON.parse(jsonMatch[0]) as {
      titleKo?: string;
      titleEn?: string;
      subtitleKo?: string;
      subtitleEn?: string;
      contextKo?: string;
      contextEn?: string;
      vibes?: string[];
      mustTryKo?: string;
      mustTryEn?: string;
      tipKo?: string;
      tipEn?: string;
      storyKo?: string;
      storyEn?: string;
    };

    await prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: postId },
        data: {
          titleKo: draft.titleKo ?? post.titleKo,
          titleEn: draft.titleEn ?? post.titleEn,
          subtitleKo: draft.subtitleKo ?? post.subtitleKo,
          subtitleEn: draft.subtitleEn ?? post.subtitleEn,
          bodyKo: draft.storyKo ?? post.bodyKo,
          bodyEn: draft.storyEn ?? post.bodyEn,
          status: "AI_DRAFTED",
        },
      });

      if (postPlace) {
        await tx.postPlace.update({
          where: { postId_placeId: { postId, placeId: postPlace.placeId } },
          data: {
            context: draft.contextKo ?? postPlace.context,
            vibe: draft.vibes ?? postPlace.vibe,
            mustTry: draft.mustTryKo ?? postPlace.mustTry,
            tip: draft.tipKo ?? postPlace.tip,
            insightEn: {
              context: draft.contextEn ?? "",
              mustTry: draft.mustTryEn ?? "",
              tip: draft.tipEn ?? "",
            },
          },
        });
      }
    });

    revalidatePath("/admin/posts");
    return {};
  } catch (e) {
    console.error("AI 초안 생성 오류:", e);
    return {
      error: e instanceof Error ? e.message : "AI 초안 생성 중 오류가 발생했습니다.",
    };
  }
}

// ─── 필드 번역 (KO → EN) ────────────────────────────────────────────────────────

export async function translateFields(
  fields: Record<string, string>,
): Promise<{ data?: Record<string, string>; error?: string }> {
  try {
    const model = getGemini();
    const fieldList = Object.entries(fields)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `"${k}": ${JSON.stringify(v)}`)
      .join("\n");

    if (!fieldList) return { data: {} };

    const prompt = `You are a professional Korean-to-English translator for K-culture content.
Translate each field from Korean to natural English. Preserve markdown formatting if present.
Return ONLY a valid JSON object with the same keys.

Fields to translate:
${fieldList}`;

    const result = await model.generateContent(prompt);
    const text = result.response
      .text()
      .trim()
      .replace(/^```json\n?/, "")
      .replace(/\n?```$/, "");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { error: "번역 응답을 파싱할 수 없습니다." };

    const data = JSON.parse(jsonMatch[0]) as Record<string, string>;
    return { data };
  } catch (e) {
    console.error("번역 오류:", e);
    return {
      error: e instanceof Error ? e.message : "번역 중 오류가 발생했습니다.",
    };
  }
}

// ─── 일괄 AI 초안 생성 ──────────────────────────────────────────────────────────

export async function generateAIDraftsBulk(postIds: string[]): Promise<{
  success: number;
  errors: { id: string; error: string }[];
}> {
  let success = 0;
  const errors: { id: string; error: string }[] = [];

  for (const id of postIds) {
    const result = await generateAIDraft(id);
    if (result.error) {
      errors.push({ id, error: result.error });
    } else {
      success++;
    }
    // API 속도 제한 방지
    await new Promise((r) => setTimeout(r, 500));
  }

  revalidatePath("/admin/posts");
  return { success, errors };
}
