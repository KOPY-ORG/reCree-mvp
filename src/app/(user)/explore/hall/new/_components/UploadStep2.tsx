"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { MapPin, Check, X, Search, ImageIcon, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { searchPlaces, getPostsByPlace } from "@/app/(user)/_actions/recreeshot-actions";

interface Tag {
  id: string;
  name: string;
  group: string;
  colorHex: string | null;
  textColorHex: string | null;
}

interface Topic {
  id: string;
  nameEn: string;
  colorHex: string | null;
  textColorHex: string | null;
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
  tags: Tag[];
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

export function UploadStep2({
  referencePreviewUrl,
  shotPreviewUrl,
  tags,
  topics,
  previewScore,
  showBadge,
  onShowBadgeChange,
  onBack,
  onShare,
  isSubmitting,
}: Props) {
  const [story, setStory] = useState("");
  const [tips, setTips] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [topicSearch, setTopicSearch] = useState("");

  // 장소 검색
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  // 포스트 연결
  const [linkedPosts, setLinkedPosts] = useState<PostResult[]>([]);
  const [linkedPostId, setLinkedPostId] = useState<string | undefined>(undefined);

  // 태그 시트
  const [tagsSheetOpen, setTagsSheetOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!locationQuery.trim()) {
      setPlaceResults([]);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(locationQuery);
      setPlaceResults(results);
      setIsSearching(false);
    }, 400);
  }, [locationQuery]);

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
      // 선택 해제 시 자동 연결된 태그/토픽도 초기화
      setLinkedPostId(undefined);
      setSelectedTagIds([]);
      setSelectedTopicIds([]);
    } else {
      setLinkedPostId(post.id);
      // 포스트에 연결된 태그/토픽 자동 선택
      setSelectedTagIds(post.tagIds);
      setSelectedTopicIds(post.topicIds);
    }
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleTopic(id: string) {
    setSelectedTopicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const filteredTopics = topicSearch
    ? topics.filter((t) => t.nameEn.toLowerCase().includes(topicSearch.toLowerCase()))
    : topics;

  const selectedTagCount = selectedTagIds.length + selectedTopicIds.length;

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* 사진 프리뷰 */}
        <div className="relative mx-auto h-[50dvh] aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
          <Image src={shotPreviewUrl} alt="shot" fill className="object-cover" sizes="100vw" />
          {referencePreviewUrl && (
            <div
              className="absolute top-3 left-3 w-[18%] aspect-[3/4] rounded-xl overflow-hidden"
              style={{ boxShadow: "0 0 0 1.5px white, 0 0 6px 2px rgba(255,255,255,0.2)" }}
            >
              <Image src={referencePreviewUrl} alt="original" fill className="object-cover" sizes="25vw" />
            </div>
          )}
          {previewScore !== null && showBadge && (
            <div
              className="absolute top-3 right-3 text-black text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: "linear-gradient(to right, #C8FF09, white 150%)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              {previewScore}% Match
            </div>
          )}
        </div>

        {/* 배지 표시 카드 */}
        {previewScore !== null && (
          <button
            type="button"
            onClick={() => onShowBadgeChange(!showBadge)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left ${
              showBadge ? "border-brand bg-brand/5" : "border-border"
            }`}
          >
            {/* 점수 원형 뱃지 */}
            <div
              className={`flex-shrink-0 flex items-center justify-center size-11 rounded-full text-xs font-bold transition-all ${
                showBadge ? "text-black" : "bg-muted text-muted-foreground"
              }`}
              style={
                showBadge
                  ? { background: "linear-gradient(135deg, #C8FF09, #e8ffa0)" }
                  : undefined
              }
            >
              {previewScore}%
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Show Score Badge</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                Display your match score on your photo
              </p>
            </div>
            {/* 체크 버튼 */}
            <div
              className={`flex-shrink-0 size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                showBadge ? "bg-brand border-brand" : "border-border"
              }`}
            >
              {showBadge && <Check className="size-3.5 text-black" />}
            </div>
          </button>
        )}

        {/* 장소 연결 */}
        {selectedPlace ? (
          <div className="flex items-center gap-2 border border-brand rounded-xl px-3 py-2.5">
            <MapPin className="size-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm">
              {selectedPlace.nameEn ?? selectedPlace.nameKo}
            </span>
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

        {/* Related posts — 썸네일 카드 */}
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
                    {/* 썸네일 */}
                    <div className="relative flex-shrink-0 w-16 h-16 bg-muted">
                      {post.thumbnailUrl ? (
                        <Image
                          src={post.thumbnailUrl}
                          alt={title}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <ImageIcon className="size-4 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    {/* 제목 */}
                    <p className="flex-1 text-xs font-medium line-clamp-2 leading-snug py-2 pr-1">{title}</p>
                    {/* 체크 */}
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

        {/* Tags 버튼 */}
        <div>
          <button
            type="button"
            onClick={() => setTagsSheetOpen(true)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium w-full justify-between transition-all ${
              selectedTagCount > 0
                ? "border border-brand"
                : submitted
                ? "border border-dashed border-red-300"
                : "border border-border"
            }`}
          >
            <span className={selectedTagCount > 0 ? "text-foreground" : "text-muted-foreground"}>
              {selectedTagCount > 0 ? `${selectedTagCount} tag${selectedTagCount > 1 ? "s" : ""} selected` : "Add tags"}
            </span>
            <div className="flex items-center gap-2">
              {selectedTagCount === 0 && submitted && (
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Required</span>
              )}
              <ChevronDown className="size-4 text-muted-foreground" />
            </div>
          </button>

          {/* 선택된 태그 프리뷰 */}
          {selectedTagCount > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {selectedTagIds.map((id) => {
                const tag = tags.find((t) => t.id === id);
                if (!tag) return null;
                return (
                  <span
                    key={id}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: tag.colorHex ?? "#C8FF09", color: tag.textColorHex ?? "#000" }}
                  >
                    {tag.name}
                  </span>
                );
              })}
              {selectedTopicIds.map((id) => {
                const topic = topics.find((t) => t.id === id);
                if (!topic) return null;
                return (
                  <span
                    key={id}
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ backgroundColor: topic.colorHex ?? "#C8FF09", color: topic.textColorHex ?? "#000" }}
                  >
                    {topic.nameEn}
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
              locationName: selectedPlace?.nameEn ?? selectedPlace?.nameKo ?? "",
              story,
              tips,
              tagIds: selectedTagIds,
              topicIds: selectedTopicIds,
              placeId: selectedPlace?.id,
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
          <SheetHeader className="pb-2">
            <SheetTitle>Search location</SheetTitle>
          </SheetHeader>
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
            {isSearching && (
              <p className="text-sm text-muted-foreground text-center py-6">Searching...</p>
            )}
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

      {/* Tags 바텀시트 */}
      <Sheet open={tagsSheetOpen} onOpenChange={setTagsSheetOpen}>
        <SheetContent side="bottom" className="h-[75vh] flex flex-col px-5 pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle>Add tags</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto space-y-5">
            {/* 카테고리 섹션 */}
            {tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide">Type</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border font-medium transition-all"
                        style={
                          selected
                            ? {
                                backgroundColor: tag.colorHex ?? "#C8FF09",
                                color: tag.textColorHex ?? "#000",
                                borderColor: "transparent",
                              }
                            : { borderColor: "#d1d5db", color: "#374151" }
                        }
                      >
                        {selected && <Check className="size-3.5" />}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 토픽 섹션 */}
            {topics.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide">Theme</p>
                <input
                  type="text"
                  placeholder="Search..."
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 mb-3 bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <div className="flex flex-wrap gap-2">
                  {filteredTopics.map((topic) => {
                    const selected = selectedTopicIds.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.id)}
                        className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border font-medium transition-all"
                        style={
                          selected
                            ? {
                                backgroundColor: topic.colorHex ?? "#C8FF09",
                                color: topic.textColorHex ?? "#000",
                                borderColor: "transparent",
                              }
                            : { borderColor: "#d1d5db", color: "#374151" }
                        }
                      >
                        {selected && <Check className="size-3.5" />}
                        {topic.nameEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={() => setTagsSheetOpen(false)}
              className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black"
            >
              Done ({selectedTagCount})
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
