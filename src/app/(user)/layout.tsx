import { AppHeader } from "./_components/AppHeader";
import { BottomNav } from "./_components/BottomNav";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 데스크탑: 회색 배경 + 중앙 모바일 프레임
    <div className="lg:min-h-screen lg:bg-zinc-200 lg:flex lg:items-start lg:justify-center lg:py-8">
      <div className="relative w-full max-w-[430px] min-h-screen bg-background lg:min-h-0 lg:h-[calc(100vh-4rem)] lg:rounded-[2.5rem] lg:overflow-hidden lg:shadow-2xl lg:ring-1 lg:ring-zinc-300 flex flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
