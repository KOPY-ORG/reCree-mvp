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

  const embedUrl = latitude && longitude
    ? `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`
    : null;

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-secondary bg-white overflow-hidden">
      {/* 장소 정보 헤더 */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-2.5">
        <MapPin className="h-5 w-5 shrink-0 mt-0.5 text-brand drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]" strokeWidth={2} />
        <div>
          <p className="text-sm font-bold text-foreground">{displayName}</p>
          {addressEn && (
            <p className="text-xs text-muted-foreground mt-0.5">{addressEn}</p>
          )}
        </div>
      </div>

      {/* 지도 임베드 (클릭 시 my-map으로 이동) */}
      {embedUrl && (
        <div className="mx-4 mb-1 h-40 rounded-xl overflow-hidden bg-muted relative">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0 pointer-events-none"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={displayName}
          />
          <Link
            href={`/my-map?place=${placeId}`}
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
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-secondary text-sm font-medium text-foreground hover:bg-secondary transition-colors"
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
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-secondary text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
              Naver Maps
            </a>
          )}
          {streetViewUrl && (
            <a
              href={streetViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-secondary text-sm font-medium text-foreground hover:bg-secondary transition-colors"
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
