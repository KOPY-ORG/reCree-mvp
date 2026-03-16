"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, X } from "lucide-react";

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

interface Props {
  referencePreviewUrl: string | null;
  shotPreviewUrl: string;
  tags: Tag[];
  topics: Topic[];
  onBack: () => void;
  onShare: (data: {
    locationName: string;
    story: string;
    tips: string;
    tagIds: string[];
    topicIds: string[];
  }) => void;
  isSubmitting: boolean;
}

export function UploadStep2({
  referencePreviewUrl,
  shotPreviewUrl,
  tags,
  topics,
  onBack,
  onShare,
  isSubmitting,
}: Props) {
  const [locationName, setLocationName] = useState("");
  const [story, setStory] = useState("");
  const [tips, setTips] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [topicSearch, setTopicSearch] = useState("");

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
    ? topics.filter((t) =>
        t.nameEn.toLowerCase().includes(topicSearch.toLowerCase())
      )
    : topics;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 sticky top-14 bg-background z-10">
        <button type="button" onClick={onBack} className="p-1 -ml-1">
          <ChevronLeft className="size-5" />
        </button>
        <span className="font-semibold text-sm">New reCree shot</span>
        <button type="button" onClick={onBack} className="p-1 -mr-1">
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 썸네일 */}
        <div className="flex gap-2">
          {referencePreviewUrl && (
            <div className="relative size-16 rounded-lg overflow-hidden bg-muted shrink-0">
              <Image src={referencePreviewUrl} alt="original" fill className="object-cover" sizes="64px" />
            </div>
          )}
          <div className="relative size-16 rounded-lg overflow-hidden bg-muted shrink-0">
            <Image src={shotPreviewUrl} alt="shot" fill className="object-cover" sizes="64px" />
          </div>
        </div>

        {/* 장소명 */}
        <input
          type="text"
          placeholder="Location name"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          className="w-full text-sm border-b border-border/50 pb-2 bg-transparent outline-none placeholder:text-muted-foreground"
        />

        {/* 스토리 */}
        <textarea
          placeholder="Tell us about your recreation..."
          value={story}
          onChange={(e) => setStory(e.target.value.slice(0, 300))}
          rows={4}
          className="w-full text-sm bg-muted/30 rounded-xl p-3 outline-none resize-none placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground text-right -mt-2">{story.length}/300</p>

        {/* 팁 */}
        <textarea
          placeholder="Tips for others trying to recreate..."
          value={tips}
          onChange={(e) => setTips(e.target.value)}
          rows={3}
          className="w-full text-sm bg-muted/30 rounded-xl p-3 outline-none resize-none placeholder:text-muted-foreground"
        />

        {/* 카테고리 (태그) */}
        {tags.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Category</p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium transition-opacity"
                    style={
                      selected
                        ? {
                            backgroundColor: tag.colorHex ?? "#C8FF09",
                            color: tag.textColorHex ?? "#000",
                          }
                        : { backgroundColor: "#e5e7eb", color: "#374151" }
                    }
                  >
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
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Topic</p>
            <input
              type="text"
              placeholder="Search topics..."
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              className="w-full text-sm border border-border/50 rounded-lg px-3 py-1.5 mb-2 bg-transparent outline-none placeholder:text-muted-foreground"
            />
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {filteredTopics.map((topic) => {
                const selected = selectedTopicIds.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleTopic(topic.id)}
                    className="text-xs px-2.5 py-1 rounded-full font-medium transition-opacity"
                    style={
                      selected
                        ? {
                            backgroundColor: topic.colorHex ?? "#C8FF09",
                            color: topic.textColorHex ?? "#000",
                          }
                        : { backgroundColor: "#e5e7eb", color: "#374151" }
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

      {/* Share 버튼 */}
      <div className="px-4 py-4 border-t border-border/50">
        <button
          type="button"
          onClick={() =>
            onShare({ locationName, story, tips, tagIds: selectedTagIds, topicIds: selectedTopicIds })
          }
          disabled={isSubmitting}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {isSubmitting ? "Sharing..." : "Share"}
        </button>
      </div>
    </div>
  );
}
