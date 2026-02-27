import Link from "next/link";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import { AdminSidebar } from "./_components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // 비로그인 → 로그인 페이지로
  if (!user) {
    redirect("/login");
  }

  // USER role → 접근 권한 없음 페이지
  if (user.role === "USER") {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-sm px-6">
          <div className="size-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <span className="text-2xl">🔒</span>
          </div>
          <div>
            <h1 className="text-lg font-semibold">접근 권한이 없습니다</h1>
            <p className="text-sm text-muted-foreground mt-1">
              이 페이지는 관리자(EDITOR/ADMIN)만 접근할 수 있습니다.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-brand text-brand-foreground hover:opacity-90 transition-opacity"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const userInitial = (user.nickname ?? user.email)[0].toUpperCase();

  return (
    <>
      <Toaster richColors position="top-right" />
      {/* 모바일: 데스크탑 접속 안내 */}
      <div className="flex lg:hidden h-screen items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <p className="text-base font-semibold">데스크탑에서 접속해주세요</p>
          <p className="text-sm text-muted-foreground">
            관리자 페이지는 데스크탑 환경(1024px 이상)에서만 이용 가능합니다.
          </p>
        </div>
      </div>

      {/* 데스크탑: 사이드바 + 콘텐츠 */}
      <div className="hidden lg:fixed lg:inset-0 lg:flex overflow-hidden">
        <AdminSidebar userEmail={user.email} userInitial={userInitial} />
        <main className="flex-1 overflow-y-auto bg-zinc-100">
          {children}
        </main>
      </div>
    </>
  );
}
