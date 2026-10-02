"use client";

import { usePathname } from "next/navigation";
import { isBottomNavHidden, isFullBleedScreen } from "@/lib/bottom-nav";

/**
 * 가로 넘침은 어느 화면에서나 잘라낸다. 자르는 방식만 갈린다.
 *
 * overflow-x: hidden 은 overflow-y 를 auto 로 만들어 main 을 스크롤 컨테이너로 바꾼다.
 * 그러면 그 안의 position: sticky 는 창이 아니라 main 의 스크롤에 붙는데,
 * main 은 내용만큼 자라 스스로 스크롤하는 일이 없으므로 영영 붙지 않는다.
 * overflow-x: clip 은 같은 자리를 잘라내면서 스크롤 컨테이너를 만들지 않는다.
 *
 * 전 화면을 clip 으로 바꾸면 /saved · /shop 의 탭바(sticky top-0 z-10)가 되살아나
 * 헤더(.app-header, z-40) 뒤로 숨는다. 그래서 상단 고정이 필요한 화면만 바꾼다.
 */
const STICKY_TOP_ROUTES = ["/feed"];

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
  const allowSticky = STICKY_TOP_ROUTES.includes(pathname);

  return (
    <main
      // lg 는 전 화면 clip — PC 배치의 sticky 사이드(홈 지도 카드 · 상세 미디어)가 붙어야 한다.
      // 모바일의 /saved · /shop 탭바 문제는 lg 에서 top 오프셋으로 따로 비킨다
      className={`w-full flex-1 ${allowSticky ? "overflow-x-clip" : "overflow-x-hidden lg:overflow-x-clip"}`}
      style={reserve ? { paddingBottom: "var(--bottom-nav-space)" } : undefined}
    >
      {children}
    </main>
  );
}
