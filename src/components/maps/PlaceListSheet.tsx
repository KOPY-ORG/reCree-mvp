"use client";

import { useRef, useState, useEffect } from "react";
import { useSheetDrag } from "@/app/(user)/_hooks/useSheetDrag";
import { bottomNavSpace, setBottomNavTucked } from "@/lib/bottom-nav";

export type PlaceListSheetState = "hidden" | "tab-only" | "half" | "full";

const DRAGGABLE_STATES = ["tab-only", "half", "full"] as const;
type DraggableState = (typeof DRAGGABLE_STATES)[number];

// searchbar(60px) + facet 칩(~27px) + pb-2(8px) + 1px buffer
const FULL_TOP_WITH_FACETS = 96;

/**
 * 시트는 화면 바닥까지 내려가고 탭바가 그 위에 뜬다 (시안 Home_Map_View).
 * 그래서 세 상태 모두 탭바가 먹는 만큼을 높이에 더한다 — 윗변 위치는 그대로고
 * 아래로만 늘어난다. 탭바에 가리지 않는 건 안쪽 스크롤 영역의 하단 여백이 맡는다.
 */
export function getSheetHeight(state: PlaceListSheetState, tabOnlyH: number, fullTop: number): string {
  if (state === "hidden") return "0px";
  // 핸들 + 헤더가 탭바 위로 올라오도록 그만큼 더 키운다
  if (state === "tab-only") return `calc(${tabOnlyH}px + var(--bottom-nav-space))`;
  if (state === "half") return `calc((100dvh - var(--bottom-nav-space)) * 0.5 + var(--bottom-nav-space))`;
  return `calc(100dvh - ${fullTop}px)`;
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
    // state 에 걸어야 한다 — hidden 으로 마운트되면(?place= 로 들어온 경우) 핸들·헤더가
    // 아직 없어 ref 가 null 이고, 빈 의존성이면 그 뒤로 영영 측정하지 않아 80 에 머문다.
  }, [state]);

  const fullTop = hasActiveFacets ? FULL_TOP_WITH_FACETS : topOffset;

  // getSheetHeight 와 같은 식이어야 드래그를 놓은 자리와 붙는 자리가 어긋나지 않는다.
  // safe-area 는 빠진 근사다 — 그려지는 높이는 CSS 변수라 기기에서 정확하고,
  // 여기 몇십 px 차이는 "어느 상태로 붙일지" 판정만 바꾼다.
  function getSnapHeights() {
    const navSpace = bottomNavSpace();
    return [
      tabOnlyH + navSpace,
      Math.round((window.innerHeight - navSpace) * 0.5) + navSpace,
      window.innerHeight - fullTop,
    ];
  }

  // 시트를 끝까지(full) 올렸을 때만 탭바가 물러난다. 그때는 시트가 화면 전체를
  // 대신하므로 알약 두 개가 리스트 위에 얹힌 군더더기가 된다.
  // half 는 지도와 리스트를 같이 보는 상태라 탭바가 그대로 있어야 한다.
  //
  // 드래그를 손가락 위치에 비례해 따라가게 하지 않는다 — 탭바는 시트의 일부가 아니라
  // 뒤에 있는 화면의 것이라, 붙어 움직이면 시트에 매달린 것처럼 보인다.
  // 대신 임계를 넘는 순간 한 번에 바뀌되 놓기 전에 바뀐다. 임계는 스냅이 쓰는
  // 경계(half 와 full 의 중간)와 같아서, 드래그 중에 본 결과가 놓았을 때 그대로 남는다.
  function tuckForHeight(h: number) {
    const [, halfH, fullH] = getSnapHeights();
    setBottomNavTucked(h >= (halfH + fullH) / 2);
  }

  useEffect(() => {
    setBottomNavTucked(state === "full");
  }, [state]);

  // 지도를 떠날 때 탭바를 반드시 되돌린다 — 속성은 <html> 에 있어서 화면이 바뀌어도 남는다
  useEffect(() => () => setBottomNavTucked(false), []);

  const { isDragging, dragHandlers } = useSheetDrag<DraggableState>({
    sheetRef,
    stateOrder: DRAGGABLE_STATES,
    getSnapHeights,
    currentState: state === "hidden" ? "tab-only" : state,
    onStateChange,
    onDragMove: tuckForHeight,
  });

  // 높이는 인라인 그대로 둔다 — useSheetDrag 가 드래그 중 style.height 를 직접 쓰고,
  // 놓은 뒤 React 가 이 값으로 되돌리는 구조라 CSS 변수로 옮기면 드래그 높이가 남는다.
  // lg 는 아래 lg:h-auto! (important) 가 인라인을 이긴다.
  const sheetStyle: React.CSSProperties = {
    height: getSheetHeight(state, tabOnlyH, fullTop),
    transition: isDragging ? "none" : "height 300ms ease",
  };

  return (
    // 시트는 화면 바닥까지 내려간다. 탭바는 시트 위에 뜨고,
    // 가려지지 않게 하는 건 아래 스크롤 영역의 padding-bottom 이다.
    //
    // lg: 왼쪽 패널 — 검색바 · 토픽 칩 · facet 줄(~136) 아래부터 바닥까지. 모바일 full 상태처럼 facet 자리를 늘 비워 둔다. 드래그할 것이 없어 핸들을 치운다.
    // hidden(장소 선택 중)은 모바일에서 높이 0 으로 사라지는데 lg 는 top/bottom 으로 높이가 서므로 따로 감춘다.
    <div
      ref={sheetRef}
      className={`absolute inset-x-0 bottom-0 z-40 bg-white rounded-t-[2rem] flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.18)] overflow-hidden lg:right-auto lg:top-[136px] lg:h-auto! lg:w-[var(--discover-panel-w)] lg:rounded-none lg:shadow-none ${state === "hidden" ? "lg:hidden" : ""}`}
      style={sheetStyle}
    >
      {/* 드래그 핸들 */}
      {state !== "hidden" && (
        <div
          ref={handleRef}
          {...dragHandlers}
          className="shrink-0 flex justify-center items-center bg-white lg:hidden"
          style={{ height: 44, touchAction: "none" }}
        >
          <div className="w-14 h-1 rounded-full bg-muted-foreground/30" />
        </div>
      )}

      {/* header slot */}
      {state !== "hidden" && header && (
        <div ref={headerRef} className="shrink-0">{header}</div>
      )}

      {/* 콘텐츠 — 시트가 바닥까지 내려가므로 마지막 줄이 탭바에 가리지 않게 여기서 비운다.
          탭바가 물러난 상태(full)에서는 --sheet-scroll-pb 가 알아서 줄어든다 */}
      {/* lg:@container — 목록의 2열 전환을 패널 폭으로 가르는 기준 (ExploreMapView) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto lg:@container"
        style={{ paddingBottom: "var(--sheet-scroll-pb)" }}
      >
        {children}
        {/* 콘텐츠 끝 드래그 spacer */}
        {state !== "hidden" && (
          <div
            {...dragHandlers}
            className="w-full h-16 lg:hidden"
            style={{ touchAction: "none" }}
          />
        )}
      </div>
    </div>
  );
}
