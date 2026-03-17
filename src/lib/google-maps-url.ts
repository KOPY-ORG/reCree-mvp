// ─── 구글 맵 URL 유틸 ─────────────────────────────────────────────────────────
// Admin PlaceForm과 Import 액션에서 공통으로 사용하는 구글 맵 URL 파싱 로직

export async function expandGoogleMapsShortUrl(url: string): Promise<string> {
  if (!url || (!url.includes("maps.app.goo.gl") && !url.includes("goo.gl/maps"))) return url;
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; reCree/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    return res.url || url;
  } catch {
    return url;
  }
}

export type ResolvedGoogleMapsUrl =
  | { type: "place" }
  | { type: "coord"; lat: number; lng: number }
  | { type: "streetview"; lat: number; lng: number }
  | null;

/**
 * 구글 맵 URL을 분석하여 유형과 좌표를 반환합니다.
 * - "place": 공식 등록 장소 URL (Places API 호출 필요)
 * - "coord": 좌표 링크 (lat/lng 추출됨)
 * - "streetview": 스트릿뷰 URL
 * - null: 분석 불가
 */
export async function resolveGoogleMapsUrl(url: string): Promise<ResolvedGoogleMapsUrl> {
  if (!url) return null;
  try {
    const workingUrl = await expandGoogleMapsShortUrl(url);

    // 스트릿뷰: @/data= 패턴이거나 zoom이 숫자a 형태
    if (workingUrl.includes("/@/data=") || /\/@-?\d+\.\d+,-?\d+\.\d+,[\d.]+a[,/]/.test(workingUrl)) {
      const svMatch = workingUrl.match(/\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      return {
        type: "streetview",
        lat: svMatch ? parseFloat(svMatch[1]) : 0,
        lng: svMatch ? parseFloat(svMatch[2]) : 0,
      };
    }

    // 공식 장소: /place/ 경로가 있고 DMS 좌표 이름이 아닐 때
    // (DMS 예: "37°38'50.4"N 127°02'36.0"E" → 우클릭 좌표 링크)
    const placeMatch = workingUrl.match(/\/place\/([^/?]+)/);
    if (placeMatch?.[1]) {
      const name = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
      const isDmsCoord = /\d+[°º]/.test(name);
      if (name && !isDmsCoord) return { type: "place" };
    }

    // 좌표 (data 파라미터: !3d lat !4d lng)
    const dataMatch = workingUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      return { type: "coord", lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };
    }

    // 좌표 (@lat,lng)
    const atMatch = workingUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return { type: "coord", lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    return null;
  } catch {
    return null;
  }
}
