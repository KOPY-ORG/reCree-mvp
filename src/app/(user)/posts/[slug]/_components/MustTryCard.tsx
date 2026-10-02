"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Star } from "lucide-react";

interface Props {
  text: string;
}

// Spot Insight 에서 Must-try 만 떼어 낸 강조 카드. 2줄을 넘으면 접고 Show more 로 펼친다.
// 화면 제목은 "Fan To-Do" — 데이터 필드 이름(mustTry)은 그대로다.
// 다른 카드(surface-card)와 달리 메모(포스트잇) 모양이다 — 그림자 없는 연한 라임 종이에 오른쪽 위가 접혀 있다 (.memo-card)
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
    <div className="memo-card mx-4 px-4 py-4">
      {/* 팬이 즐기는 가벼운 미션이라 별(Star). 라임 종이 위라 검정, 제목 글자 크기에 맞춘 16 */}
      <div className="flex items-center gap-1.5">
        <Star className="size-4 shrink-0 text-foreground" strokeWidth={2} aria-hidden="true" />
        <p className="text-sm font-semibold text-foreground">Fan To-Do</p>
      </div>
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
