"use client";

// ─── discover 구독 토픽 칩 ────────────────────────────────────────────────────
// 검색바 아래 한 줄. [ 구독 토픽 … | + ] — 홈과 달리 Hot 이 없다.
//
// 홈 탭바(HomeTabBar)와 같은 칩을 쓰되 하는 일이 다르다. 홈은 탭을 바꾸는 <Link> 이고
// 여기는 ?topics= 필터를 토글하는 <button> 이다. 명세 4.1 — "누르면 그 토픽 필터가
// 걸리고, 다시 누르면 풀린다". 그래서 생김새(TOPIC_CHIP_*)만 가져오고 동작은 따로 쓴다.
//
// 필터 시트와 같은 상태를 본다. 여기서 켠 토픽은 시트를 열면 이미 켜져 있고,
// 시트에서 끄면 여기 칩도 꺼진다 — 둘 다 appliedTopicIds 하나를 읽고 쓴다.
//
// 구독이 없으면 + 만 선다. 빈 줄이 아니라 "구독할 수 있다"는 말이 남아야 한다.

import Link from "next/link";
import { Plus } from "lucide-react";
import {
  TOPIC_CHIP_BASE,
  TOPIC_CHIP_SELECTED,
  TOPIC_CHIP_UNSELECTED,
  type TabTopic,
} from "@/app/(user)/feed/_components/HomeTabBar";

/**
 * 칩이 지도 위에 뜨므로 그림자를 준다 — 검색바·필터 버튼과 같은 처리다.
 * 홈은 배경이 흰 종이라 그림자가 없었다.
 */
const ON_MAP = "shadow-sm";

export function DiscoverTopicChips({
  topics,
  appliedTopicIds,
  isLoggedIn,
  onToggleTopic,
}: {
  /** getMyFollows 순서 그대로 (sortOrder asc → createdAt desc) */
  topics: readonly TabTopic[];
  appliedTopicIds: readonly string[];
  isLoggedIn: boolean;
  onToggleTopic: (topicId: string) => void;
}) {
  return (
    <nav
      aria-label="Followed topics"
      /* 58 + 칩 높이 32 + pb 6 = 96. 시트 full 의 윗변(PlaceListSheet 의
         FULL_TOP_WITH_FACETS)과 정확히 맞물려, 시트를 끝까지 올려도 겹치지 않는다 */
      className="absolute top-[58px] inset-x-0 z-[60] overflow-x-auto px-3 pb-1.5 scrollbar-hide"
    >
      <div className="flex items-center gap-2">
        {topics.map((topic) => {
          const active = appliedTopicIds.includes(topic.id);
          return (
            <button
              key={topic.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleTopic(topic.id)}
              className={`${TOPIC_CHIP_BASE} ${ON_MAP} px-2.5 ${
                active ? TOPIC_CHIP_SELECTED : TOPIC_CHIP_UNSELECTED
              }`}
            >
              {/* 홈과 같은 규칙 — 긴 이름 하나가 줄을 독차지하지 않게 자른다 */}
              <span className="block max-w-[8.5rem] truncate">{topic.nameEn}</span>
            </button>
          );
        })}

        {/* 홈 탭바와 같은 곳으로 보낸다 (HomeTabBar.tsx 의 + 와 같은 링크).
            구독 관리 시트는 아직 없어 홈도 /topics 로 간다 — 그쪽이 시트로 바뀌면
            여기도 같이 바뀌어야 한다.
            비로그인은 로그인 화면으로 직행한다 (홈과 같은 처리) */}
        <Link
          href={isLoggedIn ? "/topics" : "/login"}
          aria-label={isLoggedIn ? "Manage followed topics" : "Sign in to follow topics"}
          className={`${TOPIC_CHIP_BASE} ${ON_MAP} w-8 ${TOPIC_CHIP_UNSELECTED}`}
        >
          <Plus className="size-[15px]" strokeWidth={2.5} />
        </Link>

        {/* 마지막 칩이 화면 끝에 붙지 않게 — HomeTabBar 와 같은 관례 */}
        <div className="shrink-0 w-1" />
      </div>
    </nav>
  );
}
