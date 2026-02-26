"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  MapPin,
  Tag,
  Download,
  ClipboardCheck,
  Home,
  Camera,
  Users,
  LogOut,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";

const ACTIVE_MENUS = [
  { label: "대시보드", icon: LayoutDashboard, href: "/admin" },
  { label: "포스트 관리", icon: FileText, href: "/admin/posts" },
  { label: "장소 관리", icon: MapPin, href: "/admin/places" },
  { label: "분류 관리", icon: Tag, href: "/admin/categories" },
  { label: "시트 가져오기", icon: Download, href: "/admin/import" },
] as const;

const INACTIVE_MENUS = [
  { label: "검수", icon: ClipboardCheck, phase: "Phase 3" },
  { label: "홈 큐레이션", icon: Home, phase: "Phase 2" },
  { label: "reCreeshot 관리", icon: Camera, phase: "Phase 2" },
  { label: "사용자 관리", icon: Users, phase: "Phase 3" },
] as const;

interface AdminSidebarProps {
  userEmail: string;
  userInitial: string;
}

export function AdminSidebar({ userEmail, userInitial }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <aside className="w-60 h-screen flex flex-col border-r bg-background shrink-0">
      {/* 로고 */}
      <div className="px-5 py-5 border-b">
        <p className="font-bold text-sm tracking-tight">reCree Admin</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Content Management
        </p>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {ACTIVE_MENUS.map(({ label, icon: Icon, href }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isActive(href)
                ? "bg-brand text-brand-foreground"
                : "text-foreground hover:bg-muted"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}

        <div className="pt-2 mt-2 border-t space-y-0.5">
          {INACTIVE_MENUS.map(({ label, icon: Icon, phase }) => (
            <div key={label} className="relative group/tip">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground/50 cursor-not-allowed select-none">
                <Icon className="size-4 shrink-0" />
                <span>{label}</span>
              </div>
              {/* Coming Soon 툴팁 */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
                <div className="bg-foreground text-background text-[11px] font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-md">
                  Coming Soon · {phase}
                </div>
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* 사용자 정보 + 로그아웃 */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded-full bg-brand flex items-center justify-center text-brand-foreground text-xs font-bold shrink-0">
            {userInitial}
          </div>
          <p className="text-xs text-muted-foreground truncate flex-1">
            {userEmail}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              title="로그아웃"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
