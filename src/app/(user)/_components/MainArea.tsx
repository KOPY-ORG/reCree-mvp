"use client";

import { usePathname } from "next/navigation";
import { isBottomNavHidden, isFullBleedScreen } from "@/lib/bottom-nav";

/**
 * 콘텐츠 영역. 탭바가 오버레이가 되면서 더 이상 main 을 밀어내지 않으므로
 * 여기서 하단 여백을 대신 잡아준다.
 *
 * 여백은 세 갈래다.
 *   탭바 있음        → var(--bottom-nav-space) 만큼 비운다
 *   탭바 숨김        → 0. 안 그러면 아래가 이유 없이 비어 보인다
 *   자기 높이 관리   → 0. 지도가 100dvh 를 그대로 쓰고 안쪽에서 알아서 비킨다
 *
 * children 은 서버 컴포넌트 그대로 흘러간다 — 이 파일이 client 여도 경계는 여기서 끝난다.
 */
export function MainArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reserve = !isBottomNavHidden(pathname) && !isFullBleedScreen(pathname);

  return (
    <main
      className="w-full flex-1 overflow-x-hidden"
      style={reserve ? { paddingBottom: "var(--bottom-nav-space)" } : undefined}
    >
      {children}
    </main>
  );
}
