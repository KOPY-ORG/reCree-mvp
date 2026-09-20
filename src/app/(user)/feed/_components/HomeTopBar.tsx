import { HomeSearchBar } from "./HomeSearchBar";
import { HomeTabBar, type TabTopic } from "./HomeTabBar";
import type { FeedTab } from "@/lib/feed-tabs";

/**
 * 홈 상단 고정 덩어리 — 검색바 + 탭바.
 *
 * 둘은 한 덩어리로 붙어 있어야 한다. 따로 붙이면 스크롤 중에 사이가 벌어진다.
 * 홈에는 헤더가 없어(ConditionalHeader 의 NO_HEADER_PATHS) top-0 이 비어 있다.
 * 표면은 .app-header 와 같게 — 반투명 + blur 로 아래 콘텐츠를 비친다.
 * 그림자는 넣지 않는다. 검색바가 이미 자기 그림자를 갖고 있다.
 *
 * 좌우 여백 20px 은 검색바에만 준다. 탭바는 제 안에서 스크롤해야 해서
 * 여백을 스크롤 영역 안쪽(HomeTabBar 의 px-5)에 둔다 — 안 그러면 탭이 여백에서 잘린다.
 *
 * 위 여백에 safe-area 를 더한다. 홈에는 헤더가 없어 이 바가 화면 맨 위에 닿는
 * 유일한 것이고, 노치·상태바 아래로 들어가면 검색바가 그 밑에 깔린다.
 * padding 이라 붙기 전후로 값이 같다 — sticky 는 여백을 다시 계산하지 않는다.
 *
 * 이 sticky 가 실제로 붙으려면 조상 중에 스크롤 컨테이너가 없어야 한다.
 * MainArea 가 /feed 에서만 overflow-x 를 clip 으로 바꾸는 이유다.
 */
export function HomeTopBar({
  activeTab,
  topics,
  isLoggedIn,
}: {
  activeTab: FeedTab;
  topics: readonly TabTopic[];
  isLoggedIn: boolean;
}) {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-5">
      <div className="px-5">
        <HomeSearchBar />
      </div>
      <div className="mt-4">
        <HomeTabBar activeTab={activeTab} topics={topics} isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
}
