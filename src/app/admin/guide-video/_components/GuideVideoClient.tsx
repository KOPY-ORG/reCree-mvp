"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { saveGuideVideo, toggleGuideVideo, deleteGuideVideo } from "../_actions/guide-video-actions";

interface GuideVideoItem {
  id: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  titleEn: string;
  isActive: boolean;
  createdAt: Date;
}

interface Props {
  videos: GuideVideoItem[];
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

export function GuideVideoClient({ videos }: Props) {
  const [videoUrl, setVideoUrl] = useState("");
  const [titleEn, setTitleEn] = useState("How to reCree");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const youtubeId = extractYouTubeId(videoUrl);
  const autoThumb = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!videoUrl.trim()) { setError("YouTube URL을 입력하세요."); return; }
    if (!youtubeId) { setError("유효한 YouTube URL이 아닙니다."); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      await saveGuideVideo({ videoUrl: videoUrl.trim(), thumbnailUrl: autoThumb ?? "", titleEn: titleEn.trim() });
      setVideoUrl("");
      setTitleEn("How to reCree");
    } catch {
      setError("저장 실패. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* 등록 폼 */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4">새 가이드 영상 등록</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">YouTube URL <span className="text-red-400">*</span></label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand"
            />
            {/* 썸네일 미리보기 */}
            {autoThumb && (
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={autoThumb} alt="thumbnail" className="h-16 rounded-lg object-cover" />
                <p className="text-xs text-zinc-400">썸네일 자동 적용됨</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">제목</label>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand"
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-brand text-black text-sm font-semibold rounded-lg disabled:opacity-40"
          >
            {isSubmitting ? "저장 중..." : "저장"}
          </button>
        </form>
        <p className="mt-3 text-xs text-zinc-500">
          * 새 영상 등록 시 기존 활성 영상이 자동으로 비활성화됩니다.
        </p>
      </div>

      {/* 영상 목록 */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">등록된 영상</h2>
        {videos.length === 0 ? (
          <p className="text-sm text-zinc-500">등록된 가이드 영상이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {videos.map((v) => {
              const vid = extractYouTubeId(v.videoUrl);
              const thumb = v.thumbnailUrl ?? (vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : null);
              return (
                <div key={v.id} className="flex items-center gap-4 bg-zinc-900 rounded-xl px-4 py-3">
                  <div className="size-16 rounded-lg overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-zinc-500">No thumb</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{v.titleEn}</p>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{v.videoUrl}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{v.createdAt.toLocaleDateString("ko-KR")}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={v.isActive}
                      className="sr-only peer"
                      onChange={(e) => toggleGuideVideo(v.id, e.target.checked)}
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
                  </label>
                  <button
                    type="button"
                    onClick={() => { if (confirm("삭제하시겠습니까?")) deleteGuideVideo(v.id); }}
                    className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
