"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, MapPin, Camera, Route, User } from "lucide-react";
import { useState } from "react";

const TABS = [
  { label: "Home", icon: House, href: "/" },
  { label: "Discover", icon: MapPin, href: "/explore" },
  { label: "Plan", icon: Route, href: "/plan" },
  { label: "recreeshot", icon: Camera, href: "/recreeshot" },
  { label: "Me", icon: User, href: "/profile" },
] as const;

interface Props {
  isLoggedIn: boolean;
  profileImageUrl: string | null;
}

function MeAvatar({
  isLoggedIn,
  profileImageUrl,
  active,
}: {
  isLoggedIn: boolean;
  profileImageUrl: string | null;
  active: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  if (isLoggedIn && profileImageUrl && !imgError) {
    return (
      <div
        className={`size-6 rounded-full overflow-hidden shrink-0 ${
          active ? "ring-2 ring-foreground ring-offset-1" : ""
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profileImageUrl}
          alt="Profile"
          className="size-6 object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <User
      className={`size-5 transition-colors ${
        active ? "text-foreground" : "text-muted-foreground/50"
      }`}
    />
  );
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
                <MeAvatar
                  isLoggedIn={isLoggedIn}
                  profileImageUrl={profileImageUrl}
                  active={active}
                />
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
