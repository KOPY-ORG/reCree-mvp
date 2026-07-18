import { AppHeader } from "./_components/AppHeader";
import { SavedHeader } from "./_components/SavedHeader";
import { ShopHeader } from "./_components/ShopHeader";
import { ConditionalHeader } from "./_components/ConditionalHeader";
import { ConditionalBottomNav } from "./_components/ConditionalBottomNav";
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
        <main className="flex-1 w-full overflow-x-hidden">{children}</main>
        <div className="sticky bottom-0 z-40">
          <ConditionalBottomNav
            isLoggedIn={!!user}
            profileImageUrl={user?.profileImageUrl ?? null}
          />
        </div>
        <ScrollToTopButton />
      </div>
    </div>
  );
}
