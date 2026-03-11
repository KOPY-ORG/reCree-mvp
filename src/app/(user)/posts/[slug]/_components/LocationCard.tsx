"use client";

import { MapPin, ExternalLink } from "lucide-react";

interface Props {
  nameEn: string | null;
  nameKo: string;
  addressEn: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
}

export function LocationCard({ nameEn, nameKo, addressEn, latitude, longitude, googleMapsUrl }: Props) {
  const displayName = nameEn ?? nameKo;

  const embedUrl = latitude && longitude
    ? `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`
    : null;

  const naverMapsUrl = nameKo
    ? `https://map.naver.com/v5/search/${encodeURIComponent(nameKo)}`
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

      {/* 지도 임베드 */}
      {embedUrl && (
        <div className="mx-4 mb-1 h-40 rounded-xl overflow-hidden bg-muted">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={displayName}
          />
        </div>
      )}

      {/* 버튼 */}
      {(googleMapsUrl || naverMapsUrl) && (
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
        </div>
      )}
    </div>
  );
}
