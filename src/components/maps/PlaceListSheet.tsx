"use client";

import { useRef } from "react";
import { useSheetDrag } from "@/app/(user)/_hooks/useSheetDrag";

export type PlaceListSheetState = "hidden" | "tab-only" | "half" | "full";

const DRAGGABLE_STATES = ["tab-only", "half", "full"] as const;
type DraggableState = (typeof DRAGGABLE_STATES)[number];

const TAB_ONLY_H = 60;
const BOTTOM_NAV_H = 64;

interface Props {
  state: PlaceListSheetState;
  onStateChange: (state: PlaceListSheetState) => void;
  topOffset?: number;
  header?: React.ReactNode;
  children?: React.ReactNode;
}

export function PlaceListSheet({ state, onStateChange, topOffset = 24, header, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);

  function getSnapHeights() {
    return [
      TAB_ONLY_H,
      Math.round((window.innerHeight - BOTTOM_NAV_H) * 0.5),
      window.innerHeight - BOTTOM_NAV_H - topOffset,
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
              ? `${TAB_ONLY_H}px`
              : state === "half"
              ? `calc((100dvh - ${BOTTOM_NAV_H}px) * 0.5)`
              : `calc(100dvh - ${BOTTOM_NAV_H}px - ${topOffset}px)`,
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
          {...dragHandlers}
          className="shrink-0 flex justify-center items-center bg-white"
          style={{ height: 32, touchAction: "none" }}
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
        </div>
      )}

      {/* header slot */}
      {state !== "hidden" && header && (
        <div className="shrink-0">{header}</div>
      )}

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
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
