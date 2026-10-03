"use client";

import { useSyncExternalStore } from "react";
import { LG_QUERY as QUERY } from "@/lib/bottom-nav";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * lg(≥1024) 레이아웃인지 — 렌더 중에 읽는 판(isRailLayout 의 훅 버전).
 *
 * 배치는 전부 lg: 클래스가 맡고, 이 훅은 폭에 따라 "동작"이 갈리는 곳에만 쓴다.
 * 지금은 discover 의 장소 선택 하나다 — 모바일은 선택하면 목록 시트가 내려가고 카드가 뜨지만,
 * lg 는 목록이 옆 패널이라 그대로 두고 카드만 지도 위에 띄운다.
 *
 * 서버 · 첫 하이드레이션은 false(모바일)다. lg 에서 ?place= 로 들어오면 한 프레임 목록이
 * 감춰졌다가 돌아온다 — 그 경우 말고는 선택이 사용자 동작 뒤에만 생겨 차이가 없다.
 */
export function useRailLayout(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
