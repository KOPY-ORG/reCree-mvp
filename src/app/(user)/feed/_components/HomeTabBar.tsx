import Link from "next/link";
import { Plus } from "lucide-react";
import { feedTabHref, HOT_TAB, type FeedTab } from "@/lib/feed-tabs";

/**
 * 홈 상단 탭바 — [ Hot | 구독 토픽… | + ].
 *
 * 서버 컴포넌트다. 탭 전환은 ?tab= 이 바뀌는 것뿐이라 <Link> 로 끝나고,
 * 선택 판정도 서버에서 구독 목록과 대조해 이미 끝나 있다. 상태가 없다.
 *
 * 탭에 토픽 색을 입히지 않는다. 색이 들어가면 "선택됨"과 "어느 토픽인가"가
 * 같은 축(색)에서 겨뤄 무엇이 선택인지 흐려진다. 선택은 명암으로만 말한다.
 */
export type TabTopic = { id: string; slug: string; nameEn: string };

/** 알약 치수. .pill-badge 의 배지 기본값(12px · px-2)을 탭이 눌릴 만한 크기로 키운다 */
const PILL_SIZE = "text-sm py-2 px-3.5";

const SELECTED: React.CSSProperties = {
  background: "var(--primary)",
  color: "var(--primary-foreground)",
};

const UNSELECTED: React.CSSProperties = {
  background: "var(--secondary)",
  color: "var(--foreground)",
};

function Tab({
  href,
  active,
  children,
  ariaLabel,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={active ? "page" : undefined}
      className={`pill-badge ${PILL_SIZE} shrink-0 transition-opacity active:opacity-70`}
      style={active ? SELECTED : UNSELECTED}
    >
      {children}
    </Link>
  );
}

export function HomeTabBar({
  activeTab,
  topics,
  isLoggedIn,
}: {
  activeTab: FeedTab;
  /** getMyFollows 순서 그대로 (sortOrder asc → createdAt desc) */
  topics: readonly TabTopic[];
  isLoggedIn: boolean;
}) {
  return (
    <nav aria-label="Home tabs" className="overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-2 px-4 py-3">
        <Tab href={feedTabHref(HOT_TAB)} active={activeTab.kind === "hot"}>
          Hot
        </Tab>

        {topics.map((topic) => (
          <Tab
            key={topic.id}
            href={feedTabHref({ kind: "topic", slug: topic.slug, topicId: topic.id })}
            active={activeTab.kind === "topic" && activeTab.topicId === topic.id}
          >
            {/* 이름이 길어도 한 탭이 탭바를 독차지하지 않게 자른다.
                잘린 이름은 탭을 눌러 들어간 헤더에서 온전히 보인다 (E4) */}
            <span className="block max-w-[8.5rem] truncate">{topic.nameEn}</span>
          </Tab>
        ))}

        {/* E3 에서 구독 관리 시트로 교체된다. 그때까지는 기존 토픽 목록으로 보낸다.
            비로그인은 명세 3.1 의 로그인 유도 시트 대신 로그인 화면으로 직행한다. */}
        <Tab
          href={isLoggedIn ? "/topics" : "/login"}
          active={false}
          ariaLabel={isLoggedIn ? "Manage followed topics" : "Sign in to follow topics"}
        >
          <Plus className="size-4" strokeWidth={2.5} />
        </Tab>

        {/* 마지막 탭이 화면 끝에 붙지 않게 — HScrollSection 과 같은 관례 */}
        <div className="shrink-0 w-1" />
      </div>
    </nav>
  );
}
