"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Compass, House, Map, Bookmark } from "lucide-react";

const TABS = [
  { label: "Category", icon: LayoutGrid, href: "/category" },
  { label: "Explore", icon: Compass, href: "/explore" },
  { label: "Home", icon: House, href: "/" },
  { label: "My Trip", icon: Map, href: "/my-trip" },
  { label: "Saved", icon: Bookmark, href: "/saved" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="shrink-0 h-16 bg-background border-t flex items-center z-40">
      {TABS.map(({ label, icon: Icon, href }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 group"
          >
            <div className="relative flex flex-col items-center">
              {/* 활성 인디케이터 */}
              {active && (
                <span className="absolute -top-1.5 w-5 h-0.5 rounded-full bg-brand" />
              )}
              <Icon
                className={`size-5 transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground/50"
                }`}
              />
            </div>
            <span
              className={`text-[10px] font-medium transition-colors ${
                active ? "text-foreground" : "text-muted-foreground/50"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
