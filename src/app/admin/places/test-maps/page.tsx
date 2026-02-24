"use client";

// 개발 확인용 페이지 — 배포 전 삭제 예정

import { useState } from "react";
import {
  PlaceSearchInput,
  type PlaceSelectResult,
} from "@/components/maps/PlaceSearchInput";
import { MapPreview } from "@/components/maps/MapPreview";

export default function TestMapsPage() {
  const [selected, setSelected] = useState<PlaceSelectResult | null>(null);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">지도 컴포넌트 테스트</h1>
        <p className="text-sm text-muted-foreground mt-1">
          개발 확인용 페이지 — 배포 전 삭제 예정
        </p>
      </div>

      <div className="grid grid-cols-2 gap-8 items-start">
        {/* 좌측: 검색 + 결과 */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">PlaceSearchInput</h2>
          <PlaceSearchInput
            onSelect={setSelected}
            placeholder="장소명, 주소로 검색..."
          />

          {selected ? (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
              <Row label="name" value={selected.name} />
              <Row label="address" value={selected.address} />
              <Row label="lat" value={String(selected.lat)} />
              <Row label="lng" value={String(selected.lng)} />
              <Row label="googlePlaceId" value={selected.googlePlaceId} mono />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              장소를 검색하면 onSelect 콜백 결과가 표시됩니다.
            </p>
          )}
        </div>

        {/* 우측: 지도 */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">MapPreview</h2>
          {selected ? (
            <MapPreview
              key={`${selected.lat}-${selected.lng}`}
              lat={selected.lat}
              lng={selected.lng}
              height={400}
            />
          ) : (
            <div className="flex h-[400px] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
              장소를 선택하면 지도가 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className={`break-all ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
