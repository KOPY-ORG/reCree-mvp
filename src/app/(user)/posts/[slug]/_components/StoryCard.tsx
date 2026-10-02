"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { MarkdownContent } from "./MarkdownContent";

interface Props {
  subtitle: string;
  body: string;
}

// 본문 카드. 4줄(14px × 행간 1.8)을 넘으면 접고 Read more 로 펼친다 — MustTryCard 와 같은 방식.
// 마크다운은 문단이 여럿이라 line-clamp 가 듣지 않아 높이로 자르고, 끝을 마스크로 흐린다
export function StoryCard({ subtitle, body }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  // 자르는 상자가 아니라 내용을 잰다 — 마크다운은 늦게 불러와져 그때 높이가 바뀐다
  useLayoutEffect(() => {
    const el = contentRef.current;
    const box = el?.parentElement;
    if (!el || !box || expanded) return;
    const measure = () => setClamped(el.scrollHeight > box.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded]);

  return (
    <div className="surface-card mx-4 overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <p className="text-sm font-bold">Story</p>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="px-4 pb-4">
        <div
          className={
            expanded
              ? undefined
              : `max-h-[calc(0.875rem*1.8*4)] overflow-hidden ${
                  clamped ? "[mask-image:linear-gradient(to_bottom,black_60%,transparent)]" : ""
                }`
          }
        >
          <div ref={contentRef}>
            <MarkdownContent source={body} />
          </div>
        </div>
        {(clamped || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-1.5 text-xs font-semibold text-foreground underline underline-offset-2"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </div>
  );
}
