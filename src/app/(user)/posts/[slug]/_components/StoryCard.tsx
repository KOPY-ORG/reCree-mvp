"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { MessageSquareMore } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent";

interface Props {
  body: string;
}

// 본문 카드. 4줄(14px × 행간 1.8)을 넘으면 접고 Read more 로 펼친다 — MustTryCard 와 같은 방식.
// 마크다운은 문단이 여럿이라 line-clamp 가 듣지 않아 높이로 자른다.
// 접혀 있을 때는 .story-folded 가 문단 간격을 없애 빈 줄 없이 실제 글 4줄이 보이고, 마지막 한 줄만 아래로 흐려진다.
// lg 는 접지 않는다 — 넓은 왼쪽 열에서 본문 전체를 읽는다. 높이 제한 · 흐림 · 버튼을 lg 에서 풀고, .story-folded 는 lg 에서 듣지 않는다
export function StoryCard({ body }: Props) {
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
      <div className="px-4 pt-4 pb-3 lg:px-7 lg:pt-6">
        {/* 이야기를 들려주는 말풍선(MessageSquareMore). Fan To-Do 의 별과 같은 크기 · 색 */}
        <div className="flex items-center gap-1.5">
          <MessageSquareMore className="size-4 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />
          <p className="text-sm font-bold lg:text-base">Story</p>
        </div>
      </div>
      <div className="story-body px-4 pb-4 lg:px-7 lg:pb-6">
        <div
          className={
            expanded
              ? undefined
              : `story-folded max-h-[calc(0.875rem*1.8*4)] overflow-hidden lg:max-h-none ${
                  clamped
                    ? "[mask-image:linear-gradient(to_bottom,black_calc(100%_-_0.875rem*1.8),rgb(0_0_0/0.15))] lg:[mask-image:none]"
                    : ""
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
            className="mt-1.5 text-xs font-semibold text-foreground underline underline-offset-2 lg:hidden"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </div>
  );
}
