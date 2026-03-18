"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  addPlaceType,
  deletePlaceType,
  togglePlaceType,
  reorderPlaceType,
} from "../_actions/place-type-actions";

type Item = {
  id: string;
  name: string;
  nameKo: string;
  sortOrder: number;
  isActive: boolean;
};

export function PlaceTypeClient({ items }: { items: Item[] }) {
  const [nameInput, setNameInput] = useState("");
  const [nameKoInput, setNameKoInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput.trim() || !nameKoInput.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addPlaceType(nameInput.trim(), nameKoInput.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setNameInput("");
        setNameKoInput("");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* 추가 폼 */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="영문 키 (예: cafe)"
          className="w-40 h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
        />
        <input
          type="text"
          value={nameKoInput}
          onChange={(e) => setNameKoInput(e.target.value)}
          placeholder="한글명 (예: 카페)"
          className="flex-1 h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={isPending || !nameInput.trim() || !nameKoInput.trim()}
          className="h-9 px-4 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-40"
        >
          추가
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 목록 */}
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
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-40">영문 키</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">한글명</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-20">활성</th>
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
                          startTransition(async () => { await reorderPlaceType(item.id, val); });
                        }
                      }}
                      className="w-12 h-7 px-2 rounded border border-border text-sm text-center focus:outline-none focus:border-foreground"
                    />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{item.name}</td>
                  <td className="px-4 py-2.5 font-medium">{item.nameKo}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() =>
                        startTransition(async () => { await togglePlaceType(item.id, !item.isActive); })
                      }
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
                      onClick={() => startTransition(async () => { await deletePlaceType(item.id); })}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
