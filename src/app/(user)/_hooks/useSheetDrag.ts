"use client";

import { useEffect, useRef, useState } from "react";

interface UseSheetDragOptions<S extends string> {
  sheetRef: React.RefObject<HTMLDivElement | null>;
  stateOrder: readonly S[];
  getSnapHeights: () => number[];
  currentState: S;
  onStateChange: (state: S) => void;
}

/**
 * 바텀시트 드래그 로직 공통 훅.
 * 포인터 이벤트 핸들러, 속도 기반 플링, snap point 계산을 담당.
 */
export function useSheetDrag<S extends string>({
  sheetRef,
  stateOrder,
  getSnapHeights,
  currentState,
  onStateChange,
}: UseSheetDragOptions<S>) {
  const [isDragging, setIsDragging] = useState(false);

  // 최신 currentState를 핸들러 내부에서 읽기 위한 ref
  const currentStateRef = useRef(currentState);
  useEffect(() => {
    currentStateRef.current = currentState;
  }, [currentState]);

  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const isDraggingRef = useRef(false);
  const lastPointerY = useRef(0);
  const lastPointerTime = useRef(0);
  const velocityY = useRef(0);

  function onPointerDown(e: React.PointerEvent) {
    if (!sheetRef.current) return;
    dragStartY.current = e.clientY;
    dragStartHeight.current = sheetRef.current.getBoundingClientRect().height;
    isDraggingRef.current = true;
    lastPointerY.current = e.clientY;
    lastPointerTime.current = e.timeStamp;
    velocityY.current = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDraggingRef.current || !sheetRef.current) return;
    const newH = dragStartHeight.current - (e.clientY - dragStartY.current);
    const snapHeights = getSnapHeights();
    const minH = snapHeights[0];
    const maxH = snapHeights[snapHeights.length - 1];
    sheetRef.current.style.height = `${Math.max(minH, Math.min(newH, maxH))}px`;

    const dt = e.timeStamp - lastPointerTime.current;
    if (dt > 0) velocityY.current = (e.clientY - lastPointerY.current) / dt;
    lastPointerY.current = e.clientY;
    lastPointerTime.current = e.timeStamp;
  }

  function onPointerUp() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const FLICK_THRESHOLD = 0.5;
    const cur = stateOrder.indexOf(currentStateRef.current);
    let nextState: S;

    if (velocityY.current > FLICK_THRESHOLD) {
      nextState = stateOrder[Math.max(0, cur - 1)];
    } else if (velocityY.current < -FLICK_THRESHOLD) {
      nextState = stateOrder[Math.min(stateOrder.length - 1, cur + 1)];
    } else {
      const currentH = sheetRef.current?.getBoundingClientRect().height ?? 0;
      const snapHeights = getSnapHeights();
      const dists = snapHeights.map((h) => Math.abs(currentH - h));
      nextState = stateOrder[dists.indexOf(Math.min(...dists))];
    }

    setIsDragging(false);
    onStateChange(nextState);
  }

  /** 드래그가 실제로 발생했는지 (클릭 판별용) */
  function didDrag() {
    return Math.abs(dragStartY.current - lastPointerY.current) > 8;
  }

  const dragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
    style: { touchAction: "none" as const },
  };

  return { isDragging, dragHandlers, didDrag };
}
