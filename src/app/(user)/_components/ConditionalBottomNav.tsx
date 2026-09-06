"use client";

import { usePathname } from "next/navigation";
import { isBottomNavHidden } from "@/lib/bottom-nav";
import { BottomNav } from "./BottomNav";

interface Props {
  isLoggedIn: boolean;
  profileImageUrl: string | null;
}

export function ConditionalBottomNav({ isLoggedIn, profileImageUrl }: Props) {
  const pathname = usePathname();
  // 숨김 조건은 MainArea 의 하단 여백과 같은 판정을 써야 한다 — bottom-nav.ts 참고
  if (isBottomNavHidden(pathname)) return null;
  return <BottomNav isLoggedIn={isLoggedIn} profileImageUrl={profileImageUrl} />;
}
