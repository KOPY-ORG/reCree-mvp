import { AppHeader } from "./_components/AppHeader";
import { BottomNav } from "./_components/BottomNav";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 w-full">{children}</main>
      <div className="lg:hidden sticky bottom-0 z-40">
        <BottomNav />
      </div>
    </div>
  );
}
