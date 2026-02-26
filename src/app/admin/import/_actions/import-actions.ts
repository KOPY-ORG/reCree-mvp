"use server";

import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export type SheetRow = {
  rowId: string;          // 중복 체크용 식별자 (google_maps_link 기반)
  placeName: string;
  title: string;
  subTitle: string;
  googleMapsLink: string;
  sourceUrl: string;
  sourceType: string;
  sourceNote: string;
  category: string;
  artistWork: string;
  context: string;
  vibe: string;
  mustTry: string;
  tip: string;
  collectedBy: string;
  collectedAt: string;
  status: string;
  reviewStatus: string;
  isDuplicate: boolean;
};

type RawRow = Record<string, string>;

// ─── 시트 CSV 파싱 ──────────────────────────────────────────────────────────────

async function fetchSheetCsv(): Promise<RawRow[]> {
  const id = process.env.GOOGLE_SHEETS_ID;
  const gid = process.env.GOOGLE_SHEETS_GID ?? "0";

  if (!id) throw new Error("GOOGLE_SHEETS_ID 환경변수가 설정되지 않았습니다.");

  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `시트를 가져오는 데 실패했습니다. (${res.status} ${res.statusText})\n` +
      "시트가 '링크 공유 - 뷰어' 이상으로 설정되어 있는지 확인해 주세요."
    );
  }

  const csv = await res.text();

  // 시트 1행은 카테고리 그룹 행(관리·검토, 장소, 토픽...)이므로 제거하고
  // 2행을 실제 헤더로 사용
  const lines = csv.split("\n");
  const csvWithoutGroupRow = lines.slice(1).join("\n");

  const result = Papa.parse<RawRow>(csvWithoutGroupRow, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) =>
      h.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
  });

  return result.data;
}

// ─── 중복 google_maps_link 조회 ────────────────────────────────────────────────

async function getExistingUrls(): Promise<Set<string>> {
  const posts = await prisma.post.findMany({
    where: { sourceUrl: { not: null } },
    select: { sourceUrl: true },
  });
  const places = await prisma.place.findMany({
    where: { googleMapsUrl: { not: null } },
    select: { googleMapsUrl: true },
  });
  const urls = new Set<string>();
  posts.forEach((p) => { if (p.sourceUrl) urls.add(p.sourceUrl); });
  places.forEach((p) => { if (p.googleMapsUrl) urls.add(p.googleMapsUrl); });
  return urls;
}

// ─── 시트 미리보기 ─────────────────────────────────────────────────────────────

export async function fetchSheetPreview(): Promise<{
  rows: SheetRow[];
  errors: string[];
  duplicates: string[];
}> {
  const errors: string[] = [];
  const duplicates: string[] = [];

  let rawRows: RawRow[];
  try {
    rawRows = await fetchSheetCsv();
  } catch (e) {
    return {
      rows: [],
      errors: [e instanceof Error ? e.message : "시트를 가져오는 데 실패했습니다."],
      duplicates: [],
    };
  }

  // status=완료 AND review_status=채택 필터
  const filtered = rawRows.filter((r) => {
    const status = (r["status"] ?? "").trim();
    const review = (r["review_status"] ?? "").trim();
    return status === "완료" && review === "채택";
  });

  const existingUrls = await getExistingUrls();

  const rows: SheetRow[] = [];

  filtered.forEach((r, idx) => {
    const googleMapsLink = (r["google_maps_link"] ?? "").trim();
    const placeName = (r["place_name"] ?? "").trim();

    // 필수 필드 검증
    if (!placeName) {
      errors.push(`행 ${idx + 2}: place_name 누락`);
    }

    const isDuplicate = !!googleMapsLink && existingUrls.has(googleMapsLink);
    if (isDuplicate) {
      duplicates.push(googleMapsLink);
    }

    rows.push({
      rowId: googleMapsLink || `row-${idx}`,
      placeName,
      title: (r["title"] ?? "").trim(),
      subTitle: (r["sub_title"] ?? "").trim(),
      googleMapsLink,
      sourceUrl: (r["source_url"] ?? "").trim(),
      sourceType: (r["source_type"] ?? "").trim(),
      sourceNote: (r["source_note"] ?? "").trim(),
      category: (r["category"] ?? "").trim(),
      artistWork: (r["artist_work"] ?? "").trim(),
      context: (r["context"] ?? "").trim(),
      vibe: (r["vibe"] ?? "").trim(),
      mustTry: (r["must_try"] ?? "").trim(),
      tip: (r["tip"] ?? "").trim(),
      collectedBy: (r["collected_by"] ?? "").trim(),
      collectedAt: (r["collected_at"] ?? "").trim(),
      status: (r["status"] ?? "").trim(),
      reviewStatus: (r["review_status"] ?? "").trim(),
      isDuplicate,
    });
  });

  return { rows, errors, duplicates };
}

// ─── Places API 호출 ───────────────────────────────────────────────────────────

type PlacesApiResult = {
  googlePlaceId: string;
  nameEn: string;
  nameKo: string;
  addressEn: string;
  addressKo: string;
  lat: number;
  lng: number;
  phone: string;
  operatingHours: unknown;
  rating: number | null;
};

async function searchPlaceByUrl(mapsUrl: string): Promise<PlacesApiResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  // URL에서 장소명 추출 시도 (place/ 세그먼트)
  let textQuery = mapsUrl;
  const placeMatch = mapsUrl.match(/place\/([^/]+)/);
  if (placeMatch) {
    textQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
  }

  const fetchDetails = async (lang: string) => {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.location,places.internationalPhoneNumber,places.regularOpeningHours,places.rating",
          "Accept-Language": lang,
        },
        body: JSON.stringify({ textQuery, languageCode: lang }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.places?.[0] ?? null;
  };

  const [enPlace, koPlace] = await Promise.all([
    fetchDetails("en"),
    fetchDetails("ko"),
  ]);

  const place = enPlace ?? koPlace;
  if (!place) return null;

  return {
    googlePlaceId: place.id ?? "",
    nameEn: enPlace?.displayName?.text ?? "",
    nameKo: koPlace?.displayName?.text ?? enPlace?.displayName?.text ?? "",
    addressEn: enPlace?.formattedAddress ?? "",
    addressKo: koPlace?.formattedAddress ?? enPlace?.formattedAddress ?? "",
    lat: place.location?.latitude ?? 0,
    lng: place.location?.longitude ?? 0,
    phone: place.internationalPhoneNumber ?? "",
    operatingHours: place.regularOpeningHours?.weekdayDescriptions ?? null,
    rating: place.rating ?? null,
  };
}

// ─── 행 임포트 ─────────────────────────────────────────────────────────────────

export async function importSheetRows(rowIds: string[]): Promise<{
  imported: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let imported = 0;

  // 선택된 rowId에 해당하는 행을 시트에서 다시 조회
  let rawRows: RawRow[];
  try {
    rawRows = await fetchSheetCsv();
  } catch (e) {
    return {
      imported: 0,
      errors: [e instanceof Error ? e.message : "시트를 가져오는 데 실패했습니다."],
    };
  }

  const filtered = rawRows.filter((r) => {
    const googleMapsLink = (r["google_maps_link"] ?? "").trim();
    return rowIds.includes(googleMapsLink);
  });

  for (const r of filtered) {
    const googleMapsLink = (r["google_maps_link"] ?? "").trim();
    const placeName = (r["place_name"] ?? "").trim();
    const title = (r["title"] ?? "").trim();

    try {
      // Places API 호출
      const placeInfo = await searchPlaceByUrl(googleMapsLink);

      // slug 생성: 영문 장소명 + nanoid 스타일 랜덤 6자
      const baseName = placeInfo?.nameEn
        ? placeInfo.nameEn
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .trim()
            .replace(/\s+/g, "-")
        : placeName
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .trim()
            .replace(/\s+/g, "-") || "place";

      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const slug = `${baseName}-${randomSuffix}`;

      // vibe 배열 파싱
      const vibeRaw = (r["vibe"] ?? "").trim();
      const vibeArr = vibeRaw
        ? vibeRaw.split(/[,，、]/).map((v) => v.trim()).filter(Boolean)
        : [];

      // importNote: 전용 필드 없는 컬럼들
      const importNote = JSON.stringify({
        category: (r["category"] ?? "").trim(),
        artist_work: (r["artist_work"] ?? "").trim(),
        collected_by: (r["collected_by"] ?? "").trim(),
        collected_at: (r["collected_at"] ?? "").trim(),
      });

      await prisma.$transaction(async (tx) => {
        const place = await tx.place.create({
          data: {
            nameKo: placeInfo?.nameKo || placeName || "미상",
            nameEn: placeInfo?.nameEn || null,
            addressKo: placeInfo?.addressKo || null,
            addressEn: placeInfo?.addressEn || null,
            latitude: placeInfo?.lat || null,
            longitude: placeInfo?.lng || null,
            googlePlaceId: placeInfo?.googlePlaceId || null,
            googleMapsUrl: googleMapsLink || null,
            phone: placeInfo?.phone || null,
            operatingHours: placeInfo?.operatingHours
              ? (placeInfo.operatingHours as object)
              : undefined,
            rating: placeInfo?.rating ?? null,
            status: "OPEN",
            source: "ADMIN",
            isVerified: false,
          },
        });

        const post = await tx.post.create({
          data: {
            titleKo: title || `[임시] ${place.nameKo}`,
            titleEn: "",
            slug,
            subtitleKo: (r["sub_title"] ?? "").trim() || null,
            status: "IMPORTED",
            sourceUrl: (r["source_url"] ?? "").trim() || googleMapsLink || null,
            sourceType: (r["source_type"] ?? "").trim() || null,
            sourceNote: (r["source_note"] ?? "").trim() || null,
            importNote,
          },
        });

        await tx.postPlace.create({
          data: {
            postId: post.id,
            placeId: place.id,
            context: (r["context"] ?? "").trim() || null,
            vibe: vibeArr,
            mustTry: (r["must_try"] ?? "").trim() || null,
            tip: (r["tip"] ?? "").trim() || null,
          },
        });
      });

      imported++;
    } catch (e) {
      console.error(`임포트 실패 (${placeName}):`, e);
      errors.push(
        `${placeName || googleMapsLink}: ${e instanceof Error ? e.message : "알 수 없는 오류"}`
      );
    }
  }

  revalidatePath("/admin/posts");
  revalidatePath("/admin/import");

  return { imported, errors };
}
