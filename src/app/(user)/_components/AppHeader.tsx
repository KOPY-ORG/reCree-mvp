import Link from "next/link";
import { Globe, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export async function AppHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 h-14 bg-background border-b flex items-center justify-between px-4">
      <span className="font-bold text-lg tracking-tight">reCree</span>

      <div className="flex items-center gap-4">
        {/* 다국어 - Phase 3 */}
        <button
          disabled
          title="Coming Soon"
          className="text-muted-foreground/40 cursor-not-allowed"
        >
          <Globe className="size-5" />
        </button>

        {/* 프로필 / 로그인 */}
        <Link
          href={user ? "/profile" : "/login"}
          className="text-foreground hover:text-muted-foreground transition-colors"
        >
          <User className="size-5" />
        </Link>
      </div>
    </header>
  );
}
