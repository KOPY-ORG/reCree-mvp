import Link from "next/link";
import { Search, LayoutGrid } from "lucide-react";
// import { LanguageSelector } from "./LanguageSelector";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Discover", href: "/discover" },
  { label: "Saved", href: "/saved" },
];

export function AppHeader() {
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

        {/* 오른쪽: 검색 + 언어 */}
        <div className="flex items-center gap-1">
          {/* 모바일 Topics 아이콘 */}
          <Link
            href="/topics"
            className="lg:hidden text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center size-8"
          >
            <LayoutGrid className="size-5" />
          </Link>

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
        </div>
      </div>
    </header>
  );
}
