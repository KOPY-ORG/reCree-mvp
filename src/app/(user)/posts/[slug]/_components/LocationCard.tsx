"use client";

import { useState } from "react";
import { MapPin, ExternalLink, ChevronDown, ChevronUp, Clock, Phone } from "lucide-react";

interface Props {
  nameEn: string | null;
  nameKo: string;
  addressEn: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  naverMapsUrl: string | null;
  streetViewUrl: string | null;
  phone: string | null;
  operatingHours: string[] | null;
}

export function LocationCard({ nameEn, nameKo, addressEn, latitude, longitude, googleMapsUrl, naverMapsUrl, streetViewUrl, phone, operatingHours }: Props) {
  const displayName = nameEn ?? nameKo;

  const embedUrl = latitude && longitude
    ? `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`
    : null;

  const hasExtra = !!(phone || operatingHours?.length);
  const [open, setOpen] = useState(false);

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

      {/* More info 토글 버튼 */}
      {hasExtra && (
        <button
          onClick={() => setOpen((prev) => !prev)}
          className="w-full flex items-center justify-center gap-1 py-2.5 border-t border-secondary text-xs text-muted-foreground"
        >
          More info
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}

      {/* 펼쳐진 상세 정보 */}
      {open && (
        <div className="px-4 pb-4 space-y-4">
          {operatingHours && operatingHours.length > 0 && (
            <div className="flex gap-2">
              <Clock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" strokeWidth={1.5} />
              <ul className="space-y-1.5">
                {operatingHours.map((line, i) => (
                  <li key={i} className="text-xs text-gray-900">{line}</li>
                ))}
              </ul>
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <a href={`tel:${phone}`} className="text-xs text-gray-900 hover:underline">{phone}</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
