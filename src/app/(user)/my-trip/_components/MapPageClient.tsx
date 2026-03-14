"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search, User, Star, AlignJustify } from "lucide-react";
import type { MapPlace, MapPostTopic } from "@/lib/map-queries";
import type { TagGroupColorMap } from "@/lib/post-labels";
import { labelBackground, resolveTagColors } from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";
import { MapTopicFilterRow } from "./MapTopicFilterRow";
import { MapTagFilterRow } from "./MapTagFilterRow";
import { InteractiveMap } from "./InteractiveMap";
import { PlaceBottomSheet } from "./PlaceBottomSheet";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type Tab = "places" | "my-maps";
type SheetState = "collapsed" | "peek" | "expanded";

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
}

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function isTopicMatch(topic: MapPostTopic, targetId: string): boolean {
  if (topic.id === targetId) return true;
  if (topic.parent) return isTopicMatch(topic.parent, targetId);
  return false;
}

// ─── 장소 리스트 아이템 ────────────────────────────────────────────────────────

function PlaceListItem({
  place,
  tagGroupMap,
  isSelected,
  onClick,
}: {
  place: MapPlace;
  tagGroupMap: TagGroupColorMap;
  isSelected: boolean;
  onClick: () => void;
}) {
  const firstPost = place.posts[0];
  const postCount = place.posts.length;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/30 ${
        isSelected ? "bg-muted/40" : ""
      }`}
    >
      <div className="relative size-[72px] shrink-0 rounded-xl overflow-hidden bg-muted">
        {firstPost?.imageUrl ? (
          <Image
            src={firstPost.imageUrl}
            alt={place.nameEn}
            fill
            unoptimized
            className="object-cover"
            sizes="72px"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm line-clamp-1">{place.nameEn}</p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {postCount > 1 ? `${postCount} posts` : (firstPost?.titleEn ?? "")}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          {place.rating != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Star className="size-3 fill-muted-foreground stroke-muted-foreground" />
              {place.rating.toFixed(1)}
            </span>
          )}
          {firstPost?.tags[0] && (() => {
            const tag = firstPost.tags[0];
            const colors = resolveTagColors(tag, tagGroupMap.get(tag.group));
            return (
              <LabelBadge
                text={tag.name}
                background={labelBackground({ text: tag.name, ...colors })}
                color={colors.textColorHex}
                className="[--pill-fs:0.625rem]"
              />
            );
          })()}
        </div>
      </div>

      {isSelected && (
        <div className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
      )}
    </button>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

const SHEET_BOTTOM_OFFSET = 0;
const SHEET_PEEK_HEIGHT = 340;

export function MapPageClient({
  allPlaces,
  savedPlaces,
  savedPostIds: savedPostIdsArr,
  topics,
  tagGroups,
  tagGroupConfigs,
  isLoggedIn,
  userInitial,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("places");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [selectedTagGroup, setSelectedTagGroup] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<SheetState>("peek");

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

  const selectedPlace = filteredPlaces.find((p) => p.id === selectedPlaceId) ?? null;

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setSheetState("peek");
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

  function cycleSheet() {
    setSheetState((s) => {
      if (s === "collapsed") return "peek";
      if (s === "peek") return "expanded";
      return "collapsed";
    });
  }

  const sheetStyle: React.CSSProperties = {
    bottom: "0px",
    height:
      sheetState === "collapsed"
        ? "0px"
        : sheetState === "peek"
        ? `${SHEET_PEEK_HEIGHT}px`
        : "calc(100% - 80px)",
    transition: "height 320ms cubic-bezier(0.32, 0.72, 0, 1)",
    overflow: "hidden",
  };

  const showLoginPrompt = activeTab === "my-maps" && !isLoggedIn;

  return (
    <>
      {/* 헤더 없음 — 전체 높이 = 100dvh - BottomNav(64px) */}
      <div className="relative h-[calc(100dvh-64px)] overflow-hidden">

        {/* ── 지도 (전체 배경) ── */}
        <InteractiveMap
          places={filteredPlaces}
          selectedPlaceId={selectedPlaceId}
          onMarkerClick={handleMarkerClick}
          onNearbyClick={() => setSheetState("collapsed")}
          className="absolute inset-0"
        />

        {/* ── 상단 플로팅: 검색바 + 프로필 + 필터 ── */}
        <div className="absolute top-0 inset-x-0 z-40 pt-3">
          {/* 검색바 + 프로필 */}
          <div className="flex items-center gap-2 px-4 mb-1">
            <Link
              href="/search"
              className="flex-1 flex items-center gap-2.5 bg-background rounded-full px-4 py-2.5 shadow-md"
            >
              <Search className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Search places</span>
            </Link>
            <Link
              href={isLoggedIn ? "/profile" : "/login"}
              className="flex items-center justify-center shrink-0"
            >
              {userInitial ? (
                <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-black">
                  {userInitial}
                </div>
              ) : (
                <User className="size-4 text-muted-foreground" />
              )}
            </Link>
          </div>

          {/* 필터 행 — 배경 없음, 개별 pill만 */}
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

        {/* ── 바텀 시트 (리스트만) ── */}
        <div
          className="absolute inset-x-0 z-20 bg-background rounded-t-2xl flex flex-col shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
          style={sheetStyle}
        >
          {/* 드래그 핸들 */}
          <button
            onClick={cycleSheet}
            className="flex justify-center pt-2.5 pb-2 shrink-0 w-full"
            aria-label="목록 열기/닫기"
          >
            <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
          </button>

          {/* 탭 바 — ExploreTabBar 스타일 */}
          <div className="flex justify-center pb-2.5 shrink-0">
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
          <div className="px-4 pb-2 shrink-0">
            <p className="text-xs font-medium text-muted-foreground">
              {filteredPlaces.length} places
            </p>
          </div>

          {/* 목록 */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {showLoginPrompt ? null : filteredPlaces.length === 0 ? (
              <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
                No places found.
              </div>
            ) : (
              filteredPlaces.map((place) => (
                <PlaceListItem
                  key={place.id}
                  place={place}
                  tagGroupMap={tagGroupMap}
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

      {/* 장소 상세 바텀 시트 */}
      <PlaceBottomSheet
        place={selectedPlace}
        savedPostIds={savedPostIdsSet}
        tagGroupMap={tagGroupMap}
        onClose={() => setSelectedPlaceId(null)}
      />
    </>
  );
}
