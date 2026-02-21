import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // 비로그인 또는 USER role → 홈으로 리다이렉트
  if (!user || user.role === "USER") {
    redirect("/");
  }

  return (
    <div>
      <header className="flex items-center justify-between px-6 py-3 border-b">
        <span className="font-semibold text-sm">어드민</span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            로그아웃
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
