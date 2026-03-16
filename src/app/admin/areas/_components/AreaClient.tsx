"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { addArea, deleteArea, reorderArea } from "../_actions/area-actions";

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
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"city" | "district">("city");

  // 도시 추가 폼
  const [cityNameKo, setCityNameKo] = useState("");
  const [cityNameEn, setCityNameEn] = useState("");

  // 구역 추가 폼
  const [districtNameKo, setDistrictNameKo] = useState("");
  const [districtNameEn, setDistrictNameEn] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");

  const cities = items.filter((a) => a.level === 0);
  const districts = items.filter((a) => a.level === 1);

  function handleAddCity(e: React.FormEvent) {
    e.preventDefault();
    if (!cityNameKo.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addArea(cityNameKo.trim(), 0, null, cityNameEn.trim() || undefined);
      if (result.error) {
        setError(result.error);
      } else {
        setCityNameKo("");
        setCityNameEn("");
      }
    });
  }

  function handleAddDistrict(e: React.FormEvent) {
    e.preventDefault();
    if (!districtNameKo.trim() || !selectedCityId) return;
    setError(null);
    startTransition(async () => {
      const result = await addArea(districtNameKo.trim(), 1, selectedCityId, districtNameEn.trim() || undefined);
      if (result.error) {
        setError(result.error);
      } else {
        setDistrictNameKo("");
        setDistrictNameEn("");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* 탭 */}
      <div className="flex gap-1 border-b border-border">
        {(["city", "district"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setError(null); }}
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {activeTab === "city" ? (
        <>
          {/* 도시 추가 폼 */}
          <form onSubmit={handleAddCity} className="flex gap-2">
            <input
              type="text"
              value={cityNameKo}
              onChange={(e) => setCityNameKo(e.target.value)}
              placeholder="한글명 (예: 서울)"
              className="flex-1 h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
            />
            <input
              type="text"
              value={cityNameEn}
              onChange={(e) => setCityNameEn(e.target.value)}
              placeholder="영문명 (예: Seoul, 선택)"
              className="w-44 h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
            />
            <button
              type="submit"
              disabled={isPending || !cityNameKo.trim()}
              className="h-9 px-4 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-40"
            >
              추가
            </button>
          </form>

          {/* 도시 목록 */}
          <AreaTable
            items={cities}
            isPending={isPending}
            startTransition={startTransition}
          />
        </>
      ) : (
        <>
          {/* 구역 추가 폼 */}
          <form onSubmit={handleAddDistrict} className="flex gap-2">
            <select
              value={selectedCityId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              className="w-36 h-9 px-2 rounded-md border border-border text-sm focus:outline-none focus:border-foreground bg-background"
            >
              <option value="">도시 선택</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.nameKo}</option>
              ))}
            </select>
            <input
              type="text"
              value={districtNameKo}
              onChange={(e) => setDistrictNameKo(e.target.value)}
              placeholder="한글명 (예: 홍대)"
              className="flex-1 h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
            />
            <input
              type="text"
              value={districtNameEn}
              onChange={(e) => setDistrictNameEn(e.target.value)}
              placeholder="영문명 (선택)"
              className="w-32 h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
            />
            <button
              type="submit"
              disabled={isPending || !districtNameKo.trim() || !selectedCityId}
              className="h-9 px-4 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-40"
            >
              추가
            </button>
          </form>

          {/* 구역 목록 — 도시별 그룹 */}
          {cities.map((city) => {
            const cityDistricts = districts.filter((d) => d.parentId === city.id);
            if (cityDistricts.length === 0) return null;
            return (
              <div key={city.id}>
                <p className="text-xs font-medium text-muted-foreground mb-1 mt-3">{city.nameKo}</p>
                <AreaTable
                  items={cityDistricts}
                  isPending={isPending}
                  startTransition={startTransition}
                />
              </div>
            );
          })}
          {districts.filter((d) => !cities.some((c) => c.id === d.parentId)).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 mt-3">도시 미지정</p>
              <AreaTable
                items={districts.filter((d) => !cities.some((c) => c.id === d.parentId))}
                isPending={isPending}
                startTransition={startTransition}
              />
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
  isPending,
  startTransition,
}: {
  items: { id: string; nameKo: string; nameEn: string | null; sortOrder: number }[];
  isPending: boolean;
  startTransition: (fn: () => void) => void;
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
            <th className="w-12" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/30">
              <td className="px-4 py-2.5">
                <input
                  type="number"
                  defaultValue={item.sortOrder}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val !== item.sortOrder) {
                      startTransition(() => reorderArea(item.id, val));
                    }
                  }}
                  className="w-12 h-7 px-2 rounded border border-border text-sm text-center focus:outline-none focus:border-foreground"
                />
              </td>
              <td className="px-4 py-2.5 font-medium">{item.nameKo}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{item.nameEn ?? "-"}</td>
              <td className="px-3 py-2.5">
                <button
                  onClick={() => startTransition(() => deleteArea(item.id))}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                >
                  <Trash2 className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
