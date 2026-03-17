"use server";

import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { expandGoogleMapsShortUrl, resolveGoogleMapsUrl } from "@/lib/google-maps-url";

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
  rowId: string;
  placeName: string;
  title: string;
  googleMapsLink: string;
  streetViewUrl: string;
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
  bannerImages: string;
  recreeshotOriginalImage: string;
  collectedBy: string;
  collectedAt: string;
  status: string;
  reviewStatus: string;
  isExistingPlace: boolean;
  existingPlaceId: string | null;
  isAlreadyImported: boolean;
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

// ─── 이미 임포트된 (placeId, sourceUrl) 쌍 집합 조회 ─────────────────────────────

async function getImportedPostKeys(): Promise<Set<string>> {
  const posts = await prisma.post.findMany({
    select: {
      postSources: { select: { url: true } },
      postPlaces: { select: { placeId: true } },
    },
  });
  const keys = new Set<string>();
  for (const post of posts) {
    const placeId = post.postPlaces[0]?.placeId;
    if (!placeId) continue;
    for (const { url } of post.postSources) {
      if (url) keys.add(`${placeId}::${url}`);
    }
  }
  return keys;
}

// ─── 기존 Place 조회 ───────────────────────────────────────────────────────────

async function getExistingPlaces(): Promise<{
  byUrl: Map<string, string>;
  byGoogleId: Map<string, string>;
  byStreetViewUrl: Map<string, string>;
}> {
  const places = await prisma.place.findMany({
    where: {
      OR: [
        { googleMapsUrl: { not: null } },
        { googlePlaceId: { not: null } },
        { streetViewUrl: { not: null } },
      ],
    },
    select: { id: true, googleMapsUrl: true, googlePlaceId: true, streetViewUrl: true },
  });
  return {
    byUrl: new Map(places.filter((p) => p.googleMapsUrl).map((p) => [p.googleMapsUrl!, p.id])),
    byGoogleId: new Map(places.filter((p) => p.googlePlaceId).map((p) => [p.googlePlaceId!, p.id])),
    byStreetViewUrl: new Map(places.filter((p) => p.streetViewUrl).map((p) => [p.streetViewUrl!, p.id])),
  };
}

// ─── Google Maps 링크 분석 → @/lib/google-maps-url.ts ────────────────────────
// expandGoogleMapsShortUrl, resolveGoogleMapsUrl 을 공유 lib에서 import

// ─── Street View URL에서 panoid 추출 ───────────────────────────────────────────

function extractPanoid(url: string): string | null {
  try {
    // URL 디코딩 후 panoid= 파라미터 추출
    const decoded = decodeURIComponent(url);
    const match = decoded.match(/panoid=([a-zA-Z0-9_\-]+)/);
    if (match) return match[1];

    // data 파라미터 안의 !1s 값 (스트릿뷰 pano ID)
    const dataMatch = url.match(/!1s([a-zA-Z0-9_\-]{10,})/);
    if (dataMatch) return dataMatch[1];

    return null;
  } catch {
    return null;
  }
}

// ─── panoid로 위경도 조회 (Street View Metadata API) ──────────────────────────

async function getCoordinatesFromPanoid(panoid: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/streetview/metadata?pano=${panoid}&key=${apiKey}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK" || !data.location) return null;
    return { lat: data.location.lat, lng: data.location.lng };
  } catch {
    return null;
  }
}

// ─── Street View URL에서 위경도 추출 ──────────────────────────────────────────

async function resolveCoordsFromStreetViewUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url) return null;

  const workingUrl = await expandGoogleMapsShortUrl(url);

  // panoid → Street View Metadata API
  const panoid = extractPanoid(workingUrl);
  if (panoid) {
    const coords = await getCoordinatesFromPanoid(panoid);
    if (coords) return coords;
  }

  // 직접 URL에 좌표가 있는 경우 fallback
  const atMatch = workingUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

  return null;
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

  const filtered = rawRows.filter((r) => {
    const status = (r["status"] ?? "").trim();
    const review = (r["review_status"] ?? "").trim();
    return status === "완료" && review === "채택";
  });

  const [existingPlaces, importedPostKeys] = await Promise.all([
    getExistingPlaces(),
    getImportedPostKeys(),
  ]);

  const rows: SheetRow[] = [];

  for (let idx = 0; idx < filtered.length; idx++) {
    const r = filtered[idx];
    const googleMapsLinkRaw = (r["google_maps_link"] ?? "").trim();
    // 단축 URL 먼저 확장 → byUrl 매칭 정확도 향상
    const googleMapsLink = await expandGoogleMapsShortUrl(googleMapsLinkRaw);
    const streetViewUrlInSheet = (r["street_view_url"] ?? "").trim();
    const placeName = (r["place_name"] ?? "").trim();

    if (!placeName) {
      errors.push(`행 ${idx + 2}: place_name 누락`);
    }

    // 기존 Place 조회:
    // 1순위: google_maps_link (확장 URL) → byUrl
    // 2순위: street_view_url → byStreetViewUrl (google_maps_link 없는 좌표 전용 장소)
    let existingPlaceId = googleMapsLink
      ? (existingPlaces.byUrl.get(googleMapsLink) ?? null)
      : streetViewUrlInSheet
        ? (existingPlaces.byStreetViewUrl.get(streetViewUrlInSheet) ?? null)
        : null;
    // URL로 못 찾은 경우: 공식 장소 URL이면 Places API로 googlePlaceId 조회 후 byGoogleId 체크
    if (!existingPlaceId && googleMapsLink && googleMapsLink.includes("/place/")) {
      const previewPlaceInfo = await searchPlaceInfo(placeName, googleMapsLink);
      if (previewPlaceInfo?.googlePlaceId) {
        existingPlaceId = existingPlaces.byGoogleId.get(previewPlaceInfo.googlePlaceId) ?? null;
      }
    }
    const isExistingPlace = existingPlaceId !== null;

    const srcUrl = (r["source_url"] ?? "").trim();
    const srcUrls = srcUrl ? srcUrl.split(",").map((u) => u.trim()).filter(Boolean) : [];
    const isAlreadyImported = !!existingPlaceId && srcUrls.some((u) => importedPostKeys.has(`${existingPlaceId}::${u}`));

    rows.push({
      rowId: googleMapsLinkRaw ? `${googleMapsLinkRaw}::${idx}` : streetViewUrlInSheet ? `${streetViewUrlInSheet}::${idx}` : `row-${idx}`,
      placeName,
      title: (r["title"] ?? "").trim(),
      googleMapsLink: googleMapsLinkRaw,
      streetViewUrl: streetViewUrlInSheet,
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
  }

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

  let textQuery = placeName;
  if (!textQuery) {
    const placeMatch = mapsUrl.match(/\/place\/([^/?]+)/);
    if (placeMatch) {
      textQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
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

  let rawRows: RawRow[];
  try {
    rawRows = await fetchSheetCsv();
  } catch (e) {
    return {
      imported: 0,
      errors: [e instanceof Error ? e.message : "시트를 가져오는 데 실패했습니다."],
    };
  }

  const qualified = rawRows.filter((r) => {
    const status = (r["status"] ?? "").trim();
    const review = (r["review_status"] ?? "").trim();
    return status === "완료" && review === "채택";
  });

  const filtered = qualified.filter((r, idx) => {
    const googleMapsLink = (r["google_maps_link"] ?? "").trim();
    const streetViewUrlInSheet = (r["street_view_url"] ?? "").trim();
    const rowId = googleMapsLink
      ? `${googleMapsLink}::${idx}`
      : streetViewUrlInSheet
        ? `${streetViewUrlInSheet}::${idx}`
        : `row-${idx}`;
    return rowIds.includes(rowId);
  });

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
    const googleMapsLinkRaw = (r["google_maps_link"] ?? "").trim();
    // 단축 URL을 먼저 확장해야 DB 조회 매칭이 정확함
    const googleMapsLink = await expandGoogleMapsShortUrl(googleMapsLinkRaw);
    const streetViewUrlFromCol = (r["street_view_url"] ?? "").trim() || null;
    const placeName = (r["place_name"] ?? "").trim();
    const title = (r["title"] ?? "").trim();

    try {
      // 기존 Place 선조회
      let existingPlaceRecord = googleMapsLink
        ? await prisma.place.findFirst({ where: { googleMapsUrl: googleMapsLink } })
        : null;
      // google_maps_link 없는 경우 street_view_url로 조회
      if (!existingPlaceRecord && streetViewUrlFromCol) {
        existingPlaceRecord = await prisma.place.findFirst({ where: { streetViewUrl: streetViewUrlFromCol } });
      }

      // ── google_maps_link 분석 ──────────────────────────────────────────────
      let placeInfo: PlacesApiResult | null = null;
      let coordFromMapsLink: { lat: number; lng: number } | null = null;
      let detectedStreetViewFromMapsLink: string | null = null; // 수집자 실수로 스트릿뷰가 들어온 경우

      if (!existingPlaceRecord && googleMapsLink) {
        const resolved = await resolveGoogleMapsUrl(googleMapsLink);
        if (resolved?.type === "place") {
          placeInfo = await searchPlaceInfo(placeName, googleMapsLink);
        } else if (resolved?.type === "coord") {
          coordFromMapsLink = { lat: resolved.lat, lng: resolved.lng };
        } else if (resolved?.type === "streetview") {
          // 안전망: 스트릿뷰 URL이 잘못 들어온 경우 → streetViewUrl로 이동
          coordFromMapsLink = resolved.lat ? { lat: resolved.lat, lng: resolved.lng } : null;
          detectedStreetViewFromMapsLink = googleMapsLink;
        }
      }

      // ── street_view_url 처리: panoid → 위경도 ─────────────────────────────
      // google_maps_link에 좌표가 없을 때 street_view_url로 위경도 보완
      let coordFromStreetView: { lat: number; lng: number } | null = null;
      const finalStreetViewUrl = streetViewUrlFromCol ?? detectedStreetViewFromMapsLink;

      if (!existingPlaceRecord && finalStreetViewUrl && !placeInfo && !coordFromMapsLink) {
        coordFromStreetView = await resolveCoordsFromStreetViewUrl(finalStreetViewUrl);
      }

      // 최종 좌표: Places API > google_maps_link > street_view_url
      const finalCoords = placeInfo
        ? { lat: placeInfo.lat, lng: placeInfo.lng }
        : coordFromMapsLink ?? coordFromStreetView ?? null;

      // google_maps_link가 없고 street_view_url에서 좌표를 얻은 경우
      // → /@lat,lng,17z 형태의 좌표 링크 자동 생성
      const generatedMapsUrl = !googleMapsLink && finalCoords
        ? `https://www.google.com/maps/@${finalCoords.lat},${finalCoords.lng},17z`
        : null;

      // 실제 저장할 googleMapsUrl:
      // - 스트릿뷰가 잘못 들어왔으면 null (스트릿뷰 URL을 맵 버튼에 쓰면 안됨)
      // - 아니면 원본 google_maps_link 또는 자동 생성 URL
      const isStreetViewMisplaced = !!detectedStreetViewFromMapsLink;
      const googleMapsUrlToStore = isStreetViewMisplaced
        ? generatedMapsUrl
        : (googleMapsLink || generatedMapsUrl || null);

      // slug 생성
      const baseName = placeInfo?.nameEn
        ? placeInfo.nameEn.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-")
        : placeName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-") || "place";

      const slug = `${baseName}-${Math.random().toString(36).slice(2, 8)}`;

      const vibeRaw = (r["vibe"] ?? "").trim();
      const vibeArr = vibeRaw ? vibeRaw.split(/[,，/]/).map((v) => v.trim()).filter(Boolean) : [];

      const mapPinIconRaw = (r["map_pin_icon"] ?? "").trim();
      const placeTypes = mapPinIconRaw ? mapPinIconRaw.split(/[,，]/).map((t) => t.trim()).filter(Boolean) : [];

      const closeOrNotRaw = (r["close_or_not"] ?? "").trim();
      const placeStatus = closeOrNotRaw === "폐업" ? "CLOSED_PERMANENT" : "OPEN";

      const srcTypeRaw = (r["source_type"] ?? "").trim().toLowerCase();
      const mappedSrcType = srcTypeMap[srcTypeRaw] ?? (srcTypeRaw ? "OTHER" : null);

      const bannerImagesRaw = (r["banner_image"] ?? "").trim();
      const bannerImages = bannerImagesRaw
        ? bannerImagesRaw.split(/[,\n]/).map((u) => u.trim()).filter(Boolean)
        : [];

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

      const srcUrls = srcUrl ? srcUrl.split(",").map((u) => u.trim()).filter(Boolean) : [];
      const refUrls = referenceUrlVal ? referenceUrlVal.split(",").map((u) => u.trim()).filter(Boolean) : [];

      await prisma.$transaction(async (tx) => {
        let placeId: string;

        if (existingPlaceRecord) {
          placeId = existingPlaceRecord.id;
          // 기존 장소에 위경도가 없으면 URL에서 직접 추출해서 업데이트 (API 호출 없음)
          const needsCoords = !existingPlaceRecord.latitude || !existingPlaceRecord.longitude;
          if (needsCoords && googleMapsLink) {
            const resolvedCoords = await resolveGoogleMapsUrl(googleMapsLink);
            if (resolvedCoords?.type === "coord") {
              await tx.place.update({ where: { id: placeId }, data: { latitude: resolvedCoords.lat, longitude: resolvedCoords.lng } });
            }
          }
        } else if (placeInfo?.googlePlaceId) {
          const byGoogleId = await tx.place.findUnique({ where: { googlePlaceId: placeInfo.googlePlaceId } });
          if (byGoogleId) {
            placeId = byGoogleId.id;
          } else {
            const place = await tx.place.create({
              data: {
                nameKo: placeInfo.nameKo || placeName || "미상",
                nameEn: placeInfo.nameEn || null,
                addressKo: placeInfo.addressKo || null,
                addressEn: placeInfo.addressEn || null,
                latitude: placeInfo.lat || null,
                longitude: placeInfo.lng || null,
                googlePlaceId: placeInfo.googlePlaceId || null,
                googleMapsUrl: googleMapsUrlToStore,
                phone: placeInfo.phone || null,
                operatingHours: placeInfo.operatingHours ? (placeInfo.operatingHours as object) : undefined,
                rating: placeInfo.rating ?? null,
                gettingThere: (r["getting_there"] ?? "").trim() || null,
                streetViewUrl: finalStreetViewUrl,
                placeTypes,
                status: placeStatus,
                source: "ADMIN",
                isVerified: false,
              },
            });
            placeId = place.id;
          }
        } else {
          // 좌표 기반 장소 (비공식 장소, 스트릿뷰 URL 기반 등)
          const place = await tx.place.create({
            data: {
              nameKo: placeName || "미상",
              nameEn: null,
              addressKo: null,
              addressEn: null,
              latitude: finalCoords?.lat ?? null,
              longitude: finalCoords?.lng ?? null,
              googlePlaceId: null,
              googleMapsUrl: googleMapsUrlToStore,
              gettingThere: (r["getting_there"] ?? "").trim() || null,
              streetViewUrl: finalStreetViewUrl,
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
            ...((srcUrls.length > 0 || refUrls.length > 0) && {
              postSources: {
                create: [
                  ...srcUrls.map((url, i) => ({
                    url,
                    sourceType: (mappedSrcType === "REFERENCE" ? "REFERENCE" : "PRIMARY") as "PRIMARY" | "REFERENCE",
                    platform: detectPlatform(url),
                    isOriginalLink: false,
                    sourceNote: i === 0 ? srcNote : null,
                    sourcePostDate: i === 0 ? sourcePostDateVal : null,
                    sortOrder: i,
                  })),
                  ...refUrls.map((url, i) => ({
                    url,
                    sourceType: "REFERENCE" as "REFERENCE",
                    platform: detectPlatform(url),
                    isOriginalLink: false,
                    sourceNote: null,
                    sourcePostDate: null,
                    sortOrder: srcUrls.length + i,
                  })),
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
