"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { PlaceCategory } from "@prisma/client";
import { PLACE_CATEGORY_LABELS_KO, PLACE_CATEGORY_ORDER } from "@/lib/place-types";
import {
  addPlaceType,
  updatePlaceType,
  deletePlaceType,
  togglePlaceType,
  reorderPlaceType,
} from "../_actions/place-type-actions";

type Item = {
  id: string;
  name: string;
  nameKo: string;
  category: PlaceCategory;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  /** 이 유형을 쓰는 장소 수 — 0 이 아니면 삭제가 거부된다 */
  usedBy: number;
};

const selectClass =
  "h-9 px-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:border-foreground";

export function PlaceTypeClient({ items }: { items: Item[] }) {
  const [nameInput, setNameInput] = useState("");
  const [nameKoInput, setNameKoInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<PlaceCategory>("ATTRACTIONS");
  const [isDefaultInput, setIsDefaultInput] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /** 서버 액션의 error 를 한 곳에서 받는다 — 삼키면 왜 안 됐는지 화면에 남지 않는다 */
  function run(action: () => Promise<{ error?: string }>, onDone?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else onDone?.();
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim() || !nameKoInput.trim()) return;
    run(
      () => addPlaceType(nameInput.trim(), nameKoInput.trim(), categoryInput, isDefaultInput),
      () => {
        setNameInput("");
        setNameKoInput("");
        setIsDefaultInput(false);
      },
    );
  }

  // 카테고리 순서는 고정, 그 안은 sortOrder 순 (서버 쿼리와 같은 규칙)
  const groups = PLACE_CATEGORY_ORDER.map(
    (category) => [category, items.filter((i) => i.category === category)] as const,
  ).filter(([, list]) => list.length > 0);

  return (
    <div className="space-y-4">
      {/* 추가 폼 */}
      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
        <select
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value as PlaceCategory)}
          className={`${selectClass} w-28`}
        >
          {PLACE_CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {PLACE_CATEGORY_LABELS_KO[c]}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="영문 이름 (예: Rooftop Bar)"
          className="w-48 h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
        />
        <input
          type="text"
          value={nameKoInput}
          onChange={(e) => setNameKoInput(e.target.value)}
          placeholder="한글명 (예: 루프탑 바)"
          className="flex-1 min-w-40 h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
        />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={isDefaultInput}
            onChange={(e) => setIsDefaultInput(e.target.checked)}
            className="size-4"
          />
          기본값
        </label>
        <button
          type="submit"
          disabled={isPending || !nameInput.trim() || !nameKoInput.trim()}
          className="h-9 px-4 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-40"
        >
          추가
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 목록 — 카테고리별로 묶는다 */}
      <div className="border border-border rounded-lg overflow-hidden">
        {items.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            등록된 장소 유형이 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-16">순서</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-44">영문 이름</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">한글명</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-28">카테고리</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-20">기본값</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-20">사용</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-20">활성</th>
                <th className="w-12" />
              </tr>
            </thead>
            {groups.map(([category, list]) => (
              <tbody key={category} className="divide-y divide-border border-b border-border last:border-0">
                <tr className="bg-muted/40">
                  <td colSpan={8} className="px-4 py-1.5 text-xs font-semibold text-muted-foreground">
                    {PLACE_CATEGORY_LABELS_KO[category]} · {list.length}종
                  </td>
                </tr>
                {list.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <input
                        type="number"
                        defaultValue={item.sortOrder}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val !== item.sortOrder) {
                            run(() => reorderPlaceType(item.id, val));
                          }
                        }}
                        className="w-12 h-7 px-2 rounded border border-border text-sm text-center focus:outline-none focus:border-foreground"
                      />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{item.name}</td>
                    <td className="px-4 py-2.5 font-medium">{item.nameKo}</td>
                    <td className="px-4 py-2.5">
                      <select
                        value={item.category}
                        onChange={(e) =>
                          run(() => updatePlaceType(item.id, { category: e.target.value as PlaceCategory }))
                        }
                        className="h-7 px-1.5 rounded border border-border bg-background text-xs focus:outline-none focus:border-foreground"
                      >
                        {PLACE_CATEGORY_ORDER.map((c) => (
                          <option key={c} value={c}>
                            {PLACE_CATEGORY_LABELS_KO[c]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={item.isDefault}
                        onChange={(e) => run(() => updatePlaceType(item.id, { isDefault: e.target.checked }))}
                        className="size-4"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {item.usedBy > 0 ? `${item.usedBy}곳` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => run(() => togglePlaceType(item.id, !item.isActive))}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          item.isActive ? "bg-foreground" : "bg-muted-foreground/30"
                        }`}
                      >
                        <span
                          className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${
                            item.isActive ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => run(() => deletePlaceType(item.id))}
                        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30"
                        disabled={item.usedBy > 0}
                        title={item.usedBy > 0 ? `사용 중인 장소 ${item.usedBy}곳` : "삭제"}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        )}
      </div>
    </div>
  );
}
