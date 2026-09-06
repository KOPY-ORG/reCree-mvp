"use client";

import { useRef, useState, useEffect } from "react";
import { useSheetDrag } from "@/app/(user)/_hooks/useSheetDrag";
import { BOTTOM_NAV_SPACE } from "@/lib/bottom-nav";

export type PlaceListSheetState = "hidden" | "tab-only" | "half" | "full";

const DRAGGABLE_STATES = ["tab-only", "half", "full"] as const;
type DraggableState = (typeof DRAGGABLE_STATES)[number];

// searchbar(60px) + facet 칩(~27px) + pb-2(8px) + 1px buffer
const FULL_TOP_WITH_FACETS = 96;

/**
 * 시트는 탭바 위에 앉는다 (bottom = var(--bottom-nav-space)).
 * 그래서 남는 세로 공간도 100dvh 에서 같은 값을 뺀 만큼이다.
 */
export function getSheetHeight(state: PlaceListSheetState, tabOnlyH: number, fullTop: number): string {
  if (state === "hidden") return "0px";
  if (state === "tab-only") return `${tabOnlyH}px`;
  if (state === "half") return `calc((100dvh - var(--bottom-nav-space)) * 0.5)`;
  return `calc(100dvh - var(--bottom-nav-space) - ${fullTop}px)`;
}

interface Props {
  state: PlaceListSheetState;
  onStateChange: (state: PlaceListSheetState) => void;
  topOffset?: number;
  hasActiveFacets?: boolean;
  header?: React.ReactNode;
  children?: React.ReactNode;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export function PlaceListSheet({ state, onStateChange, topOffset = 24, hasActiveFacets = false, header, children, scrollContainerRef }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // 핸들 + 헤더의 실제 렌더 높이를 측정 — TAB_ONLY_H 하드코딩 제거
  const [tabOnlyH, setTabOnlyH] = useState(80);

  useEffect(() => {
    const update = () => {
      const h =
        (handleRef.current?.offsetHeight ?? 0) +
        (headerRef.current?.offsetHeight ?? 0);
      if (h > 0) setTabOnlyH(h);
    };
    update();
    const observer = new ResizeObserver(update);
    if (handleRef.current) observer.observe(handleRef.current);
    if (headerRef.current) observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, []);

  const fullTop = hasActiveFacets ? FULL_TOP_WITH_FACETS : topOffset;

  // 스냅 임계값은 safe-area 를 뺀 근사를 쓴다. 실제로 그려지는 높이는 위 CSS 변수라
  // 기기에서 정확하고, 여기 몇십 px 차이는 "어느 상태로 붙일지" 판정만 바꾼다.
  function getSnapHeights() {
    return [
      tabOnlyH,
      Math.round((window.innerHeight - BOTTOM_NAV_SPACE) * 0.5),
      window.innerHeight - BOTTOM_NAV_SPACE - fullTop,
    ];
  }

  const { isDragging, dragHandlers } = useSheetDrag<DraggableState>({
    sheetRef,
    stateOrder: DRAGGABLE_STATES,
    getSnapHeights,
    currentState: state === "hidden" ? "tab-only" : state,
    onStateChange,
  });

  const sheetStyle: React.CSSProperties = {
    height: getSheetHeight(state, tabOnlyH, fullTop),
    transition: isDragging ? "none" : "height 300ms ease",
  };

  return (
    // 지도는 100dvh 전체를 쓰고 탭바가 그 위에 뜬다. 시트는 탭바 위에 앉는다 —
    // bottom-0 이면 tab-only(80px) 상태가 통째로 탭바에 가린다.
    <div
      ref={sheetRef}
      className="absolute inset-x-0 bottom-[var(--bottom-nav-space)] z-40 bg-white rounded-t-[2rem] flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.18)] overflow-hidden"
      style={sheetStyle}
    >
      {/* 드래그 핸들 */}
      {state !== "hidden" && (
        <div
          ref={handleRef}
          {...dragHandlers}
          className="shrink-0 flex justify-center items-center bg-white"
          style={{ height: 44, touchAction: "none" }}
        >
          <div className="w-14 h-1 rounded-full bg-muted-foreground/30" />
        </div>
      )}

      {/* header slot */}
      {state !== "hidden" && header && (
        <div ref={headerRef} className="shrink-0">{header}</div>
      )}

      {/* 콘텐츠 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {children}
        {/* 콘텐츠 끝 드래그 spacer */}
        {state !== "hidden" && (
          <div
            {...dragHandlers}
            className="w-full h-16"
            style={{ touchAction: "none" }}
          />
        )}
      </div>
    </div>
  );
}
