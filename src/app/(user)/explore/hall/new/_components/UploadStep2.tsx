"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { MapPin, Check, X, Search, ImageIcon, Tag, Plus } from "lucide-react";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LabelBadge } from "@/components/LabelBadge";
import { labelBackground, badgeRingStyle, resolveTagColors, computeTopicEffectiveColors, DEFAULT_COLOR, DEFAULT_TEXT } from "@/lib/post-labels";
import { searchPlaces, getPopularPlaces, getPostsByPlace } from "@/app/(user)/_actions/recreeshot-actions";
import { AddPlaceOverlay } from "./AddPlaceOverlay";

interface TagItem {
  id: string;
  name: string;
  group: string;
  colorHex: string | null;
  colorHex2: string | null;
  textColorHex: string | null;
}

interface TagGroup {
  group: string;
  nameEn: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
  tags: TagItem[];
}

interface Topic {
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

interface PlaceResult {
  id: string;
  nameKo: string | null;
  nameEn: string | null;
  addressEn: string | null;
  city: string | null;
  imageUrl: string | null;
}

interface PostResult {
  id: string;
  titleEn: string | null;
  titleKo: string | null;
  thumbnailUrl: string | null;
  topicIds: string[];
  tagIds: string[];
}

interface PlacePrefill {
  id: string;
  nameEn: string | null;
  nameKo: string | null;
  addressEn: string | null;
  imageUrl: string | null;
}

interface Props {
  referencePreviewUrl: string | null;
  shotPreviewUrl: string;
  tagGroups: TagGroup[];
  topics: Topic[];
  previewScore: number | null;
  showBadge: boolean;
  onShowBadgeChange: (val: boolean) => void;
  onBack: () => void;
  onShare: (data: {
    locationName: string;
    story: string;
    tips: string;
    tagIds: string[];
    topicIds: string[];
    placeId?: string;
    linkedPostId?: string;
    showBadge: boolean;
  }) => void;
  isSubmitting: boolean;
  prefillPostId?: string;
  prefillPlace?: PlacePrefill;
  prefillTagIds?: string[];
  prefillTopicIds?: string[];
}

// ── Topic tree types ──────────────────────────────────────────────────────────

type L3Topic = Topic & { children: never[] };
type L2Topic = Topic & { children: L3Topic[] };
type L1Topic = Topic & { children: L2Topic[] };
type L0Topic = Topic & { children: L1Topic[] };

function buildTopicTree(flat: Topic[]): L0Topic[] {
  const map = new Map<string, L0Topic | L1Topic | L2Topic | L3Topic>();
  for (const t of flat) map.set(t.id, { ...t, children: [] } as L0Topic);
  const roots: L0Topic[] = [];
  for (const t of flat) {
    if (t.parentId === null) {
      roots.push(map.get(t.id) as L0Topic);
    } else {
      const parent = map.get(t.parentId) as L0Topic | undefined;
      if (parent) (parent.children as Topic[]).push(map.get(t.id)!);
    }
  }
  return roots;
}

function getAllDescendantIds(node: { id: string; children?: { id: string; children?: unknown[] }[] }): string[] {
  const ids = [node.id];
  for (const child of node.children ?? []) ids.push(...getAllDescendantIds(child as typeof node));
  return ids;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UploadStep2({
  referencePreviewUrl,
  shotPreviewUrl,
  tagGroups,
  topics,
  previewScore,
  showBadge,
  onShowBadgeChange,
  onBack: _onBack,
  onShare,
  isSubmitting,
  prefillPostId,
  prefillPlace,
  prefillTagIds = [],
  prefillTopicIds = [],
}: Props) {
  const [story, setStory] = useState("");
  const [tips, setTips] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(prefillTagIds);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(prefillTopicIds);
  const [submitted, setSubmitted] = useState(false);

  // 장소 검색
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [popularPlaces, setPopularPlaces] = useState<PlaceResult[]>([]);
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(
    prefillPlace ? { id: prefillPlace.id, nameEn: prefillPlace.nameEn, nameKo: prefillPlace.nameKo, addressEn: prefillPlace.addressEn, city: null, imageUrl: prefillPlace.imageUrl } : null
  );

  // 포스트 연결
  const [linkedPosts, setLinkedPosts] = useState<PostResult[]>([]);
  const [linkedPostId, setLinkedPostId] = useState<string | undefined>(prefillPostId);

  // 구글맵 장소 추가 오버레이
  const [addPlaceOverlay, setAddPlaceOverlay] = useState(false);

  // TYPE 바텀시트
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);

  // THEME 탭 (Tag 시트 내)
  const [activeThemeL0Id, setActiveThemeL0Id] = useState<string | null>(null);
  const [themeSearchQuery, setThemeSearchQuery] = useState("");

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── prefill 장소의 포스트 목록 로드 ─────────────────────────────────────────
  useEffect(() => {
    if (!prefillPlace) return;
    getPostsByPlace(prefillPlace.id).then(setLinkedPosts);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 시트 열릴 때 인기 장소 로드 ────────────────────────────────────────────
  useEffect(() => {
    if (!locationSheetOpen) return;
    if (popularPlaces.length > 0) return;
    getPopularPlaces().then(setPopularPlaces);
  }, [locationSheetOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 장소 검색 디바운스 ───────────────────────────────────────────────────────
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

  // ── 데이터 구조 ─────────────────────────────────────────────────────────────
  const topicTree = useMemo(() => buildTopicTree(topics), [topics]);

  // 토픽 effective color map (상속 포함)
  const topicColorMap = useMemo(() => computeTopicEffectiveColors(topics), [topics]);

  // Tag 시트 열릴 때 첫 번째 L0 자동 선택
  useEffect(() => {
    if (typeSheetOpen && topicTree.length > 0 && !activeThemeL0Id) {
      setActiveThemeL0Id(topicTree[0].id);
    }
  }, [typeSheetOpen, topicTree, activeThemeL0Id]);

  // 현재 활성 L0의 하위 토픽 중 L2+ (L1 카테고리 제외, 플랫)
  const activeThemeTopics = useMemo(() => {
    const resolvedL0Id = activeThemeL0Id ?? topicTree[0]?.id;
    if (!resolvedL0Id) return [];
    const l0 = topicTree.find(t => t.id === resolvedL0Id);
    if (!l0) return [];
    const allIds = new Set(getAllDescendantIds(l0).filter(id => id !== resolvedL0Id));
    // L1 (Boy Group, Girl Group 등 분류 레벨) 제외 → level >= 2만 표시
    return topics.filter(t => allIds.has(t.id) && t.level >= 2);
  }, [activeThemeL0Id, topicTree, topics]);

  const filteredThemeTopics = useMemo(() => {
    if (!themeSearchQuery.trim()) return activeThemeTopics;
    const q = themeSearchQuery.toLowerCase();
    return activeThemeTopics.filter(t => t.nameEn.toLowerCase().includes(q));
  }, [activeThemeTopics, themeSearchQuery]);

  // 활성 L0가 K-POP이면 선택 전에도 색상 표시
  const themeAlwaysColor = useMemo(() => {
    const resolvedL0Id = activeThemeL0Id ?? topicTree[0]?.id;
    return topicTree.find(t => t.id === resolvedL0Id)?.nameEn === "K-POP";
  }, [activeThemeL0Id, topicTree]);

  const selectedTagCount = selectedTagIds.length + selectedTopicIds.length;

  // ── 핸들러 ──────────────────────────────────────────────────────────────────
  async function handleSelectPlace(place: PlaceResult) {
    setSelectedPlace(place);
    setLocationSheetOpen(false);
    setLocationQuery("");
    setLinkedPostId(undefined);
    setLinkedPosts([]);
    const posts = await getPostsByPlace(place.id);
    setLinkedPosts(posts);
  }

  function clearPlace() {
    setSelectedPlace(null);
    setLinkedPosts([]);
    setLinkedPostId(undefined);
  }

  function handleSelectPost(post: PostResult) {
    if (linkedPostId === post.id) {
      setLinkedPostId(undefined);
      setSelectedTagIds([]);
      setSelectedTopicIds([]);
    } else {
      setLinkedPostId(post.id);
      setSelectedTagIds(post.tagIds);
      setSelectedTopicIds(post.topicIds);
    }
  }

  function toggleTag(id: string) {
    setSelectedTagIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function toggleTopic(id: string) {
    setSelectedTopicIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  // ── 렌더링 ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* 사진 프리뷰 */}
        <ReCreeshotImage
          shotUrl={shotPreviewUrl}
          referenceUrl={referencePreviewUrl}
          matchScore={previewScore}
          showBadge={showBadge}
          referencePosition="top-left"
          badgePosition="top-right"
          className="mx-auto h-[50dvh] aspect-[3/4]"
          sizes="100vw"
        />

        {/* 배지 표시 카드 */}
        {previewScore !== null && (
          <button
            type="button"
            onClick={() => onShowBadgeChange(!showBadge)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left ${
              showBadge ? "border-brand bg-brand/5" : "border-border"
            }`}
          >
            <div
              className={`flex-shrink-0 flex items-center justify-center size-11 rounded-full text-xs font-bold transition-all ${
                showBadge ? "text-black" : "bg-muted text-muted-foreground"
              }`}
              style={showBadge ? { background: "linear-gradient(135deg, #C8FF09, #e8ffa0)" } : undefined}
            >
              {Math.round(previewScore)}%
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Show Score Badge</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">Display your match score on your photo</p>
            </div>
            <div className={`flex-shrink-0 size-6 rounded-full border-2 flex items-center justify-center transition-all ${
              showBadge ? "bg-brand border-brand" : "border-border"
            }`}>
              {showBadge && <Check className="size-3.5 text-black" />}
            </div>
          </button>
        )}

        {/* 장소 연결 */}
        {selectedPlace ? (
          <div className="flex items-center gap-2 border border-brand rounded-xl px-3 py-2.5">
            <MapPin className="size-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm">{selectedPlace.nameEn ?? selectedPlace.nameKo}</span>
            <button type="button" onClick={clearPlace} className="text-muted-foreground p-0.5">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLocationSheetOpen(true)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 w-full text-left ${submitted ? "border border-dashed border-red-300" : "border border-border"}`}
          >
            <MapPin className="size-4 text-muted-foreground shrink-0" />
            <div className="flex-1 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Where did you take this?</span>
              {submitted && <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Required</span>}
            </div>
          </button>
        )}

        {/* Related posts */}
        {linkedPosts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground px-0.5">Related post</p>
            <div className="space-y-2">
              {linkedPosts.map((post) => {
                const selected = linkedPostId === post.id;
                const title = post.titleEn ?? post.titleKo ?? "";
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => handleSelectPost(post)}
                    className={`flex items-center gap-3 w-full rounded-xl border overflow-hidden transition-all text-left ${
                      selected ? "border-brand bg-brand/5" : "border-border"
                    }`}
                  >
                    <div className="relative flex-shrink-0 w-16 h-16 bg-muted">
                      {post.thumbnailUrl ? (
                        <Image src={post.thumbnailUrl} alt={title} fill className="object-cover" sizes="64px" />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <ImageIcon className="size-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <p className="flex-1 text-xs font-medium line-clamp-2 leading-snug py-2 pr-1">{title}</p>
                    <div className={`flex-shrink-0 size-5 rounded-full border-2 flex items-center justify-center mr-3 transition-all ${
                      selected ? "bg-brand border-brand" : "border-border"
                    }`}>
                      {selected && <Check className="size-3 text-black" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 스토리 */}
        <div className="border border-border rounded-xl px-3 pt-3 pb-2">
          <textarea
            placeholder="Share the story behind this shot!"
            value={story}
            onChange={(e) => setStory(e.target.value.slice(0, 300))}
            rows={4}
            className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground text-right">{story.length}/300</p>
        </div>

        {/* 팁 */}
        <div className="border border-border rounded-xl px-3 pt-3 pb-2">
          <textarea
            placeholder="Tips (best time to visit, hidden tips...)"
            value={tips}
            onChange={(e) => setTips(e.target.value.slice(0, 300))}
            rows={3}
            className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground text-right">{tips.length}/300</p>
        </div>

        {/* Tag 필드 */}
        <div className={`rounded-xl border [--pill-py:0.25rem] ${
          submitted && selectedTagCount === 0 ? "border-dashed border-red-300" : "border-border"
        }`}>
          {/* 헤더 행 */}
          <button
            type="button"
            onClick={() => setTypeSheetOpen(true)}
            className="flex items-center justify-between w-full px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <Tag className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Tag</span>
              {submitted && selectedTagCount === 0 && (
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Required</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Plus className="size-3.5" />
              <span>Add</span>
            </div>
          </button>

          {/* 선택된 뱃지 */}
          {selectedTagCount > 0 && (
            <div className="px-3 pb-2.5 flex flex-wrap gap-1.5">
              {selectedTagIds.map((id) => {
                const groupData = tagGroups.find(g => g.tags.some(t => t.id === id));
                const tag = groupData?.tags.find(t => t.id === id);
                if (!tag || !groupData) return null;
                const resolved = resolveTagColors(tag, groupData);
                return (
                  <span
                    key={id}
                    className="pill-badge text-xs"
                    style={{ background: labelBackground({ text: "", ...resolved }), color: resolved.textColorHex }}
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleTag(id); }}
                      className="opacity-60 hover:opacity-100 -mr-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
              {selectedTopicIds.map((id) => {
                const colors = topicColorMap.get(id);
                const topic = topics.find(t => t.id === id);
                if (!topic || !colors) return null;
                const bg = colors.hex2
                  ? `linear-gradient(${colors.dir}, ${colors.hex}, ${colors.hex2} ${colors.stop}%)`
                  : colors.hex;
                return (
                  <span
                    key={id}
                    className="pill-badge text-xs"
                    style={{ background: bg, color: colors.textHex }}
                  >
                    {topic.nameEn}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleTopic(id); }}
                      className="opacity-60 hover:opacity-100 -mr-0.5"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Share 버튼 */}
      <div className="px-4 py-3 shrink-0 space-y-2">
        {submitted && (!selectedPlace || selectedTagCount === 0) && (
          <p className="text-xs text-center text-muted-foreground">
            {!selectedPlace && selectedTagCount === 0
              ? "Add a location and at least 1 tag to share"
              : !selectedPlace
              ? "Add a location to share"
              : "Add at least 1 tag to share"}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setSubmitted(true);
            if (!selectedPlace || selectedTagCount === 0) return;
            onShare({
              locationName: selectedPlace.nameEn ?? selectedPlace.nameKo ?? "",
              story,
              tips,
              tagIds: selectedTagIds,
              topicIds: selectedTopicIds,
              placeId: selectedPlace.id,
              linkedPostId,
              showBadge,
            });
          }}
          disabled={isSubmitting}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {isSubmitting ? "Sharing..." : "Share"}
        </button>
      </div>

      {/* 장소 검색 바텀시트 */}
      <Sheet open={locationSheetOpen} onOpenChange={(v) => { setLocationSheetOpen(v); if (!v) setLocationQuery(""); }}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl max-h-[85vh] p-0 flex flex-col gap-0"
        >
          <SheetTitle className="sr-only">Search location</SheetTitle>

          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          <div className="px-5 pt-1 pb-3 shrink-0">
            <p className="text-base font-bold">Location</p>
          </div>

          {/* 검색창 */}
          <div className="px-4 pb-3 shrink-0">
            <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-3.5 py-2.5">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Search places..."
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              />
              {locationQuery && (
                <button type="button" onClick={() => setLocationQuery("")}>
                  <X className="size-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* 장소 목록 */}
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            {isSearching && (
              <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>
            )}

            {/* 검색 결과 */}
            {!isSearching && locationQuery.trim() && (
              <>
                {placeResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No places found</p>
                ) : (
                  <div className="space-y-1">
                    {placeResults.map((place) => (
                      <PlaceRow key={place.id} place={place} onSelect={handleSelectPlace} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* 기본 목록 (검색 전) */}
            {!isSearching && !locationQuery.trim() && (
              <>
                {popularPlaces.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Our places</p>
                    <div className="space-y-1">
                      {popularPlaces.map((place) => (
                        <PlaceRow key={place.id} place={place} onSelect={handleSelectPlace} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* 구글맵으로 직접 등록 */}
            <div className="mt-6 rounded-2xl border border-border/60 px-4 py-4 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold">Can&apos;t find your place?</p>
                <p className="text-xs text-muted-foreground leading-snug">
                  Search directly on Google Maps and add it to our service.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setLocationSheetOpen(false); setAddPlaceOverlay(true); }}
                className="flex items-center gap-2 w-full py-2.5 px-3.5 rounded-xl bg-muted/60 text-sm font-medium"
              >
                <MapPin className="size-4 text-muted-foreground shrink-0" />
                Search on Google Maps
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* TYPE — 단일 바텀시트 (그룹별 탭) */}
      <Sheet open={typeSheetOpen} onOpenChange={(v) => { setTypeSheetOpen(v); if (!v) setThemeSearchQuery(""); }}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl max-h-[90vh] p-0 flex flex-col gap-0"
        >
          <SheetTitle className="sr-only">Tag</SheetTitle>

          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          <div className="px-5 pt-1 pb-3 shrink-0">
            <p className="text-base font-bold">Tag</p>
          </div>

          {/* 선택된 태그/토픽 요약 */}
          {selectedTagCount > 0 && (
            <div className="px-4 pb-3 shrink-0">
              <div className="flex flex-wrap gap-1.5 [--pill-py:0.25rem]">
                {selectedTagIds.map((id) => {
                  const groupData = tagGroups.find(g => g.tags.some(t => t.id === id));
                  const tag = groupData?.tags.find(t => t.id === id);
                  if (!tag || !groupData) return null;
                  const resolved = resolveTagColors(tag, groupData);
                  return (
                    <span
                      key={id}
                      className="pill-badge text-xs"
                      style={{ background: labelBackground({ text: "", ...resolved }), color: resolved.textColorHex }}
                    >
                      {tag.name}
                      <button type="button" onClick={() => toggleTag(id)} className="opacity-60 hover:opacity-100 -mr-0.5">
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
                {selectedTopicIds.map((id) => {
                  const colors = topicColorMap.get(id);
                  const topic = topics.find(t => t.id === id);
                  if (!topic || !colors) return null;
                  const bg = colors.hex2
                    ? `linear-gradient(${colors.dir}, ${colors.hex}, ${colors.hex2} ${colors.stop}%)`
                    : colors.hex;
                  return (
                    <span
                      key={id}
                      className="pill-badge text-xs"
                      style={{ background: bg, color: colors.textHex }}
                    >
                      {topic.nameEn}
                      <button type="button" onClick={() => toggleTopic(id)} className="opacity-60 hover:opacity-100 -mr-0.5">
                        <X className="size-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 전체 태그 + 토픽 스크롤 목록 */}
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-6 space-y-5 [--pill-py:0.3rem]">
            {tagGroups.map((group) => (
              <div key={group.group}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{group.nameEn}</p>
                <div className="flex flex-wrap gap-2">
                  {group.tags.map((tag) => {
                    const isActive = selectedTagIds.includes(tag.id);
                    const resolved = resolveTagColors(tag, group);
                    const bg = labelBackground({ text: "", ...resolved });
                    const fg = resolved.textColorHex;
                    return (
                      <LabelBadge
                        key={tag.id}
                        as="button"
                        text={tag.name}
                        background={isActive ? bg : DEFAULT_COLOR}
                        color={isActive ? fg : DEFAULT_TEXT}
                        className="shrink-0 transition-all active:opacity-70"
                        style={badgeRingStyle(resolved.colorHex, isActive)}
                        onClick={() => toggleTag(tag.id)}
                      >
                      </LabelBadge>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Theme (Topics) — L0 탭 + 검색 + 플랫 뱃지 */}
            {topicTree.length > 0 && (
              <div>
                {/* L0 탭바 (세그먼트 컨트롤) */}
                <div className="flex bg-muted rounded-xl p-1 mb-3">
                  {topicTree.map((l0) => {
                    const isActive = (activeThemeL0Id ?? topicTree[0]?.id) === l0.id;
                    const hasSelected = getAllDescendantIds(l0).some(id => selectedTopicIds.includes(id));
                    return (
                      <button
                        key={l0.id}
                        type="button"
                        onClick={() => { setActiveThemeL0Id(l0.id); setThemeSearchQuery(""); }}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-background text-foreground shadow-sm"
                            : hasSelected
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {l0.nameEn}
                      </button>
                    );
                  })}
                </div>

                {/* 검색바 */}
                <div className="flex items-center gap-2 bg-muted/50 border border-border/60 rounded-xl px-3 py-2 mb-3">
                  <Search className="size-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder={`Search in ${topicTree.find(t => t.id === (activeThemeL0Id ?? topicTree[0]?.id))?.nameEn ?? ""}...`}
                    value={themeSearchQuery}
                    onChange={(e) => setThemeSearchQuery(e.target.value)}
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                  {themeSearchQuery && (
                    <button type="button" onClick={() => setThemeSearchQuery("")}>
                      <X className="size-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* 플랫 토픽 뱃지 */}
                <div className="flex flex-wrap gap-x-2 gap-y-3">
                  {filteredThemeTopics.map((topic) => {
                    const colors = topicColorMap.get(topic.id);
                    const isSelected = selectedTopicIds.includes(topic.id);
                    const bg = colors?.hex2
                      ? `linear-gradient(${colors.dir}, ${colors.hex}, ${colors.hex2} ${colors.stop}%)`
                      : (colors?.hex ?? DEFAULT_COLOR);
                    const fg = colors?.textHex ?? DEFAULT_TEXT;
                    return (
                      <LabelBadge
                        key={topic.id}
                        as="button"
                        text={topic.nameEn}
                        background={themeAlwaysColor || isSelected ? bg : DEFAULT_COLOR}
                        color={themeAlwaysColor || isSelected ? fg : DEFAULT_TEXT}
                        className="shrink-0 transition-all active:opacity-70"
                        style={badgeRingStyle(colors?.hex ?? null, isSelected)}
                        onClick={() => toggleTopic(topic.id)}
                      >
                      </LabelBadge>
                    );
                  })}
                  {filteredThemeTopics.length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">No results</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-4 pb-6 pt-3 shrink-0">
            <button
              type="button"
              onClick={() => setTypeSheetOpen(false)}
              className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black"
            >
              Done
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 구글맵 장소 추가 오버레이 */}
      {addPlaceOverlay && (
        <AddPlaceOverlay
          onSelect={async (place) => {
            setAddPlaceOverlay(false);
            await handleSelectPlace(place);
          }}
          onClose={() => { setAddPlaceOverlay(false); setLocationSheetOpen(true); }}
        />
      )}
    </div>
  );
}

// ── 장소 행 컴포넌트 ──────────────────────────────────────────────────────────

function PlaceRow({
  place,
  onSelect,
}: {
  place: PlaceResult;
  onSelect: (place: PlaceResult) => void;
}) {
  const name = place.nameEn ?? place.nameKo ?? "";
  return (
    <button
      type="button"
      onClick={() => onSelect(place)}
      className="flex items-center gap-3 w-full text-left px-2 py-2.5 rounded-xl hover:bg-muted/50 active:bg-muted transition-colors"
    >
      {/* 썸네일 */}
      <div className="relative flex-shrink-0 size-11 rounded-xl overflow-hidden bg-muted">
        {place.imageUrl ? (
          <Image src={place.imageUrl} alt={name} fill className="object-cover" sizes="44px" />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <MapPin className="size-4 text-muted-foreground/40" />
          </div>
        )}
      </div>
      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {(place.addressEn ?? place.city) && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {place.addressEn ?? place.city}
          </p>
        )}
      </div>
    </button>
  );
}
