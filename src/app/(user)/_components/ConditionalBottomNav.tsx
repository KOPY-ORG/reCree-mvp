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
    // 코스 편집기의 create 진입점. endsWith("/edit") 가 못 잡는데, 제목 입력 후
    // /journeys/{id}/edit 로 replace 되므로 여기서 빼지 않으면 그 순간 탭바가 사라진다.
    pathname === "/journeys/new" ||
    pathname.startsWith("/policy/") ||
    pathname === "/onboarding"
  ) return null;
  return <BottomNav isLoggedIn={isLoggedIn} profileImageUrl={profileImageUrl} />;
}
