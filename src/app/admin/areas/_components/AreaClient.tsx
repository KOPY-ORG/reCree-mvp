"use client";

import { useState } from "react";

// 읽기 전용 화면이다. 추가 · 삭제 · 순서 폼을 두지 않는다 —
// level 0(시도) · 1(시군구)는 seed-areas.ts 가 TourAPI 기준으로 관리하고,
// 여기서 손대면 법정동 코드 연결이 조용히 끊긴다. 막는 자리는 area-actions 의 가드다.

type AreaItem = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  level: number;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};

export function AreaClient({ items }: { items: AreaItem[] }) {
  const [activeTab, setActiveTab] = useState<"city" | "district">("city");

  const cities = items.filter((a) => a.level === 0);
  const districts = items.filter((a) => a.level === 1);

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        {(["city", "district"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "city" ? `도시 (${cities.length})` : `구역 (${districts.length})`}
          </button>
        ))}
      </div>

      {activeTab === "city" ? (
        <AreaTable items={cities} />
      ) : (
        <>
          {/* 구역 목록 — 도시별 그룹 */}
          {cities.map((city) => {
            const cityDistricts = districts.filter((d) => d.parentId === city.id);
            if (cityDistricts.length === 0) return null;
            return (
              <div key={city.id}>
                <p className="text-xs font-medium text-muted-foreground mb-1 mt-3">{city.nameKo}</p>
                <AreaTable items={cityDistricts} />
              </div>
            );
          })}
          {districts.filter((d) => !cities.some((c) => c.id === d.parentId)).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 mt-3">도시 미지정</p>
              <AreaTable items={districts.filter((d) => !cities.some((c) => c.id === d.parentId))} />
            </div>
          )}
          {districts.length === 0 && (
            <div className="border border-border rounded-lg py-12 text-center text-sm text-muted-foreground">
              등록된 구역이 없습니다.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AreaTable({
  items,
}: {
  items: { id: string; nameKo: string; nameEn: string | null; sortOrder: number }[];
}) {
  if (items.length === 0) {
    return (
      <div className="border border-border rounded-lg py-12 text-center text-sm text-muted-foreground">
        등록된 항목이 없습니다.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted border-b border-border">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-16">순서</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">한글명</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">영문명</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30">
              <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{item.sortOrder}</td>
              <td className="px-4 py-2.5 font-medium">{item.nameKo}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{item.nameEn ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
