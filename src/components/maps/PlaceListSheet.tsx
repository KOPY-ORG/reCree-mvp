"use client";

import { useRef, useState, useEffect } from "react";
import { useSheetDrag } from "@/app/(user)/_hooks/useSheetDrag";

export type PlaceListSheetState = "hidden" | "tab-only" | "half" | "full";

const DRAGGABLE_STATES = ["tab-only", "half", "full"] as const;
type DraggableState = (typeof DRAGGABLE_STATES)[number];

const BOTTOM_NAV_H = 64;
// searchbar(60px) + facet 칩(~27px) + pb-2(8px) + 1px buffer
const FULL_TOP_WITH_FACETS = 96;

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

  function getSnapHeights() {
    return [
      tabOnlyH,
      Math.round((window.innerHeight - BOTTOM_NAV_H) * 0.5),
      window.innerHeight - BOTTOM_NAV_H - fullTop,
    ];
  }

  const { isDragging, dragHandlers } = useSheetDrag<DraggableState>({
    sheetRef,
    stateOrder: DRAGGABLE_STATES,
    getSnapHeights,
    currentState: state === "hidden" ? "tab-only" : state,
    onStateChange,
  });

  const sheetStyle: React.CSSProperties =
    state === "hidden"
      ? { height: 0, transition: "height 300ms ease" }
      : {
          height:
            state === "tab-only"
              ? `${tabOnlyH}px`
              : state === "half"
              ? `calc((100dvh - ${BOTTOM_NAV_H}px) * 0.5)`
              : `calc(100dvh - ${BOTTOM_NAV_H}px - ${fullTop}px)`,
          transition: isDragging ? "none" : "height 300ms ease",
        };

  return (
    <div
      ref={sheetRef}
      className="absolute inset-x-0 bottom-0 z-40 bg-white rounded-t-[2rem] flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.18)] overflow-hidden"
      style={sheetStyle}
    >
      {/* 드래그 핸들 */}
      {state !== "hidden" && (
        <div
          ref={handleRef}
          {...dragHandlers}
          className="shrink-0 flex justify-center items-center bg-white"
          style={{ height: 28, touchAction: "none" }}
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
