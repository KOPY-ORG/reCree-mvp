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
    <div className="min-h-[100dvh] bg-muted">
      <div className="max-w-[540px] mx-auto bg-background min-h-[100dvh] flex flex-col shadow-[1px_0_0_rgba(0,0,0,0.04),-1px_0_0_rgba(0,0,0,0.04)]">
        <ActivityTracker />
        <ConditionalHeader header={<AppHeader />} savedHeader={<SavedHeader />} shopHeader={<ShopHeader />} />
        <MainArea>{children}</MainArea>
        <ScrollToTopButton />
      </div>

      {/* 탭바는 flex 항목이 아니라 오버레이다 — 콘텐츠를 밀어내지 않고 그 위에 뜬다.
          비우는 자리는 MainArea 가 잡는다. 폭은 탭바가 스스로 540px 로 맞춘다. */}
      <ConditionalBottomNav
        isLoggedIn={!!user}
        profileImageUrl={user?.profileImageUrl ?? null}
      />
    </div>
  );
}
