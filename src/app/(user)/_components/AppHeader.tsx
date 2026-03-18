import Link from "next/link";
import { User, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
// import { LanguageSelector } from "./LanguageSelector";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Category", href: "/category" },
  { label: "Explore", href: "/explore" },
  { label: "My Map", href: "/my-map" },
  { label: "Saved", href: "/saved" },
];

export async function AppHeader() {
  const user = await getCurrentUser();
  const initial = user?.email?.[0]?.toUpperCase() ?? null;

  return (
    <header className="app-header">
      <div className="h-12 flex items-center justify-between px-4 md:px-6 lg:px-10 xl:px-16">
        {/* 왼쪽: 로고 + 데스크탑 네비 */}
        <div className="flex items-center gap-6">
          <span className="font-bold text-base tracking-tight">reCree</span>

          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 오른쪽: 검색 + 언어 + 프로필 */}
        <div className="flex items-center gap-2">
          {/* 데스크탑 전용 검색 버튼 */}
          <Link
            href="/search"
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors text-sm"
          >
            <Search className="size-4" />
            <span>Search places...</span>
          </Link>

          {/* 다국어 선택 */}
          {/* <LanguageSelector /> */}

          {/* 프로필 / 로그인 */}
          <Link
            href={user ? "/profile" : "/login"}
            className="text-foreground hover:text-muted-foreground transition-colors"
          >
            {user ? (
              <div className="size-7 rounded-full bg-brand flex items-center justify-center text-xs font-semibold text-black overflow-hidden">
                {user.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profileImageUrl}
                    alt="Profile"
                    className="size-7 object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
            ) : (
              <User className="size-5 text-muted-foreground" />
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
