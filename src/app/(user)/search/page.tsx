"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, X } from "lucide-react";

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      {/* 검색 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => router.back()}
          className="shrink-0 size-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Search K-artists, dramas, foods"
            className="w-full h-10 pl-9 pr-9 rounded-full border border-border bg-muted/30 text-sm focus:outline-none focus:border-brand transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* 검색 결과 (추후 구현) */}
      {!query && (
        <p className="text-center text-sm text-muted-foreground mt-8">
          Search for K-artists, dramas, and more
        </p>
      )}
    </div>
  );
}
