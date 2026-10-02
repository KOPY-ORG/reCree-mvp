import Link from "next/link";
import { MapPin, ExternalLink, Map as MapIcon } from "lucide-react";
import { PlaceMarker } from "@/components/maps/PlaceMarker";
import type { MarkerGradient } from "@/lib/map-utils";

// 지도 미리보기 기하. 구글 임베드는 왼쪽 위에 "Maps ↗" 링크를 그리는데 iframe 안이라 지울 수 없다 —
// iframe 을 위로 CROP 만큼 올려 그 띠만 잘라낸다. 아래쪽(구글 로고 · 저작권 표기)은 약관상 남겨야 해서 자르지 않는다.
// 마커는 discover 와 같은 선택 상태(1.3배)다. 이름표는 카드 제목이 장소 이름이라 띄우지 않는다.
// 핀(약 55px)이 위로 서므로 장소를 상자 높이의 62% 지점에 두도록 지도 가운데를 장소보다 북쪽으로 옮긴다.
// 상자 높이는 모바일 150, lg 오른쪽 열이 넓어지면(1400~) 190 이다. 지도 가운데는 iframe 가운데에서 늘 PLACE_OFFSET 만큼
// 북쪽이라 장소는 상자 가운데보다 (PLACE_OFFSET − CROP/2) 아래에 온다 — 마커를 이 값으로 놓으면 높이가 달라도 맞는다.
// 150 에서는 상자 높이의 62%(93) 그대로다
const MAP_H = 150;
const CROP = 48;
const ZOOM = 15;
const PLACE_Y = Math.round(MAP_H * 0.62);
const IFRAME_CENTER_Y = (MAP_H + CROP) / 2 - CROP;
const PLACE_OFFSET = PLACE_Y - IFRAME_CENTER_Y;
const MARKER_TOP = `calc(50% + ${PLACE_OFFSET - CROP / 2}px)`;

/** lg 지도 링크 버튼 — 글자를 조금 굵게, 마우스를 올리면 살짝 진하게 */
const LG_BTN = "lg:font-semibold lg:hover:bg-secondary";

/** 장소가 iframe 가운데보다 px 만큼 아래 보이도록 하는 지도 가운데 위도 (메르카토르, 256px 타일) */
function centerLatFor(lat: number, px: number): number {
  const degPerPx = (360 / (256 * 2 ** ZOOM)) * Math.cos((lat * Math.PI) / 180);
  return lat + px * degPerPx;
}

interface Props {
  placeId: string;
  nameEn: string | null;
  nameKo: string;
  addressEn: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  naverMapsUrl: string | null;
  streetViewUrl: string | null;
  /** discover 지도와 같은 마커를 그리기 위한 값 (page 가 discover 와 같은 데이터로 계산한다) */
  marker: { color: string; gradient?: MarkerGradient; postCount: number; isSaved: boolean };
}

export function LocationCard({ placeId, nameEn, nameKo, addressEn, latitude, longitude, googleMapsUrl, naverMapsUrl, streetViewUrl, marker }: Props) {
  const displayName = nameEn ?? nameKo;

  // q 대신 ll 로 가운데만 맞춰 구글 기본 빨간 마커를 띄우지 않고, 그 자리에 discover 와 같은 마커를 얹는다.
  // 지도는 눌러도 움직이지 않으므로(pointer-events-none) 계산한 자리가 항상 장소다. hl=en 으로 지명 · 하단 문구를 영어로
  const embedUrl = latitude && longitude
    ? `https://maps.google.com/maps?ll=${centerLatFor(latitude, PLACE_OFFSET)},${longitude}&z=${ZOOM}&hl=en&output=embed`
    : null;
  const mapHref = `/discover?place=${placeId}`;

  return (
    // lg: 오른쪽 열 카드 — 안쪽 여백 18, 헤더 → 지도 → View on Map(전체 폭) → Google Maps · NAVER Map(반반) → Street View
    <div className="surface-card mx-4 mt-3 overflow-hidden">
      {/* 장소 정보 헤더 */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 lg:items-start lg:px-[18px] lg:pt-[18px]">
        {/* 라임 원 배지 안에 검정 핀 (라임 위는 검정) */}
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand lg:size-10" aria-hidden="true">
          <MapPin className="size-[18px] text-brand-foreground" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-snug text-foreground lg:font-bold">{displayName}</p>
          {addressEn && (
            <p className="text-xs text-muted-foreground mt-0.5 lg:text-[13px] lg:leading-[1.4]">{addressEn}</p>
          )}
        </div>
      </div>

      {/* 지도 미리보기 — 누르면 discover 에서 이 장소로 */}
      {embedUrl && (
        <div className="mx-4 mb-1 h-[150px] rounded-xl overflow-hidden bg-muted relative lg:mx-[18px] lg:mb-0 min-[87.5rem]:h-[190px]">
          <iframe
            src={embedUrl}
            className="absolute inset-x-0 w-full border-0 pointer-events-none"
            style={{ top: -CROP, height: `calc(100% + ${CROP}px)` }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={displayName}
          />
          {/* discover 지도의 그 마커(PlaceMarker), 선택된 상태 · 이름표 없이. 아래 끝이 장소에 닿도록 놓는다 —
              discover 의 AdvancedMarker 도 마커의 아래 가운데를 좌표에 맞춘다 */}
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-full"
            style={{ top: MARKER_TOP }}
            aria-hidden="true"
          >
            <PlaceMarker
              color={marker.color}
              gradient={marker.gradient}
              isSelected
              isSaved={marker.isSaved}
              nameEn={displayName}
              postCount={marker.postCount}
              placeId={`location-${placeId}`}
              showLabel={false}
            />
          </div>
          <Link
            href={mapHref}
            className="absolute inset-0 z-10"
            aria-label={`View ${displayName} on map`}
          />
        </div>
      )}

      {/* lg 전용 — 모바일은 하단에 떠 있는 View on Map(ViewOnMapButton) 이 맡는다 */}
      {embedUrl && (
        <Link
          href={mapHref}
          className="press-scale mx-[18px] mt-3 hidden h-11 items-center justify-center gap-1.5 rounded-full bg-brand text-[15px] font-bold text-brand-foreground lg:flex"
        >
          <MapIcon className="size-[18px]" strokeWidth={2} aria-hidden="true" />
          View on Map
        </Link>
      )}

      {/* 버튼 — 모바일은 한 줄, lg 는 두 칸 격자. Street View 는 늘 한 줄을 다 쓰고, 지도 링크가 하나뿐이면 그것도 한 줄을 다 쓴다 */}
      {(googleMapsUrl || naverMapsUrl || streetViewUrl) && (
        <div className="flex gap-2 px-4 py-3 lg:grid lg:grid-cols-2 lg:gap-x-2 lg:gap-y-3 lg:px-[18px] lg:pt-3 lg:pb-[18px]">
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full bg-muted text-sm font-medium text-foreground transition-opacity active:opacity-70 ${LG_BTN} ${naverMapsUrl ? "" : "lg:col-span-2"}`}
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              Google Maps
            </a>
          )}
          {naverMapsUrl && (
            <a
              href={naverMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full bg-muted text-sm font-medium text-foreground transition-opacity active:opacity-70 ${LG_BTN} ${googleMapsUrl ? "" : "lg:col-span-2"}`}
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              NAVER Map
            </a>
          )}
          {streetViewUrl && (
            <a
              href={streetViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full bg-muted text-sm font-medium text-foreground transition-opacity active:opacity-70 ${LG_BTN} lg:col-span-2`}
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              Street View
            </a>
          )}
        </div>
      )}
    </div>
  );
}
