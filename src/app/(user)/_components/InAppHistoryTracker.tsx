"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { IN_APP_NAV_KEY } from "@/lib/in-app-history";

// 이 탭에서 앱 안 이동이 있었는지를 적는다 (src/lib/in-app-history.ts).
// 처음 그려질 때(= 전체 로드) 지우고, 그 뒤 경로가 바뀌면 켠다
export function InAppHistoryTracker() {
  const pathname = usePathname();
  const first = useRef<string | null>(null);

  useEffect(() => {
    try {
      if (first.current === null) {
        first.current = pathname;
        sessionStorage.removeItem(IN_APP_NAV_KEY);
      } else if (pathname !== first.current) {
        sessionStorage.setItem(IN_APP_NAV_KEY, "1");
      }
    } catch {
      // 저장소를 못 쓰는 환경 — 뒤로가기는 리퍼러로만 판정된다
    }
  }, [pathname]);

  return null;
}
