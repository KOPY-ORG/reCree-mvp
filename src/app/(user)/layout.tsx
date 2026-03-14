import { AppHeader } from "./_components/AppHeader";
import { SlimHeader } from "./_components/SlimHeader";
import { ConditionalHeader } from "./_components/ConditionalHeader";
import { ConditionalBottomNav } from "./_components/ConditionalBottomNav";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <ConditionalHeader
        fullHeader={<AppHeader />}
        slimHeader={<SlimHeader />}
      />
      <main className="flex-1 w-full">{children}</main>
      <div className="lg:hidden sticky bottom-0 z-40">
        <ConditionalBottomNav />
      </div>
    </div>
  );
}
