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

const CONTENT_MENUS = [
  { label: "대시보드", icon: LayoutDashboard, href: "/admin" },
  { label: "포스트 관리", icon: FileText, href: "/admin/posts" },
  { label: "장소 관리", icon: MapPin, href: "/admin/places" },
] as const;

const TAXONOMY_MENUS = [
  { label: "분류 관리", icon: Tag, href: "/admin/categories" },
] as const;

const TOOLS_MENUS = [
  { label: "시트 가져오기", icon: Download, href: "/admin/import" },
] as const;

const COMING_SOON_MENUS = [
  { label: "검수", icon: ClipboardCheck, phase: "Phase 3" },
  { label: "홈 큐레이션", icon: Home, phase: "Phase 2" },
  { label: "reCreeshot 관리", icon: Camera, phase: "Phase 2" },
  { label: "사용자 관리", icon: Users, phase: "Phase 3" },
] as const;

interface AdminSidebarProps {
  userEmail: string;
  userInitial: string;
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] uppercase tracking-widest text-zinc-600 font-medium">
      {label}
    </p>
  );
}

export function AdminSidebar({ userEmail, userInitial }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <aside className="w-60 h-screen flex flex-col bg-zinc-950 shrink-0">
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="size-6 rounded bg-brand shrink-0" />
          <p className="font-bold text-sm tracking-tight text-white">
            reCree Admin
          </p>
        </div>
        <p className="text-[11px] text-zinc-600 mt-1 ml-[34px]">
          Content Management
        </p>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
        {/* CONTENT 섹션 */}
        <SectionLabel label="Content" />
        <div className="space-y-0.5">
          {CONTENT_MENUS.map(({ label, icon: Icon, href }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(href)
                  ? "bg-brand text-brand-foreground"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>

        {/* TAXONOMY 섹션 */}
        <SectionLabel label="Taxonomy" />
        <div className="space-y-0.5">
          {TAXONOMY_MENUS.map(({ label, icon: Icon, href }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(href)
                  ? "bg-brand text-brand-foreground"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>

        {/* TOOLS 섹션 */}
        <SectionLabel label="Tools" />
        <div className="space-y-0.5">
          {TOOLS_MENUS.map(({ label, icon: Icon, href }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(href)
                  ? "bg-brand text-brand-foreground"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>

        {/* COMING SOON 섹션 */}
        <SectionLabel label="Coming Soon" />
        <div className="space-y-0.5">
          {COMING_SOON_MENUS.map(({ label, icon: Icon, phase }) => (
            <div key={label} className="relative group/tip">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium text-zinc-700 cursor-not-allowed select-none">
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{label}</span>
                <span className="text-[10px] text-zinc-700 font-normal">{phase}</span>
              </div>
              {/* Coming Soon 툴팁 */}
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 pointer-events-none opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150">
                <div className="bg-white text-zinc-800 text-[11px] font-medium px-2.5 py-1.5 rounded-md whitespace-nowrap shadow-lg">
                  Coming Soon · {phase}
                </div>
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* 사용자 정보 + 로그아웃 */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="size-7 rounded-full bg-brand flex items-center justify-center text-brand-foreground text-xs font-bold shrink-0">
            {userInitial}
          </div>
          <p className="text-xs text-zinc-400 truncate flex-1">{userEmail}</p>
          <form action={signOut}>
            <button
              type="submit"
              title="로그아웃"
              className="text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
