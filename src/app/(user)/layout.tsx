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
      <main className="flex-1 w-full px-4 md:px-6 lg:px-10 xl:px-16">{children}</main>
      <div className="lg:hidden sticky bottom-0 z-40">
        <BottomNav />
      </div>
    </div>
  );
}
