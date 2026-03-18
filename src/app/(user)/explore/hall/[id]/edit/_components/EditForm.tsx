"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateReCreeshot } from "@/app/(user)/_actions/recreeshot-actions";

interface Props {
  id: string;
  initialStory: string;
  initialTips: string;
}

export function EditForm({ id, initialStory, initialTips }: Props) {
  const router = useRouter();
  const [story, setStory] = useState(initialStory);
  const [tips, setTips] = useState(initialTips);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    const result = await updateReCreeshot(id, { story, tips });
    if (result.error) {
      setError("Failed to save. Please try again.");
      setIsSaving(false);
      return;
    }
    router.replace(`/explore/hall/${id}`);
  }

  return (
    <div className="flex flex-col flex-1 px-4 py-4 space-y-4">
      {/* 스토리 */}
      <div className="border border-border rounded-xl px-3 pt-3 pb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Story</p>
        <textarea
          placeholder="Share the story behind this shot!"
          value={story}
          onChange={(e) => setStory(e.target.value.slice(0, 300))}
          rows={8}
          className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground text-right">{story.length}/300</p>
      </div>

      {/* 팁 */}
      <div className="border border-border rounded-xl px-3 pt-3 pb-2 bg-brand-sub3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tips</p>
        <textarea
          placeholder="Tips (best time to visit, hidden tips...)"
          value={tips}
          onChange={(e) => setTips(e.target.value.slice(0, 300))}
          rows={7}
          className="w-full text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground text-right">{tips.length}/300</p>
      </div>

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}

      <div className="pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
