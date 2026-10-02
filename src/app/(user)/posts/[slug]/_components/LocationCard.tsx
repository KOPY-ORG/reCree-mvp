import Link from "next/link";
import { MapPin, ExternalLink } from "lucide-react";

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
}

export function LocationCard({ placeId, nameEn, nameKo, addressEn, latitude, longitude, googleMapsUrl, naverMapsUrl, streetViewUrl }: Props) {
  const displayName = nameEn ?? nameKo;

  // q 대신 ll 로 가운데만 맞춰 구글 기본 빨간 마커를 띄우지 않고, 그 자리에 reCree 라임 마커를 얹는다.
  // 지도는 눌러도 움직이지 않으므로(pointer-events-none) 가운데가 항상 장소다. hl=en 으로 지명 · 하단 문구를 영어로
  const embedUrl = latitude && longitude
    ? `https://maps.google.com/maps?ll=${latitude},${longitude}&z=15&hl=en&output=embed`
    : null;

  return (
    <div className="surface-card mx-4 mt-3 overflow-hidden">
      {/* 장소 정보 헤더 */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        {/* 라임 원 배지 안에 검정 핀 (라임 위는 검정) */}
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand" aria-hidden="true">
          <MapPin className="size-[18px] text-brand-foreground" strokeWidth={2} />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">{displayName}</p>
          {addressEn && (
            <p className="text-xs text-muted-foreground mt-0.5">{addressEn}</p>
          )}
        </div>
      </div>

      {/* 지도 임베드 (클릭 시 discover 지도 뷰로 이동) */}
      {embedUrl && (
        <div className="mx-4 mb-1 h-40 rounded-xl overflow-hidden bg-muted relative">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0 pointer-events-none"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={displayName}
          />
          {/* reCree 라임 마커 — 끝이 지도 가운데(장소)에 닿도록 핀 높이만큼 올린다. 검정 테두리 + 그림자로 지도 위에서 떠 보이게 */}
          <svg
            viewBox="0 0 32 40"
            className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-8 -translate-x-1/2 -translate-y-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
            aria-hidden="true"
          >
            <path
              d="M16 38.5c-.5 0-1-.3-1.3-.7C11.2 32.6 2.5 22.9 2.5 15.5a13.5 13.5 0 0 1 27 0c0 7.4-8.7 17.1-12.2 22.3-.3.4-.8.7-1.3.7Z"
              fill="var(--brand)"
              stroke="var(--foreground)"
              strokeWidth="2"
            />
            <circle cx="16" cy="15.5" r="5" fill="var(--foreground)" />
          </svg>
          <Link
            href={`/discover?place=${placeId}`}
            className="absolute inset-0 z-10"
            aria-label={`View ${displayName} on map`}
          />
        </div>
      )}

      {/* 버튼 */}
      {(googleMapsUrl || naverMapsUrl || streetViewUrl) && (
        <div className="flex gap-2 px-4 py-3">
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full bg-muted text-sm font-medium text-foreground transition-opacity active:opacity-70"
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
              className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full bg-muted text-sm font-medium text-foreground transition-opacity active:opacity-70"
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
              className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-full bg-muted text-sm font-medium text-foreground transition-opacity active:opacity-70"
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
