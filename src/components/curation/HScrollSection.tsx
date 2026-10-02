"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HScrollSection({
  title,
  moreHref,
  showMore = true,
  children,
}: {
  title: string;
  moreHref?: string;
  showMore?: boolean;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // lg 화살표의 활성 여부. 모바일은 화살표가 display:none 이라 값만 갱신된다
  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  // 한 화면 폭의 90% — 마지막에 보이던 카드가 다음 화면 첫머리에 다시 걸쳐 이어짐을 알려 준다
  const page = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const arrow =
    "flex size-8 items-center justify-center rounded-full border border-border bg-background transition-opacity hover:bg-muted disabled:pointer-events-none disabled:opacity-30";

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="font-bold text-lg">{title}</h2>
        <div className="flex items-center gap-3">
          {moreHref && showMore && (
            <Link
              href={moreHref}
              className="text-sm text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
            >
              More <ChevronRight className="size-3.5" />
            </Link>
          )}
          {/* lg: 마우스에는 가로 스와이프가 없다 — 제목 줄 오른쪽 ‹ › 로 넘긴다 (desktop-layout.md §15 원칙 6) */}
          {(canPrev || canNext) && (
            <div className="hidden lg:flex items-center gap-1.5">
              <button type="button" aria-label="Previous" className={arrow} disabled={!canPrev} onClick={() => page(-1)}>
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" aria-label="Next" className={arrow} disabled={!canNext} onClick={() => page(1)}>
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>
      {/* pb-2: 카드 box/drop-shadow가 overflow-x clip에 잘리지 않도록 하단 여백 확보 */}
      <div ref={scrollerRef} onScroll={update} className="overflow-x-auto scrollbar-hide pb-2">
        <div className="flex gap-3 pl-4 pb-1">
          {children}
          <div className="shrink-0 w-1" />
        </div>
      </div>
    </section>
  );
}
