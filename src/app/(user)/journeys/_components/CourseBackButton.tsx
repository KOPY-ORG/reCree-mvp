"use client";

import { useRouter } from "next/navigation";

/**
 * 배너 위에 얹는 뒤로가기 버튼 (시안 journeyView 의 좌상단 원형 버튼).
 * TopicDetailHeader 와 달리 흰 원형 배경을 깔았다 — 배너가 Topic 색이라
 * 어떤 색이 와도 화살표가 읽혀야 한다.
 *
 * 시안의 top:58px 은 프로토타입 상태바(54px) + 4px 이다. 웹에는 상태바가
 * 없으므로 좌측 여백과 같은 14px 로 맞춘다.
 */
export function CourseBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/journeys");
      }}
      className="absolute left-3.5 top-3.5 z-10 flex size-9 items-center justify-center rounded-full bg-white/90"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.6">
        <path d="M14.5 5L7.5 12l7 7" />
      </svg>
    </button>
  );
}
