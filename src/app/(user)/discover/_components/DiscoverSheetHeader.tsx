"use client";

import {
  X,
  Flame,
  List as ListIcon,
  Utensils,
  Coffee,
  Martini,
  Landmark,
  Sparkles,
  Ticket,
  ShoppingBag,
  BedDouble,
  type LucideIcon,
} from "lucide-react";
import {
  PLACE_CATEGORY_CHIPS,
  PLACE_CATEGORY_CHIP_LABELS,
  type PlaceCategoryChip,
} from "@/lib/place-types";

/**
 * 칩 줄이 헤더에 더하는 높이 — h-9(36) + pb-3(12).
 * ExploreMapView 의 FAB 위치 근사가 같은 값을 쓴다. 시트 자체는 실측이라 이 값을 안 본다.
 */
export const CATEGORY_CHIP_ROW_HEIGHT = 48;

/**
 * 칩 아이콘. 배지 색(PLACE_CATEGORY_COLORS)과 상관없이 중립이다 —
 * 카테고리 색은 배지 전용이고, 칩은 고른 것/안 고른 것만 구분한다.
 */
const CATEGORY_CHIP_ICONS: Record<PlaceCategoryChip, LucideIcon> = {
  EAT: Utensils,
  CAFE: Coffee,
  BAR: Martini,
  ATTRACTIONS: Landmark,
  K_CULTURE: Sparkles,
  EXPERIENCE: Ticket,
  SHOP: ShoppingBag,
  STAY: BedDouble,
};

interface DiscoverSheetHeaderProps {
  contentTab: "hot" | "list";
  onContentTabChange: (tab: "hot" | "list") => void;
  placeCount: number;
  isResultMode: boolean;
  isSavedView?: boolean;
  query: string;
  onExitResultMode: () => void;
  /** 기본 · 결과 · 저장 목록 보기에서 켠다 (이벤트 모드는 헤더 자체가 EventSheetHeader 다) */
  showCategoryChips?: boolean;
  /** 장소가 하나라도 있는 카테고리. 나머지는 접는다 — 누르면 늘 0곳인 칩을 세우지 않는다 */
  availablePlaceCategories?: ReadonlySet<PlaceCategoryChip>;
  placeCategory?: PlaceCategoryChip | null;
  onPlaceCategoryToggle?: (category: PlaceCategoryChip) => void;
}

export function DiscoverSheetHeader({
  contentTab,
  onContentTabChange,
  placeCount,
  isResultMode,
  isSavedView = false,
  query,
  onExitResultMode,
  showCategoryChips = false,
  availablePlaceCategories,
  placeCategory = null,
  onPlaceCategoryToggle,
}: DiscoverSheetHeaderProps) {
  // 저장 목록과 결과 모드가 같은 줄을 쓴다 — 한 곳이라 단수 처리도 한 번이면 된다
  const placeCountLabel = `${placeCount} ${placeCount === 1 ? "place" : "places"}`;

  // 카테고리만 걸리면 검색어가 없어 제목이 빈다 — 그때는 고른 칩 이름이 제목이다
  const resultTitle =
    query.trim() || (placeCategory ? PLACE_CATEGORY_CHIP_LABELS[placeCategory] : "");

  // 지금 고른 칩은 0곳이어도 선다 — URL 로 들어온 선택을 해제할 길이 있어야 한다.
  // 순서는 PLACE_CATEGORY_CHIPS 그대로라 칩이 접혀도 남은 칩의 자리는 안 바뀐다.
  const visibleCategories = PLACE_CATEGORY_CHIPS.filter(
    (category) =>
      category === placeCategory || (availablePlaceCategories?.has(category) ?? true)
  );

  return (
    <div>
      <div className={`flex items-center px-4 ${isResultMode || isSavedView ? "justify-between pt-2 pb-4" : "justify-center pt-1 pb-3"}`}>
        {isSavedView ? (
          <>
            <span className="text-lg font-semibold text-foreground">My Maps</span>
            <span className="text-sm text-muted-foreground">{placeCountLabel}</span>
          </>
        ) : isResultMode ? (
          <>
            <div className="flex items-center min-w-0">
              <span className="text-lg font-semibold text-foreground truncate">{resultTitle}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-muted-foreground">{placeCountLabel}</span>
              <button
                type="button"
                onClick={onExitResultMode}
                aria-label="Exit result mode"
                className="flex items-center justify-center bg-muted rounded-full p-1.5 text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="relative flex rounded-full bg-muted p-1 w-48">
            {/* 슬라이딩 인디케이터 */}
            <div
              className="absolute top-1 bottom-1 rounded-full bg-brand transition-transform duration-200 ease-out"
              style={{
                width: "calc(50% - 4px)",
                left: 4,
                transform: contentTab === "list" ? "translateX(100%)" : "translateX(0)",
              }}
            />
            <button
              type="button"
              onClick={() => onContentTabChange("hot")}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm font-semibold ${
                contentTab === "hot" ? "text-black" : "text-muted-foreground"
              }`}
            >
              <Flame className="w-4 h-4 shrink-0" />
              Hot
            </button>
            <button
              type="button"
              onClick={() => onContentTabChange("list")}
              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 text-sm font-semibold ${
                contentTab === "list" ? "text-black" : "text-muted-foreground"
              }`}
            >
              <ListIcon className="w-4 h-4 shrink-0" />
              List
            </button>
          </div>
        )}
      </div>

      {/* 카테고리 칩 — 필터를 어떻게 바꾸든 구성이 그대로다. 걸러서 0곳이 되어도 칩은
          남고 빈 상태 문구는 목록 자리에서 받는다. 좁은 폭에서는 가로로 밀린다 */}
      {showCategoryChips && visibleCategories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleCategories.map((category) => {
            const Icon = CATEGORY_CHIP_ICONS[category];
            const isSelected = placeCategory === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onPlaceCategoryToggle?.(category)}
                className={`shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors active:opacity-70 ${
                  isSelected ? "bg-foreground text-white" : "bg-muted text-foreground"
                }`}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.8} />
                {PLACE_CATEGORY_CHIP_LABELS[category]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
