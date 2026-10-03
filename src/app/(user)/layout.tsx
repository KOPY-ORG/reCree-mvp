import { AppHeader } from "./_components/AppHeader";
import { SavedHeader } from "./_components/SavedHeader";
import { ShopHeader } from "./_components/ShopHeader";
import { ConditionalHeader } from "./_components/ConditionalHeader";
import { ConditionalBottomNav } from "./_components/ConditionalBottomNav";
import { MainArea } from "./_components/MainArea";
import { ActivityTracker } from "./_components/ActivityTracker";
import { InAppHistoryTracker } from "./_components/InAppHistoryTracker";
import { ScrollToTopButton } from "./_components/ScrollToTopButton";
import { getCurrentUser } from "@/lib/auth";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    // lg 의 위 여백은 상단 바 자리다(바가 없는 화면은 0). 기둥은 그 아래 가운데 서는 wide 컨테이너라
    // 폰 기둥을 구분하던 회색 바탕 · 옆선을 끈다 (편집기의 좁은 기둥은 남긴다 — data-narrow-layout).
    // 기둥 최소 높이에서 위 여백을 빼야 문서가 화면보다 64 길어지지 않는다 (지도 화면의 이중 스크롤)
    <div className="min-h-[100dvh] bg-muted lg:pt-[var(--top-nav-space)] lg:bg-background lg:has-[[data-narrow-layout]]:bg-muted">
      <div className="max-w-[var(--app-col-w)] mx-auto bg-background min-h-[100dvh] lg:min-h-[calc(100dvh-var(--top-nav-space))] flex flex-col shadow-[1px_0_0_rgba(0,0,0,0.04),-1px_0_0_rgba(0,0,0,0.04)] lg:shadow-none lg:has-[[data-narrow-layout]]:shadow-[1px_0_0_rgba(0,0,0,0.04),-1px_0_0_rgba(0,0,0,0.04)]">
        <ActivityTracker />
        <InAppHistoryTracker />
        <ConditionalHeader header={<AppHeader />} savedHeader={<SavedHeader />} shopHeader={<ShopHeader />} />
        <MainArea>{children}</MainArea>
        <ScrollToTopButton />
      </div>

      {/* 탭바는 flex 항목이 아니라 오버레이다 — 콘텐츠를 밀어내지 않고 그 위에 뜬다.
          비우는 자리는 MainArea 가 잡는다. 폭은 탭바가 스스로 --app-col-w 로 맞춘다. */}
      <ConditionalBottomNav
        isLoggedIn={!!user}
        profileImageUrl={user?.profileImageUrl ?? null}
      />
    </div>
  );
}
