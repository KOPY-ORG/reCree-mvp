"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { MapPin, ChevronUp, ChevronDown, Check, X, Search } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  const [sectionOpen, setSectionOpen] = useState(false);

  // 장소 검색
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  // 포스트 연결
  const [linkedPosts, setLinkedPosts] = useState<PostResult[]>([]);
  const [linkedPostId, setLinkedPostId] = useState<string | undefined>(undefined);

  // 카테고리/토픽 시트
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);

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

  const categoryLabel =
    selectedTagIds.length > 0
      ? tags.find((t) => t.id === selectedTagIds[0])?.name ?? "Category & Topic"
      : "Category & Topic";

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* 사진 프리뷰 */}
        <div className="relative mx-auto h-[50dvh] aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
          <Image src={shotPreviewUrl} alt="shot" fill className="object-cover" sizes="100vw" />
          {referencePreviewUrl && (
            <div className="absolute top-3 left-3 w-[18%] aspect-[3/4] rounded-xl overflow-hidden border border-white shadow-md">
              <Image src={referencePreviewUrl} alt="original" fill className="object-cover" sizes="25vw" />
            </div>
          )}
          {/* 배지 프리뷰 */}
          {previewScore !== null && showBadge && (
            <div className="absolute top-3 right-3 bg-brand text-black text-xs font-bold px-2.5 py-1 rounded-full shadow">
              {previewScore}% Match
            </div>
          )}
        </div>

        {/* 배지 표시 여부 토글 */}
        {previewScore !== null && (
          <div className="flex items-center justify-between border border-border rounded-xl px-3 py-2.5">
            <span className="text-sm font-medium">Show match score badge</span>
            <Switch
              checked={showBadge}
              onCheckedChange={onShowBadgeChange}
            />
          </div>
        )}

        {/* 장소 연결 */}
        {selectedPlace ? (
          <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2.5">
            <MapPin className="size-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm">
              {selectedPlace.nameKo ?? selectedPlace.nameEn}
            </span>
            <button type="button" onClick={clearPlace} className="text-muted-foreground">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setLocationSheetOpen(true)}
            className="flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 w-full text-left"
          >
            <MapPin className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">Add location</span>
          </button>
        )}

        {/* 연결된 포스트 목록 */}
        {linkedPosts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground px-1">Related post</p>
            <div className="flex flex-wrap gap-1.5">
              {linkedPosts.map((post) => {
                const selected = linkedPostId === post.id;
                return (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => setLinkedPostId(selected ? undefined : post.id)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                    style={
                      selected
                        ? { backgroundColor: "#C8FF09", color: "#000", borderColor: "transparent" }
                        : { borderColor: "#d1d5db", color: "#374151" }
                    }
                  >
                    {selected && <Check className="size-3" />}
                    {post.titleEn ?? post.titleKo}
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

        {/* Category & Topic 토글 버튼 */}
        <div>
          <button
            type="button"
            onClick={() => setCategorySheetOpen(true)}
            className="flex items-center gap-1.5 border border-border rounded-xl px-3 py-2 text-sm font-medium"
          >
            <span>{categoryLabel}</span>
            <ChevronDown className="size-4" />
          </button>

          {/* 선택된 태그/토픽 미리보기 */}
          {(selectedTagIds.length > 0 || selectedTopicIds.length > 0) && (
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
      <div className="px-4 py-3 border-t border-border/50 shrink-0">
        <button
          type="button"
          onClick={() =>
            onShare({
              locationName: selectedPlace?.nameKo ?? selectedPlace?.nameEn ?? "",
              story,
              tips,
              tagIds: selectedTagIds,
              topicIds: selectedTopicIds,
              placeId: selectedPlace?.id,
              linkedPostId,
              showBadge,
            })
          }
          disabled={isSubmitting}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {isSubmitting ? "Sharing..." : "Share"}
        </button>
      </div>

      {/* 장소 검색 바텀시트 */}
      <Sheet open={locationSheetOpen} onOpenChange={setLocationSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Search location</SheetTitle>
          </SheetHeader>
          <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 mt-2">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search places..."
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              autoFocus
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex-1 overflow-y-auto mt-2 space-y-1">
            {isSearching && (
              <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
            )}
            {!isSearching && placeResults.length === 0 && locationQuery.trim() && (
              <p className="text-sm text-muted-foreground text-center py-4">No places found</p>
            )}
            {placeResults.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => handleSelectPlace(place)}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <p className="text-sm font-medium">{place.nameKo ?? place.nameEn}</p>
                {place.nameKo && place.nameEn && (
                  <p className="text-xs text-muted-foreground">{place.nameEn}</p>
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Category & Topic 바텀시트 */}
      <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>Category & Topic</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-2 space-y-4">
            {/* 태그 */}
            {tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
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
                        {selected && <Check className="size-3" />}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 토픽 */}
            {topics.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Topic</p>
                <input
                  type="text"
                  placeholder="Search topics..."
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="w-full text-sm border border-border rounded-lg px-3 py-1.5 mb-2 bg-transparent outline-none placeholder:text-muted-foreground"
                />
                <div className="flex flex-wrap gap-1.5">
                  {filteredTopics.map((topic) => {
                    const selected = selectedTopicIds.includes(topic.id);
                    return (
                      <button
                        key={topic.id}
                        type="button"
                        onClick={() => toggleTopic(topic.id)}
                        className="text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
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
                        {topic.nameEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-border/50">
            <button
              type="button"
              onClick={() => setCategorySheetOpen(false)}
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
