"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { MapPin, Check, X, Search, ImageIcon, ChevronDown, ChevronUp } from "lucide-react";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LabelBadge } from "@/components/LabelBadge";
import { labelBackground, badgeRingStyle, resolveTopicColors, resolveTagColors, computeTopicEffectiveColors, DEFAULT_COLOR, DEFAULT_TEXT } from "@/lib/post-labels";
import { searchPlaces, getPostsByPlace } from "@/app/(user)/_actions/recreeshot-actions";

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
}

interface PostResult {
  id: string;
  titleEn: string | null;
  titleKo: string | null;
  thumbnailUrl: string | null;
  topicIds: string[];
  tagIds: string[];
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
}: Props) {
  const [story, setStory] = useState("");
  const [tips, setTips] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // 장소 검색
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  // 포스트 연결
  const [linkedPosts, setLinkedPosts] = useState<PostResult[]>([]);
  const [linkedPostId, setLinkedPostId] = useState<string | undefined>(undefined);

  // TYPE 바텀시트
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);

  // THEME 바텀시트
  const [openTopicL0Id, setOpenTopicL0Id] = useState<string | null>(null);
  const [topicL1Id, setTopicL1Id] = useState<string | null>(null);
  const [topicL2Id, setTopicL2Id] = useState<string | null>(null);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ── 파생 상태 ───────────────────────────────────────────────────────────────
  const openL0 = openTopicL0Id ? (topicTree.find(t => t.id === openTopicL0Id) ?? null) : null;
  const resolvedL1Id = topicL1Id ?? openL0?.children[0]?.id ?? null;
  const activeL1 = openL0?.children.find(c => c.id === resolvedL1Id) ?? null;
  const activeL2 = topicL2Id ? (activeL1?.children.find(c => c.id === topicL2Id) ?? null) : null;

  const selectedTagCount = selectedTagIds.length + selectedTopicIds.length;

  // ── 핸들러 ──────────────────────────────────────────────────────────────────
  async function handleSelectPlace(place: PlaceResult) {
    setSelectedPlace(place);
    setLocationSheetOpen(false);
    setLocationQuery("");
    setLinkedPostId(undefined);
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

  function openTopicSheet(l0Id: string) {
    const l0 = topicTree.find(t => t.id === l0Id);
    if (!l0) return;
    setOpenTopicL0Id(l0Id);
    setTopicL1Id(l0.children[0]?.id ?? null);
    setTopicL2Id(null);
  }

  // ── 토픽 색상 헬퍼 ───────────────────────────────────────────────────────────
  function resolveColor(node: Topic, ...parents: (Topic | null | undefined)[]) {
    const colorNode = {
      colorHex: node.colorHex,
      colorHex2: node.colorHex2,
      gradientDir: node.gradientDir,
      gradientStop: node.gradientStop,
      textColorHex: node.textColorHex,
      parent: parents.reduceRight<object | null>((acc, p) =>
        p ? { colorHex: p.colorHex, colorHex2: p.colorHex2, gradientDir: p.gradientDir, gradientStop: p.gradientStop, textColorHex: p.textColorHex, parent: acc } : acc,
        null
      ),
    };
    return resolveTopicColors(colorNode);
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
              <span className="text-sm text-muted-foreground">Add location</span>
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
                    className={`flex items-center gap-3 w-full rounded-xl border-2 overflow-hidden transition-all text-left ${
                      selected ? "border-brand bg-brand/5" : "border-border/50"
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
            placeholder="Tell us about your recreation!"
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
            placeholder="Tips (floor, seat number, best time...)"
            value={tips}
            onChange={(e) => setTips(e.target.value.slice(0, 300))}
            rows={3}
            className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground text-right">{tips.length}/300</p>
        </div>

        {/* 선택된 태그/토픽 미리보기 */}
        {selectedTagCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTagIds.map((id) => {
              const groupData = tagGroups.find(g => g.tags.some(t => t.id === id));
              const tag = groupData?.tags.find(t => t.id === id);
              if (!tag || !groupData) return null;
              const resolved = resolveTagColors(tag, groupData);
              return (
                <span
                  key={id}
                  className="pill-badge [--pill-py:0.2rem] text-xs"
                  style={{ background: labelBackground({ text: "", ...resolved }), color: resolved.textColorHex }}
                >
                  {tag.name}
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
                  className="pill-badge [--pill-py:0.2rem] text-xs"
                  style={{ background: bg, color: colors.textHex }}
                >
                  {topic.nameEn}
                </span>
              );
            })}
          </div>
        )}

        {/* Type + Theme 한 행 */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-0.5 [--pill-py:0.25rem]">
          {/* Type 버튼 */}
          {tagGroups.length > 0 && (
            <button
              type="button"
              onClick={() => setTypeSheetOpen(true)}
              className={`pill-badge shrink-0 border transition-colors ${
                selectedTagIds.length > 0
                  ? "bg-foreground text-background border-foreground"
                  : submitted && selectedTagCount === 0
                  ? "border-dashed border-red-300 text-muted-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              Type
              <ChevronDown className="size-3 shrink-0 opacity-50" />
            </button>
          )}

          {/* L0 토픽 버튼들 */}
          {topicTree.map((l0) => {
            const isActive = getAllDescendantIds(l0).some(id => selectedTopicIds.includes(id));
            return (
              <button
                key={l0.id}
                type="button"
                onClick={() => openTopicSheet(l0.id)}
                className={`pill-badge shrink-0 border transition-colors ${
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {l0.nameEn}
                <ChevronDown className="size-3 shrink-0 opacity-50" />
              </button>
            );
          })}
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
      <Sheet open={locationSheetOpen} onOpenChange={setLocationSheetOpen}>
        <SheetContent side="bottom" className="h-[75vh] flex flex-col px-5 pb-8">
          <SheetTitle className="text-base font-bold pt-1">Search location</SheetTitle>
          <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2.5">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search places..."
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
            {locationQuery && (
              <button type="button" onClick={() => setLocationQuery("")}>
                <X className="size-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto mt-1">
            {isSearching && <p className="text-sm text-muted-foreground text-center py-6">Searching...</p>}
            {!isSearching && placeResults.length === 0 && locationQuery.trim() && (
              <p className="text-sm text-muted-foreground text-center py-6">No places found</p>
            )}
            {!isSearching && placeResults.length === 0 && !locationQuery.trim() && (
              <p className="text-sm text-muted-foreground text-center py-6">Type to search for a place</p>
            )}
            {placeResults.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => handleSelectPlace(place)}
                className="w-full text-left px-2 py-3 rounded-xl hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
              >
                <p className="text-sm font-medium">{place.nameEn ?? place.nameKo}</p>
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* TYPE — 단일 바텀시트 (그룹별 탭) */}
      <Sheet open={typeSheetOpen} onOpenChange={setTypeSheetOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl max-h-[70vh] p-0 flex flex-col gap-0"
        >
          <SheetTitle className="sr-only">Type</SheetTitle>

          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          <div className="px-5 pt-1 pb-3 shrink-0">
            <p className="text-base font-bold">Type</p>
          </div>

          {/* 전체 태그 스크롤 목록 (그룹 헤더 + 칩) */}
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
                        {isActive && <Check className="size-3" />}
                      </LabelBadge>
                    );
                  })}
                </div>
              </div>
            ))}
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

      {/* THEME — 토픽 바텀시트 */}
      <Sheet open={!!openTopicL0Id} onOpenChange={(v) => { if (!v) { setOpenTopicL0Id(null); setTopicL1Id(null); setTopicL2Id(null); } }}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl max-h-[80vh] p-0 flex flex-col gap-0"
        >
          <SheetTitle className="sr-only">{openL0?.nameEn}</SheetTitle>

          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/25" />
          </div>

          <div className="px-5 pt-1 pb-3 shrink-0">
            <p className="text-base font-bold">{openL0?.nameEn}</p>
          </div>

          {/* L1 탭 행 */}
          {openL0 && openL0.children.length > 0 && (
            <div className="flex overflow-x-auto scrollbar-hide border-b border-border shrink-0">
              {openL0.children.map((l1) => {
                const isActive = l1.id === resolvedL1Id;
                const accentColor = l1.colorHex ?? openL0.colorHex ?? "#000000";
                return (
                  <button
                    key={l1.id}
                    type="button"
                    onClick={() => { setTopicL1Id(l1.id); setTopicL2Id(null); }}
                    className="shrink-0 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap active:opacity-70"
                    style={{
                      color: isActive ? accentColor : undefined,
                      borderBottomColor: isActive ? accentColor : "transparent",
                    }}
                  >
                    <span className={isActive ? "" : "text-muted-foreground"}>{l1.nameEn}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* L2 칩 + L3 패널 */}
          <div className="flex-1 overflow-y-auto">
            {activeL1 && (
              <div className="px-4 pt-4 pb-6 space-y-4 [--pill-py:0.3rem]">
                <div className="flex flex-wrap gap-2">
                  {activeL1.children.map((l2) => {
                    const isExpanded = topicL2Id === l2.id;
                    const isSelected = selectedTopicIds.includes(l2.id);
                    const highlight = isExpanded || isSelected;
                    const l2Colors = resolveColor(l2, activeL1, openL0);
                    const hasL3 = l2.children.length > 0;

                    return (
                      <LabelBadge
                        key={l2.id}
                        as="button"
                        text={l2.nameEn}
                        background={labelBackground({ text: "", ...l2Colors })}
                        color={l2Colors.textColorHex}
                        className="shrink-0 transition-all active:opacity-70"
                        style={badgeRingStyle(l2.colorHex ?? activeL1.colorHex ?? openL0?.colorHex ?? null, highlight)}
                        onClick={() => {
                          if (hasL3) {
                            setTopicL2Id(isExpanded ? null : l2.id);
                          } else {
                            toggleTopic(l2.id);
                          }
                        }}
                      >
                        {!hasL3 && isSelected && <Check className="size-3" />}
                        {hasL3 && (isExpanded
                          ? <ChevronUp className="size-3.5 opacity-70" />
                          : <ChevronDown className="size-3.5 opacity-70" />
                        )}
                      </LabelBadge>
                    );
                  })}
                </div>

                {/* L3 패널 */}
                {activeL2 && activeL2.children.length > 0 && (
                  <div className="rounded-2xl bg-muted/60 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: resolveColor(activeL2, activeL1, openL0).colorHex }}
                      />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {activeL2.nameEn}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeL2.children.map((l3) => {
                        const isSelected = selectedTopicIds.includes(l3.id);
                        const l3Colors = resolveColor(l3, activeL2, activeL1, openL0);
                        return (
                          <LabelBadge
                            key={l3.id}
                            as="button"
                            text={l3.nameEn}
                            background={labelBackground({ text: "", ...l3Colors })}
                            color={l3Colors.textColorHex}
                            className="shrink-0 transition-all active:opacity-70"
                            style={badgeRingStyle(l3.colorHex ?? activeL2.colorHex ?? activeL1?.colorHex ?? openL0?.colorHex ?? null, isSelected)}
                            onClick={() => toggleTopic(l3.id)}
                          >
                            {isSelected && <Check className="size-3" />}
                          </LabelBadge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-4 pb-6 pt-3 shrink-0">
            <button
              type="button"
              onClick={() => { setOpenTopicL0Id(null); setTopicL1Id(null); setTopicL2Id(null); }}
              className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black"
            >
              Done
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
