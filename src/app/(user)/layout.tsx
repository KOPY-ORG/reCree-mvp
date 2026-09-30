import { AppHeader } from "./_components/AppHeader";
import { SavedHeader } from "./_components/SavedHeader";
import { ShopHeader } from "./_components/ShopHeader";
import { ConditionalHeader } from "./_components/ConditionalHeader";
import { ConditionalBottomNav } from "./_components/ConditionalBottomNav";
import { MainArea } from "./_components/MainArea";
import { ActivityTracker } from "./_components/ActivityTracker";
import { ScrollToTopButton } from "./_components/ScrollToTopButton";
import { getCurrentUser } from "@/lib/auth";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    // lg 의 왼쪽 여백은 레일 자리다. 기둥은 그 오른쪽 영역에서 가운데 서는 1440 컨테이너라
    // 폰 기둥을 구분하던 회색 바탕 · 옆선을 끈다 (편집기의 좁은 기둥은 남긴다 — data-narrow-layout)
    <div className="min-h-[100dvh] bg-muted lg:pl-[var(--side-nav-space)] lg:bg-background lg:has-[[data-narrow-layout]]:bg-muted">
      <div className="max-w-[var(--app-col-w)] mx-auto bg-background min-h-[100dvh] flex flex-col shadow-[1px_0_0_rgba(0,0,0,0.04),-1px_0_0_rgba(0,0,0,0.04)] lg:shadow-none lg:has-[[data-narrow-layout]]:shadow-[1px_0_0_rgba(0,0,0,0.04),-1px_0_0_rgba(0,0,0,0.04)]">
        <ActivityTracker />
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
