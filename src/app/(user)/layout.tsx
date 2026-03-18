import { AppHeader } from "./_components/AppHeader";
import { ExploreHeader } from "./_components/ExploreHeader";
import { SavedHeader } from "./_components/SavedHeader";
import { ConditionalHeader } from "./_components/ConditionalHeader";
import { ConditionalBottomNav } from "./_components/ConditionalBottomNav";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <ConditionalHeader header={<AppHeader />} exploreHeader={<ExploreHeader />} savedHeader={<SavedHeader />} />
      <main className="flex-1 w-full overflow-x-hidden">{children}</main>
      <div className="lg:hidden sticky bottom-0 z-40">
        <ConditionalBottomNav />
      </div>
    </div>
  );
}
