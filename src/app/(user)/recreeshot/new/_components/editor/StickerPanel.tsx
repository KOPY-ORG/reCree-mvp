"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Image from "next/image";
import { MapPin, Loader2, Search, X, Check, ImageIcon, PlusCircle } from "lucide-react";
import { isExternalImage } from "@/lib/image";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LabelBadge } from "@/components/LabelBadge";
import { searchPlaces, getPopularPlaces } from "@/app/(user)/_actions/recreeshot-actions";
import { AddPlaceOverlay } from "../AddPlaceOverlay";
import { useGeolocation } from "@/app/(user)/_hooks/useGeolocation";
import {
  computeTopicEffectiveColors,
  resolveTagColors,
  badgeRingStyle,
  DEFAULT_COLOR,
  DEFAULT_TEXT,
} from "@/lib/post-labels";
import type { StickerBadgeOption } from "./editor-types";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface PlaceResult {
  id: string;
  nameKo: string | null;
  nameEn: string | null;
  addressEn: string | null;
  city: string | null;
  imageUrl: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface TagItem {
  id: string;
  name: string;
  group: string;
  colorHex: string | null;
  colorHex2: string | null;
  textColorHex: string | null;
}

export interface TagGroup {
  group: string;
  nameEn: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
  tags: TagItem[];
}

export interface TopicItem {
  id: string;
  nameEn: string;
  colorHex: string | null;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string | null;
  level: number;
  parentId: string | null;
}

export interface PostResult {
  id: string;
  titleEn: string | null;
  titleKo: string | null;
  thumbnailUrl: string | null;
  topicIds: string[];
  tagIds: string[];
}

// ── 거리 계산 (Haversine) ──────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Topic 유틸 ─────────────────────────────────────────────────────────────────

type AnyTopic = TopicItem & { children: AnyTopic[] };

function buildTopicTree(flat: TopicItem[]): AnyTopic[] {
  const map = new Map<string, AnyTopic>();
  for (const t of flat) map.set(t.id, { ...t, children: [] });
  const roots: AnyTopic[] = [];
  for (const t of flat) {
    if (t.parentId === null) {
      roots.push(map.get(t.id)!);
    } else {
      const parent = map.get(t.parentId);
      if (parent) parent.children.push(map.get(t.id)!);
    }
  }
  return roots;
}

function getAllDescendantIds(node: AnyTopic): string[] {
  const ids = [node.id];
  for (const child of node.children) ids.push(...getAllDescendantIds(child));
  return ids;
}

// ── Badge 옵션 계산 (EditorToolbar 색상 계산용) ───────────────────────────────

export function resolveBadgeOptions(
  topics: TopicItem[],
  tagGroups: TagGroup[],
  topicIds: string[],
  tagIds: string[],
): StickerBadgeOption[] {
  const sorted = [...topics].sort((a, b) => a.level - b.level);
  const colorMap = computeTopicEffectiveColors(sorted);

  const topicBadges: StickerBadgeOption[] = topicIds.flatMap((id) => {
    const t = topics.find((x) => x.id === id);
    const c = colorMap.get(id);
    if (!t || !c) return [];
    return [{ id, name: t.nameEn, type: "topic" as const, colorHex: c.hex, colorHex2: c.hex2, gradientDir: c.dir, gradientStop: c.stop, textColorHex: c.textHex }];
  });

  const tagBadges: StickerBadgeOption[] = tagIds.flatMap((id) => {
    for (const group of tagGroups) {
      const tag = group.tags.find((t) => t.id === id);
      if (tag) {
        const c = resolveTagColors(tag, { colorHex: group.colorHex, colorHex2: group.colorHex2, gradientDir: group.gradientDir, gradientStop: group.gradientStop, textColorHex: group.textColorHex });
        return [{ id, name: tag.name, type: "tag" as const, ...c }];
      }
    }
    return [];
  });

  return [...topicBadges, ...tagBadges];
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  locationSheetOpen: boolean;
  onLocationSheetChange: (v: boolean) => void;
  tagSheetOpen: boolean;
  onTagSheetChange: (v: boolean) => void;
  selectedPlace: PlaceResult | null;
  onPlaceChange: (place: PlaceResult | null) => void;
  linkedPosts: PostResult[];
  linkedPostId: string | undefined;
  onLinkedPostChange: (id: string | undefined, tagIds?: string[], topicIds?: string[]) => void;
  selectedTagIds: string[];
  selectedTopicIds: string[];
  onTagsChange: (tagIds: string[], topicIds: string[]) => void;
  tagGroups: TagGroup[];
  topics: TopicItem[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StickerPanel({
  locationSheetOpen,
  onLocationSheetChange,
  tagSheetOpen,
  onTagSheetChange,
  selectedPlace,
  onPlaceChange,
  linkedPosts,
  linkedPostId,
  onLinkedPostChange,
  selectedTagIds,
  selectedTopicIds,
  onTagsChange,
  tagGroups,
  topics,
}: Props) {
  const [locationQuery, setLocationQuery] = useState("");
  const [popularPlaces, setPopularPlaces] = useState<PlaceResult[]>([]);
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const geoRequestedRef = useRef(false);

  const { coords: geoCoords, request: requestGeo } = useGeolocation();

  const [activeThemeL0Id, setActiveThemeL0Id] = useState<string | null>(null);
  const [themeSearchQuery, setThemeSearchQuery] = useState("");
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (!locationSheetOpen || popularPlaces.length > 0) return;
    getPopularPlaces().then(setPopularPlaces);
  }, [locationSheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // 시트가 처음 열릴 때 한 번만 조용히 현위치 요청 (권한 거부/미지원 시 폴백)
  useEffect(() => {
    if (!locationSheetOpen || geoRequestedRef.current) return;
    geoRequestedRef.current = true;
    requestGeo();
  }, [locationSheetOpen, requestGeo]);

  useEffect(() => {
    if (!locationQuery.trim()) { setPlaceResults([]); return; }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(locationQuery);
      setPlaceResults(results);
      setIsSearching(false);
    }, 400);
  }, [locationQuery]);

  // 좌표 있으면 거리순, 없으면 서버 반환 순(최신순) 그대로
  const sortedPopularPlaces = useMemo(() => {
    if (!geoCoords) return popularPlaces;
    return [...popularPlaces].sort((a, b) => {
      const aDist =
        a.latitude != null && a.longitude != null
          ? haversineKm(geoCoords.lat, geoCoords.lng, a.latitude, a.longitude)
          : Infinity;
      const bDist =
        b.latitude != null && b.longitude != null
          ? haversineKm(geoCoords.lat, geoCoords.lng, b.latitude, b.longitude)
          : Infinity;
      return aDist - bDist;
    });
  }, [popularPlaces, geoCoords]);

  const topicTree = useMemo(() => buildTopicTree(topics), [topics]);
  const topicColorMap = useMemo(() => computeTopicEffectiveColors(topics), [topics]);

  useEffect(() => {
    if (tagSheetOpen && topicTree.length > 0 && !activeThemeL0Id) {
      setActiveThemeL0Id(topicTree[0].id);
    }
  }, [tagSheetOpen, topicTree, activeThemeL0Id]);

  const activeThemeTopics = useMemo(() => {
    const resolvedL0Id = activeThemeL0Id ?? topicTree[0]?.id;
    if (!resolvedL0Id) return [];
    const l0 = topicTree.find((t) => t.id === resolvedL0Id);
    if (!l0) return [];
    const allIds = new Set(getAllDescendantIds(l0).filter((id) => id !== resolvedL0Id));
    return topics.filter((t) => allIds.has(t.id) && t.level >= 2);
  }, [activeThemeL0Id, topicTree, topics]);

  const filteredThemeTopics = useMemo(() => {
    if (!themeSearchQuery.trim()) return activeThemeTopics;
    const q = themeSearchQuery.toLowerCase();
    return activeThemeTopics.filter((t) => t.nameEn.toLowerCase().includes(q));
  }, [activeThemeTopics, themeSearchQuery]);

  const themeAlwaysColor = useMemo(() => {
    const resolvedL0Id = activeThemeL0Id ?? topicTree[0]?.id;
    return topicTree.find((t) => t.id === resolvedL0Id)?.nameEn === "K-POP";
  }, [activeThemeL0Id, topicTree]);

  function handleSelectPlace(place: PlaceResult) {
    onPlaceChange(place);
    onLocationSheetChange(false);
    setLocationQuery("");
    setAddPlaceOpen(false);
  }

  function toggleTag(id: string) {
    onTagsChange(
      selectedTagIds.includes(id) ? selectedTagIds.filter((x) => x !== id) : [...selectedTagIds, id],
      selectedTopicIds,
    );
  }

  function toggleTopic(id: string) {
    onTagsChange(
      selectedTagIds,
      selectedTopicIds.includes(id) ? selectedTopicIds.filter((x) => x !== id) : [...selectedTopicIds, id],
    );
  }

  return (
    <>
      {/* 장소 검색 시트 */}
      <Sheet open={locationSheetOpen} onOpenChange={(v) => { onLocationSheetChange(v); if (!v) setLocationQuery(""); }}>
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl max-h-[85vh] p-0 flex flex-col gap-0">
          <SheetTitle className="sr-only">Search location</SheetTitle>
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
          </div>
          <div className="px-5 pt-1 pb-3 shrink-0">
            <p className="text-base font-bold">Location</p>
          </div>
          <div className="px-4 pb-3 shrink-0">
            <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-3.5 py-2.5">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input type="text" placeholder="Search places..." value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
              {locationQuery && <button type="button" onClick={() => setLocationQuery("")}><X className="size-3.5 text-muted-foreground" /></button>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {isSearching && <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>}
            {!isSearching && locationQuery.trim() && (
              placeResults.length === 0
                ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <p className="text-sm text-muted-foreground">No places found</p>
                    <button
                      type="button"
                      onClick={() => { onLocationSheetChange(false); setAddPlaceOpen(true); }}
                      className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
                    >
                      <PlusCircle className="size-4" />
                      Add this place
                    </button>
                  </div>
                )
                : <div className="space-y-1">{placeResults.map((p) => <PlaceRow key={p.id} place={p} onSelect={handleSelectPlace} />)}</div>
            )}
            {!isSearching && !locationQuery.trim() && sortedPopularPlaces.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Our places</p>
                <div className="space-y-1">{sortedPopularPlaces.map((p) => <PlaceRow key={p.id} place={p} onSelect={handleSelectPlace} />)}</div>
              </>
            )}
          </div>
          {/* 항상 보이는 하단 버튼 */}
          <div className="shrink-0 px-4 pb-6 pt-2 border-t border-border/30">
            <button
              type="button"
              onClick={() => { onLocationSheetChange(false); setAddPlaceOpen(true); }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full text-sm font-semibold border border-border text-foreground"
            >
              <PlusCircle className="size-4" />
              Can&apos;t find it? Add a place
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 미등록 장소 추가 오버레이 */}
      {addPlaceOpen && (
        <AddPlaceOverlay
          onSelect={handleSelectPlace}
          onClose={() => setAddPlaceOpen(false)}
        />
      )}

      {/* 태그 시트 */}
      <Sheet open={tagSheetOpen} onOpenChange={(v) => { onTagSheetChange(v); if (!v) setThemeSearchQuery(""); }}>
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl max-h-[90vh] p-0 flex flex-col gap-0">
          <SheetTitle className="sr-only">Tag</SheetTitle>
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
          </div>
          <div className="px-5 pt-1 pb-3 shrink-0">
            <p className="text-base font-bold">Add tags</p>
          </div>

          {/* 연결 포스트 */}
          {linkedPosts.length > 0 && (
            <div className="px-4 pb-3 shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Related post</p>
              <div className="space-y-1.5">
                {linkedPosts.map((post) => {
                  const selected = linkedPostId === post.id;
                  const title = post.titleEn ?? post.titleKo ?? "";
                  return (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          onLinkedPostChange(undefined);
                          onTagsChange(
                            selectedTagIds.filter((id) => !post.tagIds.includes(id)),
                            selectedTopicIds.filter((id) => !post.topicIds.includes(id)),
                          );
                        } else {
                          onLinkedPostChange(post.id, post.tagIds, post.topicIds);
                          onTagsChange(
                            [...new Set([...selectedTagIds, ...post.tagIds])],
                            [...new Set([...selectedTopicIds, ...post.topicIds])],
                          );
                        }
                      }}
                      className={`flex items-center gap-3 w-full rounded-2xl p-2 text-left transition-all shadow-sm ${
                        selected ? "bg-brand/10 ring-1.5 ring-brand ring-inset" : "bg-background"
                      }`}
                    >
                      <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-muted">
                        {post.thumbnailUrl ? (
                          <Image src={post.thumbnailUrl} alt={title} fill unoptimized className="object-cover" sizes="56px" />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <ImageIcon className="size-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <p className="flex-1 text-xs font-medium line-clamp-3 leading-snug min-w-0">{title}</p>
                      <div className={`flex-shrink-0 size-5 rounded-full border flex items-center justify-center transition-all ${selected ? "bg-brand border-brand" : "border-border/40 bg-muted/30"}`}>
                        {selected && <Check className="size-3 text-black" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 선택된 태그 요약 */}
          {(selectedTagIds.length > 0 || selectedTopicIds.length > 0) && (
            <div className="px-4 pb-3 shrink-0">
              <div className="flex flex-wrap gap-1.5 [--pill-py:0.25rem]">
                {selectedTagIds.map((id) => {
                  const groupData = tagGroups.find((g) => g.tags.some((t) => t.id === id));
                  const tag = groupData?.tags.find((t) => t.id === id);
                  if (!tag || !groupData) return null;
                  const resolved = resolveTagColors(tag, groupData);
                  const bg = resolved.colorHex2
                    ? `linear-gradient(${resolved.gradientDir}, ${resolved.colorHex}, ${resolved.colorHex2} ${resolved.gradientStop}%)`
                    : resolved.colorHex;
                  return (
                    <span key={id} className="pill-badge text-xs" style={{ background: bg, color: resolved.textColorHex }}>
                      {tag.name}
                      <button type="button" onClick={() => toggleTag(id)} className="opacity-60 hover:opacity-100 -mr-0.5"><X className="size-3" /></button>
                    </span>
                  );
                })}
                {selectedTopicIds.map((id) => {
                  const colors = topicColorMap.get(id);
                  const topic = topics.find((t) => t.id === id);
                  if (!topic || !colors) return null;
                  const bg = colors.hex2 ? `linear-gradient(${colors.dir}, ${colors.hex}, ${colors.hex2} ${colors.stop}%)` : colors.hex;
                  return (
                    <span key={id} className="pill-badge text-xs" style={{ background: bg, color: colors.textHex }}>
                      {topic.nameEn}
                      <button type="button" onClick={() => toggleTopic(id)} className="opacity-60 hover:opacity-100 -mr-0.5"><X className="size-3" /></button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-6 space-y-5 [--pill-py:0.3rem]">
            {tagGroups.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{group.nameEn}</p>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => {
                    const isActive = selectedTagIds.includes(tag.id);
                    const resolved = resolveTagColors(tag, group);
                    const bg = isActive
                      ? (resolved.colorHex2 ? `linear-gradient(${resolved.gradientDir}, ${resolved.colorHex}, ${resolved.colorHex2} ${resolved.gradientStop}%)` : resolved.colorHex)
                      : DEFAULT_COLOR;
                    return (
                      <LabelBadge key={tag.id} as="button" text={tag.name} background={bg} color={isActive ? resolved.textColorHex : DEFAULT_TEXT} className="shrink-0 transition-all active:opacity-70" style={badgeRingStyle(resolved.colorHex, isActive)} onClick={() => toggleTag(tag.id)} />
                    );
                  })}
                </div>
              </div>
            ))}

            {topicTree.length > 0 && (
              <div>
                <div className="flex bg-muted rounded-xl p-1 mb-3">
                  {topicTree.map((l0) => {
                    const isActive = (activeThemeL0Id ?? topicTree[0]?.id) === l0.id;
                    const hasSelected = getAllDescendantIds(l0).some((id) => selectedTopicIds.includes(id));
                    return (
                      <button key={l0.id} type="button" onClick={() => { setActiveThemeL0Id(l0.id); setThemeSearchQuery(""); }} className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${isActive ? "bg-background text-foreground shadow-sm" : hasSelected ? "text-foreground" : "text-muted-foreground"}`}>
                        {l0.nameEn}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 bg-muted/50 border border-border/60 rounded-xl px-3 py-2 mb-3">
                  <Search className="size-3.5 text-muted-foreground shrink-0" />
                  <input type="text" placeholder={`Search in ${topicTree.find((t) => t.id === (activeThemeL0Id ?? topicTree[0]?.id))?.nameEn ?? ""}...`} value={themeSearchQuery} onChange={(e) => setThemeSearchQuery(e.target.value)} className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
                  {themeSearchQuery && <button type="button" onClick={() => setThemeSearchQuery("")}><X className="size-3.5 text-muted-foreground" /></button>}
                </div>
                {(() => {
                  if (filteredThemeTopics.length === 0) {
                    return <p className="text-sm text-muted-foreground py-2">No results</p>;
                  }

                  function renderBadge(topic: TopicItem) {
                    const colors = topicColorMap.get(topic.id);
                    const isSelected = selectedTopicIds.includes(topic.id);
                    const bg = colors?.hex2
                      ? `linear-gradient(${colors.dir}, ${colors.hex}, ${colors.hex2} ${colors.stop}%)`
                      : (colors?.hex ?? DEFAULT_COLOR);
                    const fg = colors?.textHex ?? DEFAULT_TEXT;
                    return (
                      <LabelBadge key={topic.id} as="button" text={topic.nameEn} background={themeAlwaysColor || isSelected ? bg : DEFAULT_COLOR} color={themeAlwaysColor || isSelected ? fg : DEFAULT_TEXT} className="shrink-0 transition-all active:opacity-70" style={badgeRingStyle(colors?.hex ?? null, isSelected)} onClick={() => toggleTopic(topic.id)} />
                    );
                  }

                  if (themeSearchQuery.trim()) {
                    return <div className="flex flex-wrap gap-x-2 gap-y-3">{filteredThemeTopics.map(renderBadge)}</div>;
                  }

                  const inSet = new Set(filteredThemeTopics.map((t) => t.id));
                  const parents = filteredThemeTopics.filter((t) => !t.parentId || !inSet.has(t.parentId));
                  const childrenOf = (parentId: string) => filteredThemeTopics.filter((t) => t.parentId === parentId);

                  return (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-x-2 gap-y-3">
                        {parents.map((parent) => {
                          const members = childrenOf(parent.id);
                          const hasMembers = members.length > 0;
                          const isExpanded = expandedGroupId === parent.id;
                          const colors = topicColorMap.get(parent.id);
                          const isSelected = selectedTopicIds.includes(parent.id);
                          const bg = colors?.hex2
                            ? `linear-gradient(${colors.dir}, ${colors.hex}, ${colors.hex2} ${colors.stop}%)`
                            : (colors?.hex ?? DEFAULT_COLOR);
                          const fg = colors?.textHex ?? DEFAULT_TEXT;
                          const showColor = themeAlwaysColor || isSelected || isExpanded;

                          if (hasMembers) {
                            return (
                              <div
                                key={parent.id}
                                className="inline-flex items-center rounded-full font-medium leading-none shrink-0 overflow-hidden transition-all"
                                style={{
                                  background: showColor ? bg : DEFAULT_COLOR,
                                  color: showColor ? fg : DEFAULT_TEXT,
                                  ...badgeRingStyle(colors?.hex ?? null, isSelected),
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleTopic(parent.id)}
                                  className="pl-2.5 pr-1.5 active:opacity-70"
                                  style={{ paddingTop: "var(--pill-py, 0.1875rem)", paddingBottom: "var(--pill-py, 0.1875rem)", fontSize: "var(--pill-fs, var(--text-xs))" }}
                                >
                                  {parent.nameEn}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpandedGroupId(isExpanded ? null : parent.id)}
                                  className="pr-2 active:opacity-70 text-[10px] leading-none"
                                  style={{ paddingTop: "var(--pill-py, 0.1875rem)", paddingBottom: "var(--pill-py, 0.1875rem)" }}
                                >
                                  {isExpanded ? "▴" : "▾"}
                                </button>
                              </div>
                            );
                          }
                          return renderBadge(parent);
                        })}
                      </div>

                      {expandedGroupId && (() => {
                        const members = childrenOf(expandedGroupId);
                        if (!members.length) return null;
                        return (
                          <div className="flex flex-wrap gap-x-2 gap-y-3 pl-3 border-l-2 border-border/40">
                            {members.map(renderBadge)}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="px-4 pb-6 pt-3 shrink-0">
            <button type="button" onClick={() => onTagSheetChange(false)} className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black">
              Done
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── PlaceRow ──────────────────────────────────────────────────────────────────

function PlaceRow({ place, onSelect }: { place: PlaceResult; onSelect: (p: PlaceResult) => void }) {
  const name = place.nameEn ?? place.nameKo ?? "";
  return (
    <button type="button" onClick={() => onSelect(place)} className="flex items-center gap-3 w-full text-left px-2 py-2.5 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors">
      <div className="relative flex-shrink-0 size-11 rounded-xl overflow-hidden bg-muted">
        {place.imageUrl ? (
          <Image src={place.imageUrl} alt={name} fill unoptimized={isExternalImage(place.imageUrl)} className="object-cover" sizes="44px" />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <MapPin className="size-4 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {(place.addressEn ?? place.city) && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{place.addressEn ?? place.city}</p>
        )}
      </div>
    </button>
  );
}
