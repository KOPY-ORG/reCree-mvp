"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, Map, Camera, User } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";

const TABS = [
  { label: "Discover",   icon: Search,   href: "/feed" },
  { label: "Shop",       icon: ShoppingBag, href: "/shop" },
  { label: "Home",       icon: Map,      href: "/discover" },
  { label: "recreeshot", icon: Camera,   href: "/recreeshot" },
  { label: "Profile",    icon: User,     href: "/profile" },
] as const;

interface Props {
  isLoggedIn: boolean;
  profileImageUrl: string | null;
}


export function BottomNav({ isLoggedIn, profileImageUrl }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="shrink-0 h-16 bg-background border-t border-border/30 flex items-center z-40">
      {TABS.map(({ label, icon: Icon, href }) => {
        const active = isActive(href);
        const isMe = href === "/profile";

        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 group active:scale-95 transition-all"
          >
            <div className="relative flex flex-col items-center">
              {isMe ? (
                isLoggedIn ? (
                  <UserAvatar
                    imageUrl={profileImageUrl}
                    size={24}
                    className={active ? "ring-2 ring-foreground ring-offset-1" : ""}
                  />
                ) : (
                  <User
                    className={`size-5 transition-colors ${
                      active ? "text-foreground" : "text-muted-foreground/50"
                    }`}
                  />
                )
              ) : (
                <Icon
                  className={`size-5 transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                />
              )}
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
