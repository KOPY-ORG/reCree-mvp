// 사용자 페이지 레이아웃 (모바일 최적화)
// TODO: 하단 탭 네비게이션(BottomNav), Header 추가

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen max-w-[430px] mx-auto">
      <main className="flex-1">{children}</main>
      {/* TODO: <BottomNav /> */}
    </div>
  );
}
