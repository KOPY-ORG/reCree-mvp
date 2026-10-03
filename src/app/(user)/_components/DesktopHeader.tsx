"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Heart, LogOut, Search, User } from "lucide-react";
import { CameraIcon, HomeIcon, MapIcon, RouteIcon, ShopIcon } from "@/components/icons";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/auth";
import { isDesktopHeaderHidden, isNavActive } from "@/lib/bottom-nav";

/**
 * PC(lg+) 상단 바. 모바일 하단 알약(BottomNav)은 lg 에서 숨고 이 바가 그 자리를 맡는다.
 *
 * 왼쪽: 로고 + 글자 메뉴. 지금 화면은 검정 굵은 글자 + 바 아래 끝의 검정 밑줄(2px)로 말한다.
 * 라임은 쓰지 않는다 — 페이지 안의 선택 칩(라임)과 같은 표시로 읽히지 않게.
 * 오른쪽: 검색 · 계정. 계정 메뉴는 Radix DropdownMenu 라 화살표 이동 · Esc 닫기 · 버튼으로 포커스 복귀가 기본이다.
 *
 * 안쪽 좌우 끝선은 wide 본문과 같다 (--app-col-w 기둥 + --page-gutter).
 * data-desktop-header 가 있으면 --top-nav-space 가 64 가 된다 (globals.css).
 */
type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

// 경로 이름과 화면 내용이 어긋나 있다 — /feed 가 홈이고 /discover 가 지도다 (BottomNav 와 같다)
const ITEMS: readonly Item[] = [
  { href: "/feed", label: "Home", Icon: HomeIcon },
  { href: "/discover", label: "Map", Icon: MapIcon },
  { href: "/journeys", label: "Journeys", Icon: RouteIcon },
  { href: "/recreeshot", label: "recreeshots", Icon: CameraIcon },
  { href: "/shop", label: "Shop", Icon: ShopIcon },
];

const ACCOUNT_ITEMS = [
  { href: "/profile", label: "Profile", Icon: User },
  { href: "/saved", label: "Saved", Icon: Bookmark },
  { href: "/profile/following", label: "Following", Icon: Heart },
] as const;

const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2";

export function DesktopHeader({
  isLoggedIn,
  profileImageUrl,
}: {
  isLoggedIn: boolean;
  profileImageUrl: string | null;
}) {
  const pathname = usePathname();
  const isActive = (href: string) => isNavActive(pathname, href);

  if (isDesktopHeaderHidden(pathname)) return null;

  return (
    <header
      data-desktop-header
      className="fixed inset-x-0 top-0 z-40 hidden h-[var(--top-nav-space)] bg-background/95 shadow-[0_1px_4px_rgba(0,0,0,0.07)] backdrop-blur-sm lg:block"
    >
      <div className="mx-auto flex h-full max-w-[var(--app-col-w)] items-center gap-8 px-[var(--page-gutter)]">
        <Link href="/feed" className={`rounded-md text-xl font-bold tracking-tight ${FOCUS}`}>
          reCree
        </Link>

        <nav aria-label="Main" className="h-full">
          <ul className="flex h-full items-center gap-6">
            {ITEMS.map(({ href, label, Icon }) => {
              const active = isActive(href);
              return (
                <li key={href} className="h-full">
                  {/* 칸은 바 높이 전체 — 밑줄이 바 아래 끝선에 붙는다. 포커스 링은 칸 안쪽에 그린다 */}
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-full items-center gap-1.5 rounded-md px-1 text-[15px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground active:opacity-70 ${
                      active ? "font-bold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon size={18} className="size-[18px] shrink-0" />
                    {label}
                    {active && <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* 홈 검색창과 같은 입구다 — 검색 결과 화면이 생기기 전까지 지도로 보낸다 (HomeSearchBar) */}
          <Link
            href="/discover"
            aria-label="Search"
            className={`flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground active:opacity-70 ${FOCUS}`}
          >
            <Search className="size-5" />
          </Link>

          {isLoggedIn ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className={`flex size-10 items-center justify-center rounded-full transition-opacity active:opacity-70 ${FOCUS}`}
              >
                <UserAvatar imageUrl={profileImageUrl} size={32} />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="min-w-52 rounded-2xl border-0 p-1.5 shadow-float"
              >
                {ACCOUNT_ITEMS.map(({ href, label, Icon }) => (
                  <DropdownMenuItem key={href} asChild className="cursor-pointer rounded-xl px-3 py-2.5 text-[15px]">
                    <Link href={href}>
                      <Icon />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="mx-1.5 bg-secondary" />
                <form action={signOut}>
                  <DropdownMenuItem asChild className="w-full cursor-pointer rounded-xl px-3 py-2.5 text-[15px]">
                    <button type="submit">
                      <LogOut />
                      Log out
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/login"
              className={`flex h-10 items-center rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-opacity duration-150 hover:opacity-85 active:opacity-70 ${FOCUS}`}
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
