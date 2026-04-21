"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Image from "next/image";
import { MapPin, Star, Target, Loader2, Search, X, Plus, Check, ImageIcon } from "lucide-react";
import { isExternalImage } from "@/lib/image";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LabelBadge } from "@/components/LabelBadge";
import { getActiveStickers } from "@/lib/actions/sticker-actions";
import { previewMatchScore, searchPlaces, getPopularPlaces } from "@/app/(user)/_actions/recreeshot-actions";
import {
  computeTopicEffectiveColors,
  resolveTagColors,
  labelBackground,
  badgeRingStyle,
  DEFAULT_COLOR,
  DEFAULT_TEXT,
} from "@/lib/post-labels";
import type { EditorLayer, StickerBadgeOption } from "./editor-types";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface PlaceResult {
  id: string;
  nameKo: string | null;
  nameEn: string | null;
  addressEn: string | null;
  city: string | null;
  imageUrl: string | null;
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

interface ActiveSticker {
  id: string;
  name: string;
  imageUrl: string;
  mimeType: string;
}

const BADGE_W = 300;
const BADGE_H = 72;
const LOC_W = 360;
const LOC_H = 80;
const SCORE_W = 200;
const SCORE_H = 120;

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

// ── Badge 옵션 계산 ────────────────────────────────────────────────────────────

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
  canvasWidth: number;
  canvasHeight: number;
  uploadedReferenceUrl: string | null;
  uploadedShotUrl: string | null;
  onAddLayer: (layer: Omit<EditorLayer, "id">) => void;
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
  canvasWidth,
  canvasHeight,
  uploadedReferenceUrl,
  uploadedShotUrl,
  onAddLayer,
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
  const [stickers, setStickers] = useState<ActiveSticker[]>([]);
  const [loadingScore, setLoadingScore] = useState(false);
  const [scoreResult, setScoreResult] = useState<number | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [popularPlaces, setPopularPlaces] = useState<PlaceResult[]>([]);
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [activeThemeL0Id, setActiveThemeL0Id] = useState<string | null>(null);
  const [themeSearchQuery, setThemeSearchQuery] = useState("");

  useEffect(() => {
    getActiveStickers().then(setStickers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!locationSheetOpen || popularPlaces.length > 0) return;
    getPopularPlaces().then(setPopularPlaces);
  }, [locationSheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const topicTree = useMemo(() => buildTopicTree(topics), [topics]);
  const topicColorMap = useMemo(() => computeTopicEffectiveColors(topics), [topics]);

  useEffect(() => {
    if (typeSheetOpen && topicTree.length > 0 && !activeThemeL0Id) {
      setActiveThemeL0Id(topicTree[0].id);
    }
  }, [typeSheetOpen, topicTree, activeThemeL0Id]);

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

  const placeName = selectedPlace?.nameEn ?? selectedPlace?.nameKo ?? null;
  const badgeOptions = useMemo(
    () => resolveBadgeOptions(topics, tagGroups, selectedTopicIds, selectedTagIds),
    [topics, tagGroups, selectedTopicIds, selectedTagIds],
  );
  const selectedTagCount = selectedTagIds.length + selectedTopicIds.length;

  function centerPos(w: number, h: number) {
    return { x: 0.5 - w / 2 / canvasWidth, y: 0.5 - h / 2 / canvasHeight };
  }

  function addLocationTag() {
    if (!placeName) return;
    const { x, y } = centerPos(LOC_W, LOC_H);
    onAddLayer({ type: "location-tag", x, y, scale: 1, rotation: 0, placeName });
  }

  function addBadge(opt: StickerBadgeOption) {
    const { x, y } = centerPos(BADGE_W, BADGE_H);
    onAddLayer({ type: "label-badge", x, y, scale: 1, rotation: 0, topicId: opt.type === "topic" ? opt.id : undefined, tagId: opt.type === "tag" ? opt.id : undefined, badgeName: opt.name, badgeColorHex: opt.colorHex, badgeColorHex2: opt.colorHex2, badgeGradientDir: opt.gradientDir, badgeGradientStop: opt.gradientStop, badgeTextColorHex: opt.textColorHex });
  }

  async function handleGetScore() {
    if (!uploadedReferenceUrl || !uploadedShotUrl) return;
    setLoadingScore(true);
    setScoreError(null);
    try {
      const result = await previewMatchScore(uploadedReferenceUrl, uploadedShotUrl);
      if ("error" in result) setScoreError("Score calculation failed.");
      else setScoreResult(result.score);
    } finally {
      setLoadingScore(false);
    }
  }

  function addMatchScore() {
    if (scoreResult === null) return;
    const { x, y } = centerPos(SCORE_W, SCORE_H);
    onAddLayer({ type: "match-score", x, y, scale: 1, rotation: 0, score: scoreResult });
  }

  function addSticker(s: ActiveSticker) {
    onAddLayer({ type: "sticker", x: 0.5 - 200 / 2 / canvasWidth, y: 0.5 - 200 / 2 / canvasHeight, scale: 1, rotation: 0, stickerId: s.id, stickerUrl: s.imageUrl });
  }

  function handleSelectPlace(place: PlaceResult) {
    onPlaceChange(place);
    setLocationSheetOpen(false);
    setLocationQuery("");
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
    <div className="space-y-4 py-1">
      {/* 장소 선택 */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Location</p>
        {selectedPlace ? (
          <div className="flex items-center gap-2 border border-brand rounded-xl px-3 py-2">
            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 text-xs">{selectedPlace.nameEn ?? selectedPlace.nameKo}</span>
            <button type="button" onClick={() => onPlaceChange(null)} className="text-muted-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLocationSheetOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-xs text-muted-foreground w-full"
          >
            <MapPin className="size-3.5" />
            Set location
          </button>
        )}
      </div>

      {/* 연결 포스트 */}
      {linkedPosts.length > 0 && (
        <div>
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
                      onTagsChange([], []);
                    } else {
                      onLinkedPostChange(post.id, post.tagIds, post.topicIds);
                      onTagsChange(post.tagIds, post.topicIds);
                    }
                  }}
                  className={`flex items-center gap-2.5 w-full rounded-xl border overflow-hidden text-left transition-all ${selected ? "border-brand bg-brand/5" : "border-border"}`}
                >
                  <div className="relative flex-shrink-0 w-12 h-12 bg-muted">
                    {post.thumbnailUrl ? (
                      <Image src={post.thumbnailUrl} alt={title} fill unoptimized className="object-cover" sizes="48px" />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <ImageIcon className="size-3.5 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <p className="flex-1 text-xs font-medium line-clamp-2 leading-snug py-1 pr-1">{title}</p>
                  <div className={`flex-shrink-0 size-4 rounded-full border-2 flex items-center justify-center mr-2.5 transition-all ${selected ? "bg-brand border-brand" : "border-border"}`}>
                    {selected && <Check className="size-2.5 text-black" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 태그 선택 */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {selectedTagIds.map((id) => {
            const groupData = tagGroups.find((g) => g.tags.some((t) => t.id === id));
            const tag = groupData?.tags.find((t) => t.id === id);
            if (!tag || !groupData) return null;
            const resolved = resolveTagColors(tag, groupData);
            return (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: labelBackground({ text: "", ...resolved }), color: resolved.textColorHex }}>
                {tag.name}
                <button type="button" onClick={() => toggleTag(id)} className="opacity-70"><X className="size-2.5" /></button>
              </span>
            );
          })}
          {selectedTopicIds.map((id) => {
            const colors = topicColorMap.get(id);
            const topic = topics.find((t) => t.id === id);
            if (!topic || !colors) return null;
            const bg = colors.hex2 ? `linear-gradient(${colors.dir}, ${colors.hex}, ${colors.hex2} ${colors.stop}%)` : colors.hex;
            return (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: bg, color: colors.textHex }}>
                {topic.nameEn}
                <button type="button" onClick={() => toggleTopic(id)} className="opacity-70"><X className="size-2.5" /></button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => setTypeSheetOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-border text-[11px] text-muted-foreground"
          >
            <Plus className="size-3" />
            Add tag
          </button>
        </div>
      </div>

      {/* 특수 스티커 */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Special</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!placeName} onClick={addLocationTag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium disabled:opacity-40">
            <MapPin className="size-3.5" />
            {placeName ?? "Location tag"}
          </button>

          {badgeOptions.map((opt) => (
            <button key={opt.id} type="button" onClick={() => addBadge(opt)} className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: opt.colorHex2 ? `linear-gradient(${opt.gradientDir}, ${opt.colorHex}, ${opt.colorHex2} ${opt.gradientStop}%)` : opt.colorHex, color: opt.textColorHex }}>
              {opt.name}
            </button>
          ))}

          <div className="flex items-center gap-1.5">
            {scoreResult !== null ? (
              <button type="button" onClick={addMatchScore} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand text-xs font-semibold text-brand">
                <Target className="size-3.5" />
                {scoreResult}% — Add
              </button>
            ) : (
              <button type="button" onClick={handleGetScore} disabled={loadingScore || !uploadedReferenceUrl || !uploadedShotUrl} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-medium disabled:opacity-40">
                {loadingScore ? <Loader2 className="size-3.5 animate-spin" /> : <Star className="size-3.5" />}
                Match Score
              </button>
            )}
            {scoreError && <span className="text-[10px] text-red-500">{scoreError}</span>}
          </div>
        </div>
      </div>

      {/* 기본 스티커 */}
      {stickers.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Stickers</p>
          <div className="flex flex-wrap gap-2">
            {stickers.map((s) => (
              <button key={s.id} type="button" onClick={() => addSticker(s)} className="size-12 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center overflow-hidden" title={s.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.imageUrl} alt={s.name} className="size-10 object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 장소 검색 시트 */}
      <Sheet open={locationSheetOpen} onOpenChange={(v) => { setLocationSheetOpen(v); if (!v) setLocationQuery(""); }}>
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
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {isSearching && <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>}
            {!isSearching && locationQuery.trim() && (
              placeResults.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-8">No places found</p>
                : <div className="space-y-1">{placeResults.map((p) => <PlaceRow key={p.id} place={p} onSelect={handleSelectPlace} />)}</div>
            )}
            {!isSearching && !locationQuery.trim() && popularPlaces.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Our places</p>
                <div className="space-y-1">{popularPlaces.map((p) => <PlaceRow key={p.id} place={p} onSelect={handleSelectPlace} />)}</div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 태그 시트 */}
      <Sheet open={typeSheetOpen} onOpenChange={(v) => { setTypeSheetOpen(v); if (!v) setThemeSearchQuery(""); }}>
        <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl max-h-[90vh] p-0 flex flex-col gap-0">
          <SheetTitle className="sr-only">Tag</SheetTitle>
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
          </div>
          <div className="px-5 pt-1 pb-3 shrink-0">
            <p className="text-base font-bold">Tag</p>
          </div>

          {selectedTagCount > 0 && (
            <div className="px-4 pb-3 shrink-0">
              <div className="flex flex-wrap gap-1.5 [--pill-py:0.25rem]">
                {selectedTagIds.map((id) => {
                  const groupData = tagGroups.find((g) => g.tags.some((t) => t.id === id));
                  const tag = groupData?.tags.find((t) => t.id === id);
                  if (!tag || !groupData) return null;
                  const resolved = resolveTagColors(tag, groupData);
                  return (
                    <span key={id} className="pill-badge text-xs" style={{ background: labelBackground({ text: "", ...resolved }), color: resolved.textColorHex }}>
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
                    return (
                      <LabelBadge key={tag.id} as="button" text={tag.name} background={isActive ? labelBackground({ text: "", ...resolved }) : DEFAULT_COLOR} color={isActive ? resolved.textColorHex : DEFAULT_TEXT} className="shrink-0 transition-all active:opacity-70" style={badgeRingStyle(resolved.colorHex, isActive)} onClick={() => toggleTag(tag.id)} />
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
                <div className="flex flex-wrap gap-x-2 gap-y-3">
                  {filteredThemeTopics.map((topic) => {
                    const colors = topicColorMap.get(topic.id);
                    const isSelected = selectedTopicIds.includes(topic.id);
                    const bg = colors?.hex2 ? `linear-gradient(${colors.dir}, ${colors.hex}, ${colors.hex2} ${colors.stop}%)` : (colors?.hex ?? DEFAULT_COLOR);
                    const fg = colors?.textHex ?? DEFAULT_TEXT;
                    return (
                      <LabelBadge key={topic.id} as="button" text={topic.nameEn} background={themeAlwaysColor || isSelected ? bg : DEFAULT_COLOR} color={themeAlwaysColor || isSelected ? fg : DEFAULT_TEXT} className="shrink-0 transition-all active:opacity-70" style={badgeRingStyle(colors?.hex ?? null, isSelected)} onClick={() => toggleTopic(topic.id)} />
                    );
                  })}
                  {filteredThemeTopics.length === 0 && <p className="text-sm text-muted-foreground py-2">No results</p>}
                </div>
              </div>
            )}
          </div>

          <div className="px-4 pb-6 pt-3 shrink-0">
            <button type="button" onClick={() => setTypeSheetOpen(false)} className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black">
              Done
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
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
