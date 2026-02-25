"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  totalCount: number;
  currentPage: number;
  pageSize: number;
  filterQuery: string;
}

export function PlacesPagination({
  totalCount,
  currentPage,
  pageSize,
  filterQuery,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        총 {totalCount.toLocaleString()}개 장소
      </p>
    );
  }

  const getPageUrl = (p: number) => {
    const sp = new URLSearchParams(filterQuery);
    if (p > 1) sp.set("page", String(p));
    else sp.delete("page");
    const qs = sp.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const getPageNumbers = (): (number | "...")[] => {
    const delta = 2;
    const range: number[] = [];
    for (
      let i = Math.max(1, currentPage - delta);
      i <= Math.min(totalPages, currentPage + delta);
      i++
    ) {
      range.push(i);
    }
    const pages: (number | "...")[] = [];
    if (range[0] > 1) {
      pages.push(1);
      if (range[0] > 2) pages.push("...");
    }
    pages.push(...range);
    if (range[range.length - 1] < totalPages) {
      if (range[range.length - 1] < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        총 {totalCount.toLocaleString()}개 장소 중 {from}–{to}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={currentPage === 1}
          onClick={() => router.push(getPageUrl(currentPage - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {getPageNumbers().map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 text-muted-foreground text-sm select-none"
            >
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === currentPage ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 text-xs"
              onClick={() => router.push(getPageUrl(p as number))}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={currentPage === totalPages}
          onClick={() => router.push(getPageUrl(currentPage + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
