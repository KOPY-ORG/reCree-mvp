"use client";

import { useState } from "react";
import { Share2, Bookmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { labelBackground, type ResolvedLabel } from "@/lib/post-labels";

interface ResolvedTopic extends ResolvedLabel {
  nameEn: string;
}

interface Props {
  topics: ResolvedTopic[];
  tags: ResolvedLabel[];
  isSaved: boolean;
  postId: string;
  titleEn: string;
}

type Toast = { message: string; key: number };

export function PostMetaBar({ topics, tags, isSaved: initialSaved, postId }: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(message: string) {
    const key = Date.now();
    setToast({ message, key });
    setTimeout(() => setToast((t) => (t?.key === key ? null : t)), 2000);
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied!");
    } catch {
      showToast("Copy failed");
    }
  }

  async function handleSave() {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      showToast("Sign in to save");
      return;
    }

    const userId = session.user.id;
    const prev = saved;
    setSaved(!prev); // optimistic

    if (prev) {
      const { error } = await supabase
        .from("saves")
        .delete()
        .match({ user_id: userId, target_type: "POST", target_id: postId });
      if (error) setSaved(prev);
    } else {
      const { error } = await supabase
        .from("saves")
        .insert({ user_id: userId, target_type: "POST", target_id: postId });
      if (error) setSaved(prev);
    }
  }

  const displayedTopics = topics.slice(0, 1);
  const displayedTags = tags.slice(0, 3);

  return (
    <div className="relative flex justify-between items-start px-4 pt-3 pb-2">
      {/* 배지 영역 */}
      <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 mr-3">
        {displayedTopics.map((topic) => (
          <span
            key={topic.nameEn}
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
            style={{ background: labelBackground(topic), color: topic.textColorHex }}
          >
            {topic.nameEn}
          </span>
        ))}
        {displayedTags.map((tag) => (
          <span
            key={tag.text}
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0"
            style={{ background: labelBackground(tag), color: tag.textColorHex }}
          >
            {tag.text}
          </span>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="flex items-center gap-3 shrink-0">
        <button type="button" onClick={handleShare} className="text-muted-foreground hover:text-foreground transition-colors">
          <Share2 className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <button type="button" onClick={handleSave} className="transition-colors">
          <Bookmark
            className={`h-5 w-5 ${saved ? "" : "text-muted-foreground hover:text-foreground"}`}
            strokeWidth={1.5}
            style={saved ? { fill: "#C8FF09", stroke: "#C8FF09" } : undefined}
          />
        </button>
      </div>

      {/* 토스트 — 화면 하단 고정 */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </div>
  );
}
