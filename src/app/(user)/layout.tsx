import { AppHeader } from "./_components/AppHeader";
import { SavedHeader } from "./_components/SavedHeader";
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
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <ActivityTracker />
      <ConditionalHeader header={<AppHeader />} savedHeader={<SavedHeader />} />
      <main className="flex-1 w-full overflow-x-hidden">{children}</main>
      <div className="lg:hidden sticky bottom-0 z-40">
        <ConditionalBottomNav
          isLoggedIn={!!user}
          profileImageUrl={user?.profileImageUrl ?? null}
        />
      </div>
      <ScrollToTopButton />
    </div>
  );
}
