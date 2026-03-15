"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, House, MapPin, Bookmark } from "lucide-react";

const TABS = [
  { label: "Category", icon: Menu, href: "/category" },
  { label: "Explore", icon: Search, href: "/explore" },
  { label: "Home", icon: House, href: "/" },
  { label: "My Map", icon: MapPin, href: "/my-map" },
  { label: "Saved", icon: Bookmark, href: "/saved" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="shrink-0 h-16 bg-background border-t border-border/30 flex items-center z-40">
      {TABS.map(({ label, icon: Icon, href }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 group active:scale-95 transition-all"
          >
            <div className="relative flex flex-col items-center">
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
