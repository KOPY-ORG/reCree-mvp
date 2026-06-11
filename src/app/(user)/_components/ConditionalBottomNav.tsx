"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

interface Props {
  isLoggedIn: boolean;
  profileImageUrl: string | null;
}

export function ConditionalBottomNav({ isLoggedIn, profileImageUrl }: Props) {
  const pathname = usePathname();
  if (
    pathname.startsWith("/recreeshot/") ||
    pathname.endsWith("/edit") ||
    pathname.startsWith("/policy/") ||
    pathname === "/onboarding"
  ) return null;
  return <BottomNav isLoggedIn={isLoggedIn} profileImageUrl={profileImageUrl} />;
}
