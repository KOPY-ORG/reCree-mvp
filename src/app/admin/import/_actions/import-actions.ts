"use server";

import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function detectPlatform(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "YOUTUBE";
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) return "X";
    if (hostname.includes("instagram.com")) return "INSTAGRAM";
    if (hostname.includes("pinterest.com") || hostname.includes("pin.it")) return "PINTEREST";
    if (
      hostname.includes("naver.com") ||
      hostname.includes("tistory.com") ||
      hostname.includes("velog.io") ||
      hostname.includes("brunch.co.kr")
    ) return "BLOG";
    return "OTHER";
  } catch {
    return null;
  }
}

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export type SheetRow = {
  rowId: string;          // 중복 체크용 식별자 (google_maps_link 기반)
  placeName: string;
  title: string;
  googleMapsLink: string;
  category: string;
  genre: string;
  artistWork: string;
  subDetail: string;
  tagGroup: string;
  tags: string;
  context: string;
  vibe: string;
  mustTry: string;
  tip: string;
  memo: string;
  story: string;
  sourceUrl: string;
  sourceType: string;
  sourceNote: string;
  referenceUrl: string;
  sourcePostDate: string;
  closeOrNot: string;
  gettingThere: string;
  bannerImages: string;           // 원본 문자열 (importNote 저장용)
  recreeshotOriginalImage: string;
  collectedBy: string;
  collectedAt: string;
  status: string;
  reviewStatus: string;
  isExistingPlace: boolean;       // DB에 동일 googleMapsUrl의 Place가 존재하는지
  existingPlaceId: string | null; // 기존 Place ID (재사용용)
  isAlreadyImported: boolean;     // 이 행의 sourceUrl로 이미 Post가 임포트됐는지
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

// ─── 이미 임포트된 Post sourceUrl 집합 조회 ──────────────────────────────────────

async function getImportedSourceUrls(): Promise<Set<string>> {
  const postSources = await prisma.postSource.findMany({
    where: { url: { not: "" } },
    select: { url: true },
  });
  const urls = new Set<string>();
  postSources.forEach((p) => { if (p.url) urls.add(p.url); });
  return urls;
}

// ─── 기존 Place googleMapsUrl → id 맵 조회 ────────────────────────────────────

async function getExistingPlaces(): Promise<Map<string, string>> {
  const places = await prisma.place.findMany({
    where: { googleMapsUrl: { not: null } },
    select: { id: true, googleMapsUrl: true },
  });
  return new Map(
    places
      .filter((p) => p.googleMapsUrl)
      .map((p) => [p.googleMapsUrl!, p.id])
  );
}

// ─── 시트 미리보기 ─────────────────────────────────────────────────────────────

export async function fetchSheetPreview(): Promise<{
  rows: SheetRow[];
  errors: string[];
}> {
  const errors: string[] = [];

  let rawRows: RawRow[];
  try {
    rawRows = await fetchSheetCsv();
  } catch (e) {
    return {
      rows: [],
      errors: [e instanceof Error ? e.message : "시트를 가져오는 데 실패했습니다."],
    };
  }

  // status=완료 AND review_status=채택 필터
  const filtered = rawRows.filter((r) => {
    const status = (r["status"] ?? "").trim();
    const review = (r["review_status"] ?? "").trim();
    return status === "완료" && review === "채택";
  });

  const [existingPlaces, importedSourceUrls] = await Promise.all([
    getExistingPlaces(),
    getImportedSourceUrls(),
  ]);

  const rows: SheetRow[] = [];

  filtered.forEach((r, idx) => {
    const googleMapsLink = (r["google_maps_link"] ?? "").trim();
    const placeName = (r["place_name"] ?? "").trim();

    // 필수 필드 검증
    if (!placeName) {
      errors.push(`행 ${idx + 2}: place_name 누락`);
    }

    const existingPlaceId = googleMapsLink
      ? (existingPlaces.get(googleMapsLink) ?? null)
      : null;
    const isExistingPlace = existingPlaceId !== null;

    const srcUrl = (r["source_url"] ?? "").trim();
    const isAlreadyImported = !!srcUrl && importedSourceUrls.has(srcUrl);

    rows.push({
      rowId: googleMapsLink ? `${googleMapsLink}::${idx}` : `row-${idx}`,
      placeName,
      title: (r["title"] ?? "").trim(),
      googleMapsLink,
      category: (r["category"] ?? "").trim(),
      genre: (r["genre"] ?? "").trim(),
      artistWork: (r["artist_work"] ?? "").trim(),
      subDetail: (r["sub_detail"] ?? "").trim(),
      tagGroup: (r["tag_group"] ?? "").trim(),
      tags: (r["tags"] ?? "").trim(),
      context: (r["context"] ?? "").trim(),
      vibe: (r["vibe"] ?? "").trim(),
      mustTry: (r["must_try"] ?? "").trim(),
      tip: (r["tip"] ?? "").trim(),
      memo: (r["memo"] ?? "").trim(),
      story: (r["story"] ?? "").trim(),
      sourceUrl: (r["source_url"] ?? "").trim(),
      sourceType: (r["source_type"] ?? "").trim(),
      sourceNote: (r["source_note"] ?? "").trim(),
      referenceUrl: (r["reference_url"] ?? "").trim(),
      sourcePostDate: (r["source_post_date"] ?? "").trim(),
      closeOrNot: (r["close_or_not"] ?? "").trim(),
      gettingThere: (r["getting_there"] ?? "").trim(),
      bannerImages: (r["banner_image"] ?? "").trim(),
      recreeshotOriginalImage: (r["recreeshot_original_image"] ?? "").trim(),
      collectedBy: (r["collected_by"] ?? "").trim(),
      collectedAt: (r["collected_at"] ?? "").trim(),
      status: (r["status"] ?? "").trim(),
      reviewStatus: (r["review_status"] ?? "").trim(),
      isExistingPlace,
      existingPlaceId,
      isAlreadyImported,
    });
  });

  return { rows, errors };
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

async function searchPlaceInfo(
  placeName: string,
  mapsUrl: string,
): Promise<PlacesApiResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  // 1순위: 시트의 place_name (수동 입력, 신뢰도 높음)
  // 2순위: URL에서 추출한 이름 (full URL일 때만 가능, 단축 URL은 매칭 안됨)
  let textQuery = placeName;
  if (!textQuery) {
    const placeMatch = mapsUrl.match(/place\/([^/]+)/);
    if (placeMatch) {
      textQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
    }
  }
  if (!textQuery) return null;

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
    if (!res.ok) {
      console.error(`Places API 오류 (${lang}):`, res.status, await res.text());
      return null;
    }
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

  // fetchSheetPreview와 동일한 필터 적용 후 rowId(url::idx)로 매칭
  const qualified = rawRows.filter((r) => {
    const status = (r["status"] ?? "").trim();
    const review = (r["review_status"] ?? "").trim();
    return status === "완료" && review === "채택";
  });

  const filtered = qualified.filter((r, idx) => {
    const googleMapsLink = (r["google_maps_link"] ?? "").trim();
    const rowId = googleMapsLink ? `${googleMapsLink}::${idx}` : `row-${idx}`;
    return rowIds.includes(rowId);
  });

  // source_type 매핑 테이블
  const srcTypeMap: Record<string, string> = {
    instagram: "INSTAGRAM",
    youtube: "YOUTUBE",
    tiktok: "TIKTOK",
    x: "X",
    article: "BLOG",
    blog: "BLOG",
    news: "NEWS",
  };

  for (const r of filtered) {
    const googleMapsLink = (r["google_maps_link"] ?? "").trim();
    const placeName = (r["place_name"] ?? "").trim();
    const title = (r["title"] ?? "").trim();

    try {
      // 기존 Place 선조회 (트랜잭션 밖에서 한 번만)
      const existingPlaceRecord = googleMapsLink
        ? await prisma.place.findFirst({ where: { googleMapsUrl: googleMapsLink } })
        : null;

      // 기존 Place가 있으면 Places API 호출 불필요
      const placeInfo = existingPlaceRecord
        ? null
        : await searchPlaceInfo(placeName, googleMapsLink);

      // slug 생성: 영문 장소명 + 랜덤 6자
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

      // vibe 배열 파싱 (쉼표, 중국식 쉼표, / 구분자 지원)
      const vibeRaw = (r["vibe"] ?? "").trim();
      const vibeArr = vibeRaw
        ? vibeRaw.split(/[,，/]/).map((v) => v.trim()).filter(Boolean)
        : [];

      // placeTypes 파싱 (map_pin_icon)
      const mapPinIconRaw = (r["map_pin_icon"] ?? "").trim();
      const placeTypes = mapPinIconRaw
        ? mapPinIconRaw.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
        : [];

      // close_or_not → PlaceStatus
      const closeOrNotRaw = (r["close_or_not"] ?? "").trim();
      const placeStatus = closeOrNotRaw === "폐업" ? "CLOSED_PERMANENT" : "OPEN";

      // source_type 매핑
      const srcTypeRaw = (r["source_type"] ?? "").trim().toLowerCase();
      const mappedSrcType = srcTypeMap[srcTypeRaw] ?? (srcTypeRaw ? "OTHER" : null);

      // banner_images 파싱 (쉼표 또는 줄바꿈 구분자)
      const bannerImagesRaw = (r["banner_image"] ?? "").trim();
      const bannerImages = bannerImagesRaw
        ? bannerImagesRaw.split(/[,\n]/).map((u) => u.trim()).filter(Boolean)
        : [];

      // importNote: 원본 보존 목적
      const importNote = JSON.stringify({
        category: (r["category"] ?? "").trim(),
        genre: (r["genre"] ?? "").trim(),
        artist_work: (r["artist_work"] ?? "").trim(),
        sub_detail: (r["sub_detail"] ?? "").trim(),
        tag_group: (r["tag_group"] ?? "").trim(),
        tags: (r["tags"] ?? "").trim(),
        map_pin_icon: mapPinIconRaw,
        banner_images: bannerImages,
        original_image: (r["recreeshot_original_image"] ?? "").trim(),
        collected_by: (r["collected_by"] ?? "").trim(),
        collected_at: (r["collected_at"] ?? "").trim(),
      });

      const collectedBy = (r["collected_by"] ?? "").trim() || null;
      const collectedAt = (r["collected_at"] ?? "").trim() || null;
      const srcUrl = (r["source_url"] ?? "").trim() || null;
      const srcNote = (r["source_note"] ?? "").trim() || null;
      const storyVal = (r["story"] ?? "").trim() || null;
      const memoVal = (r["memo"] ?? "").trim() || null;
      const referenceUrlVal = (r["reference_url"] ?? "").trim() || null;
      const sourcePostDateVal = (r["source_post_date"] ?? "").trim() || null;

      await prisma.$transaction(async (tx) => {
        let placeId: string;

        if (existingPlaceRecord) {
          // 기존 Place 재사용
          placeId = existingPlaceRecord.id;
        } else {
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
              gettingThere: (r["getting_there"] ?? "").trim() || null,
              placeTypes,
              status: placeStatus,
              source: "ADMIN",
              isVerified: false,
            },
          });
          placeId = place.id;
        }

        const post = await tx.post.create({
          data: {
            titleKo: title || `[임시] ${existingPlaceRecord?.nameKo ?? placeInfo?.nameKo ?? placeName}`,
            titleEn: "",
            slug,
            bodyKo: storyVal,
            memo: memoVal,
            status: "DRAFT",
            collectedBy,
            collectedAt,
            importNote,
            ...((srcUrl || referenceUrlVal) && {
              postSources: {
                create: [
                  ...(srcUrl ? [{
                    url: srcUrl,
                    sourceType: (mappedSrcType === "REFERENCE" ? "REFERENCE" : "PRIMARY") as "PRIMARY" | "REFERENCE",
                    platform: detectPlatform(srcUrl),
                    isOriginalLink: false,
                    sourceNote: srcNote,
                    sourcePostDate: sourcePostDateVal,
                    sortOrder: 0,
                  }] : []),
                  ...(referenceUrlVal ? [{
                    url: referenceUrlVal,
                    sourceType: "REFERENCE" as "REFERENCE",
                    platform: detectPlatform(referenceUrlVal),
                    isOriginalLink: false,
                    sourceNote: null,
                    sourcePostDate: null,
                    sortOrder: srcUrl ? 1 : 0,
                  }] : []),
                ],
              },
            }),
          },
        });

        await tx.postPlace.create({
          data: {
            postId: post.id,
            placeId,
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
