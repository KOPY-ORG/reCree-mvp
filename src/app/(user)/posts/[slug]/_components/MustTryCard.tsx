"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface Props {
  text: string;
}

// Spot Insight 에서 Must-try 만 떼어 낸 강조 카드. 2줄을 넘으면 접고 Show more 로 펼친다.
// 화면 제목은 "Do It Like Them" — 데이터 필드 이름(mustTry)은 그대로다.
// 다른 카드와 같은 표면(surface-card)에 바탕만 브랜드 연두(brand-sub3)를 깔아 강조를 남긴다
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
    <div className="surface-card mx-4 bg-brand-sub3 px-4 py-4">
      <p className="text-sm font-bold text-foreground">Do It Like Them</p>
      <p
        ref={textRef}
        className={`mt-1.5 text-sm text-gray-900 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
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
