"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";

interface Props {
  text: string;
}

// Spot Insight 에서 Must-try 만 떼어 낸 강조 카드. 4줄을 넘으면 접고 Show more 로 펼친다
export function MustTryCard({ text }: Props) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);

  // 접힌 상태에서만 잰다 — 펼친 뒤에는 scrollHeight 와 clientHeight 가 같아져 버튼이 사라진다
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded]);

  return (
    <div className="mx-4 rounded-2xl border border-brand bg-brand/15 px-4 py-4">
      <div className="flex items-center gap-1.5">
        <Flame className="h-4 w-4 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]" style={{ color: "#F46022" }} />
        <p className="text-sm font-bold text-foreground">Must-try</p>
      </div>
      <p
        ref={textRef}
        className={`mt-1.5 text-sm text-gray-900 leading-relaxed ${expanded ? "" : "line-clamp-4"}`}
      >
        {text}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs font-semibold text-foreground underline underline-offset-2"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
