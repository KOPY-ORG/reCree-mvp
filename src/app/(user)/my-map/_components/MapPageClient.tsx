"use client";

import { useState, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSheetDrag } from "../_hooks/useSheetDrag";
import Image from "next/image";
import Link from "next/link";
import { Search, User, Star, AlignJustify, X, MapPin } from "lucide-react";
import { CloseButton } from "./CloseButton";
import type { MapPlace } from "@/lib/map-queries";
import type { TagGroupColorMap } from "@/lib/post-labels";
import { MapTopicFilterRow } from "./MapTopicFilterRow";
import { MapTagFilterRow } from "./MapTagFilterRow";
import { InteractiveMap } from "./InteractiveMap";
import { PlaceBottomSheet } from "./PlaceBottomSheet";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type Tab = "places" | "my-maps";
type SheetState = "collapsed" | "tab-only" | "peek" | "expanded";

type Level3Topic = {
  id: string; nameEn: string;
  colorHex: string | null; colorHex2: string | null;
  gradientDir: string; gradientStop: number; textColorHex: string | null;
};
type Level2Topic = Level3Topic & { children: Level3Topic[] };
type Level1Topic = Level3Topic & { children: Level2Topic[] };
type Level0Topic = Level3Topic & { children: Level1Topic[] };

type TagGroup = {
  group: string; nameEn: string;
  colorHex: string; colorHex2: string | null;
  gradientDir: string; gradientStop: number; textColorHex: string;
  tags: { id: string; name: string; colorHex: string | null; colorHex2?: string | null; textColorHex: string | null }[];
};

type TagGroupConfig = {
  group: string;
  colorHex: string; colorHex2: string | null;
  gradientDir: string; gradientStop: number; textColorHex: string;
};

interface Props {
  allPlaces: MapPlace[];
  savedPlaces: MapPlace[];
  savedPostIds: string[];
  topics: Level0Topic[];
  tagGroups: TagGroup[];
  tagGroupConfigs: TagGroupConfig[];
  isLoggedIn: boolean;
  userInitial: string | null;
  searchQuery: string;
  searchedPlaces: MapPlace[] | null;
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

type TopicNode = { id: string; parent?: TopicNode | null };
function isTopicMatch(topic: TopicNode, targetId: string): boolean {
  if (topic.id === targetId) return true;
  if (topic.parent) return isTopicMatch(topic.parent, targetId);
  return false;
}

// ─── 장소 리스트 아이템 ────────────────────────────────────────────────────────

function SearchResultItem({
  place,
  isSelected,
  onClick,
}: {
  place: MapPlace;
  isSelected: boolean;
  onClick: () => void;
}) {

  return (
    <div className={`border-b border-border/40 ${isSelected ? "bg-muted/40" : ""}`}>
      {/* 장소명 + 메타 — 클릭 시 PlaceBottomSheet */}
      <button
        onClick={onClick}
        className="w-full px-5 pt-4 pb-2 text-left active:bg-muted/30 transition-colors"
      >
        <p className="font-bold text-base leading-tight line-clamp-1">{place.nameEn}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {place.rating != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3 fill-muted-foreground stroke-muted-foreground" />
              {place.rating.toFixed(1)}
            </span>
          )}
          {place.posts.length > 0 && (
            <>
              {place.rating != null && <span className="text-xs text-muted-foreground">·</span>}
              <span className="text-xs text-muted-foreground">
                {place.posts.length} post{place.posts.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
          {place.area && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <MapPin className="size-2.5" />
                {place.area.nameEn ?? place.area.nameKo}
              </span>
            </>
          )}
        </div>
      </button>

      {/* 이미지 가로 슬라이드: 썸네일 → 장소 이미지 → 배너, 중복 제거 */}
      {(() => {
        const seen = new Set<string>();
        const dedup = (url: string) => {
          if (seen.has(url)) return false;
          seen.add(url);
          return true;
        };
        const thumbnails = place.posts.map((p) => p.imageUrl).filter(Boolean) as string[];
        const placeImgs = place.placeImages.map((img) => img.url);
        const banners = place.posts.flatMap((p) => p.images);
        const allImages = [
          ...thumbnails.filter(dedup),
          ...placeImgs.filter(dedup),
          ...banners.filter(dedup),
        ];
        if (allImages.length === 0) return null;
        return (
          <div className="flex gap-2.5 px-5 pb-4 overflow-x-auto scrollbar-hide">
            {allImages.map((url, i) => (
              <div key={i} className="size-[100px] shrink-0 rounded-xl overflow-hidden bg-muted relative">
                <Image
                  src={url}
                  alt={place.nameEn}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="88px"
                />
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const SHEET_TAB_ONLY_HEIGHT = 72;
const SHEET_EXPANDED_TOP_MARGIN = 56;

export function MapPageClient({
  allPlaces,
  savedPlaces,
  savedPostIds: savedPostIdsArr,
  topics,
  tagGroups,
  tagGroupConfigs,
  isLoggedIn,
  userInitial,
  searchQuery,
  searchedPlaces,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedPlaceId = searchParams.get("place");

  function setSelectedPlaceId(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("place", id);
    } else {
      params.delete("place");
    }
    router.replace(`?${params.toString()}`);
  }

  function clearSearch() {
    router.replace("/my-map");
  }

  const [activeTab, setActiveTab] = useState<Tab>("places");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedTagGroup, setSelectedTagGroup] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>(
    searchParams.get("place") ? "collapsed" : "peek"
  );
  const sheetRef = useRef<HTMLDivElement>(null);

  const savedPostIdsSet = useMemo(() => new Set(savedPostIdsArr), [savedPostIdsArr]);
  const tagGroupMap: TagGroupColorMap = useMemo(
    () => new Map(tagGroupConfigs.map((c) => [c.group, c])),
    [tagGroupConfigs]
  );

  const basePlaces = activeTab === "places" ? allPlaces : savedPlaces;

  const filteredPlaces = useMemo(() => {
    return basePlaces.filter((place) => {
      if (selectedTopicId) {
        const hasMatch = place.posts.some((post) =>
          post.topics.some((topic) => isTopicMatch(topic, selectedTopicId))
        );
        if (!hasMatch) return false;
      }
      if (selectedTagId) {
        const hasTag = place.posts.some((post) =>
          post.tags.some((tag) => tag.id === selectedTagId)
        );
        if (!hasTag) return false;
      } else if (selectedTagGroup) {
        const hasGroupTag = place.posts.some((post) =>
          post.tags.some((tag) => tag.group === selectedTagGroup)
        );
        if (!hasGroupTag) return false;
      }
      return true;
    });
  }, [basePlaces, selectedTopicId, selectedTagId, selectedTagGroup]);

  const isSearchMode = !!searchQuery && searchedPlaces !== null;
  const displayPlaces = isSearchMode ? (searchedPlaces ?? []) : filteredPlaces;

  const selectedPlace = displayPlaces.find((p) => p.id === selectedPlaceId) ?? null;

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setSheetState(tab === "my-maps" && !isLoggedIn ? "tab-only" : "peek");
    setSelectedPlaceId(null);
  }

  function handleTopicSelect(id: string | null) {
    setSelectedTopicId(id);
    setSheetState("peek");
    setSelectedPlaceId(null);
  }

  function handleTagSelect(tagId: string | null, tagGroup: string | null) {
    setSelectedTagId(tagId);
    setSelectedTagGroup(tagGroup);
    setSheetState("peek");
    setSelectedPlaceId(null);
  }

  function handleMarkerClick(placeId: string) {
    setSelectedPlaceId(placeId);
    setSheetState("collapsed");
  }

  function handleListItemClick(placeId: string) {
    setSelectedPlaceId(placeId);
    setSheetState("collapsed");
  }

  function handlePlaceClose() {
    setSelectedPlaceId(null);
    setSheetState(isSearchMode ? "peek" : "tab-only");
  }

  function cycleSheet() {
    setSheetState((s) => {
      if (s === "collapsed") return "peek";
      if (s === "tab-only") return "peek";
      if (s === "peek") return "expanded";
      return "peek"; // expanded → peek
    });
  }

  const LIST_SHEET_STATES = ["collapsed", "tab-only", "peek", "expanded"] as const;

  function getSnapHeights() {
    const containerH = window.innerHeight - 64;
    return [0, SHEET_TAB_ONLY_HEIGHT, Math.round(containerH * 0.4), containerH - SHEET_EXPANDED_TOP_MARGIN];
  }

  const { isDragging: isDraggingState, dragHandlers, didDrag } = useSheetDrag({
    sheetRef,
    stateOrder: LIST_SHEET_STATES,
    getSnapHeights,
    currentState: sheetState,
    onStateChange: setSheetState,
  });

  function handleHandleClick() {
    if (didDrag()) return;
    cycleSheet();
  }

  const sheetStyle: React.CSSProperties = {
    bottom: "0px",
    height:
      sheetState === "collapsed"
        ? "0px"
        : sheetState === "tab-only"
        ? `${SHEET_TAB_ONLY_HEIGHT}px`
        : sheetState === "peek"
        ? "calc((100dvh - 64px) * 0.4)"
        : `calc(100% - ${SHEET_EXPANDED_TOP_MARGIN}px)`,
    transition: isDraggingState ? "none" : "height 320ms cubic-bezier(0.32, 0.72, 0, 1)",
    overflow: "hidden",
  };

  const showLoginPrompt = activeTab === "my-maps" && !isLoggedIn;

  return (
    <>
      {/* 헤더 없음 — 전체 높이 = 100dvh - BottomNav(64px) */}
      <div className="relative h-[calc(100dvh-64px)] overflow-hidden">

        {/* ── 지도 (전체 배경) ── */}
        <InteractiveMap
          places={displayPlaces}
          selectedPlaceId={selectedPlaceId}
          highlightedIds={isSearchMode ? new Set(displayPlaces.map((p) => p.id)) : undefined}
          boundsKey={isSearchMode ? searchQuery : undefined}
          onMarkerClick={handleMarkerClick}
          className="absolute inset-0"
        />

        {/* ── 상단 플로팅: 검색바 + 프로필 + 필터 ── */}
        <div className="absolute top-0 inset-x-0 z-40 pt-3">
          {/* 검색바 + 프로필 */}
          <div className="flex items-center gap-2 px-4 mb-1">
            {isSearchMode ? (
              <div className="flex-1 flex items-center gap-2.5 bg-background rounded-full px-4 py-2.5 shadow-md">
                <Search className="size-4 text-muted-foreground shrink-0" />
                <Link
                  href={`/search?q=${encodeURIComponent(searchQuery)}`}
                  className="flex-1 text-sm truncate"
                >
                  {searchQuery}
                </Link>
                <button
                  onClick={clearSearch}
                  aria-label="검색 초기화"
                  className="shrink-0"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <Link
                href="/search"
                className="flex-1 flex items-center gap-2.5 bg-background rounded-full px-4 py-2.5 shadow-md"
              >
                <Search className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Search places</span>
              </Link>
            )}
            <Link
              href={isLoggedIn ? "/profile" : "/login"}
              className="flex items-center justify-center shrink-0 shadow-md rounded-full"
            >
              {userInitial ? (
                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center text-sm font-bold text-black">
                  {userInitial}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                  <User className="size-5 text-muted-foreground" />
                </div>
              )}
            </Link>
          </div>

          {/* 필터 행 — expanded 상태 또는 검색 모드에서는 숨김 */}
          {!isSearchMode && sheetState !== "expanded" && (
            <>
              <MapTopicFilterRow
                topics={topics}
                selectedTopicId={selectedTopicId}
                onSelect={handleTopicSelect}
              />
              <MapTagFilterRow
                tagGroups={tagGroups}
                selectedTagId={selectedTagId}
                selectedTagGroup={selectedTagGroup}
                onSelectTag={handleTagSelect}
              />
            </>
          )}
        </div>

        {/* ── 로그인 유도 오버레이 ── */}
        {showLoginPrompt && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
            <p className="font-semibold text-sm">Sign in to see your saved places</p>
            <Link
              href="/login"
              className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-semibold"
            >
              Sign In
            </Link>
          </div>
        )}

        {/* ── 장소 상세 바텀 시트 ── */}
        <PlaceBottomSheet
          place={selectedPlace}
          savedPostIds={savedPostIdsSet}
          tagGroupMap={tagGroupMap}
          onClose={handlePlaceClose}
        />

        {/* ── 바텀 시트 (리스트만) ── */}
        <div
          ref={sheetRef}
          className="absolute inset-x-0 z-20 bg-background rounded-t-[2rem] flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
          style={sheetStyle}
        >
          {/* 드래그 가능 헤더 영역 */}
          <div
            {...dragHandlers}
            className="shrink-0"
          >
            {/* 드래그 핸들 */}
            <button
              onClick={handleHandleClick}
              className="flex justify-center pt-2.5 pb-2 w-full"
              aria-label="목록 열기/닫기"
            >
              <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
            </button>

            {isSearchMode ? (
              /* 검색 결과 헤더 */
              <div className="flex items-center justify-between px-5 pb-3 pt-1">
                <div>
                  <p className="text-xl font-bold leading-tight">{searchQuery}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {displayPlaces.length} result{displayPlaces.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <CloseButton onClick={clearSearch} label="검색 초기화" />
              </div>
            ) : (
              <>
                {/* 탭 바 — ExploreTabBar 스타일 */}
                <div className="flex justify-center pb-2.5">
                  <div className="flex items-center rounded-full bg-muted p-1 gap-0.5">
                    {(["places", "my-maps"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => handleTabChange(tab)}
                        className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                          activeTab === tab
                            ? "bg-brand text-black shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab === "places" ? "Places" : "My Maps"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 장소 수 */}
                <div className="px-5 pb-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {filteredPlaces.length} places
                  </p>
                </div>
              </>
            )}
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto">
            {showLoginPrompt ? null : displayPlaces.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                No places found.
              </div>
            ) : (
              displayPlaces.map((place) => (
                <SearchResultItem
                  key={place.id}
                  place={place}
                  isSelected={place.id === selectedPlaceId}
                  onClick={() => handleListItemClick(place.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* 목록 열기 버튼 (시트 닫힌 상태) */}
        {sheetState === "collapsed" && !showLoginPrompt && (
          <button
            onClick={() => setSheetState("peek")}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-4 py-2 bg-background rounded-full shadow-md text-sm font-medium active:opacity-70"
          >
            <AlignJustify className="size-3.5" />
            List
          </button>
        )}
      </div>

    </>
  );
}
