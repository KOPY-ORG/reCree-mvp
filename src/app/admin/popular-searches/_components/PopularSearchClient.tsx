"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { addPopularSearch, deletePopularSearch, togglePopularSearch, updateOrder } from "../actions";

type Item = {
  id: string;
  keyword: string;
  order: number;
  isActive: boolean;
};

export function PopularSearchClient({ items }: { items: Item[] }) {
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    startTransition(async () => {
      await addPopularSearch(input.trim());
      setInput("");
    });
  }

  return (
    <div className="space-y-4">
      {/* 추가 폼 */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="검색어 입력"
          className="flex-1 h-9 px-3 rounded-md border border-border text-sm focus:outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={isPending || !input.trim()}
          className="h-9 px-4 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-40"
        >
          추가
        </button>
      </form>

      {/* 목록 */}
      <div className="border border-border rounded-lg overflow-hidden">
        {items.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            등록된 인기 검색어가 없습니다.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-16">순서</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">키워드</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-20">노출</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <input
                      type="number"
                      defaultValue={item.order}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val !== item.order) {
                          startTransition(() => updateOrder(item.id, val));
                        }
                      }}
                      className="w-12 h-7 px-2 rounded border border-border text-sm text-center focus:outline-none focus:border-foreground"
                    />
                  </td>
                  <td className="px-4 py-2.5 font-medium">{item.keyword}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() =>
                        startTransition(() => togglePopularSearch(item.id, !item.isActive))
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
                      onClick={() => startTransition(() => deletePopularSearch(item.id))}
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
