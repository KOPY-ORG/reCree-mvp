"use client";

import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

interface Shot {
  id: string;
  imageUrl: string;
  matchScore: number | null;
  showBadge: boolean;
  referencePhotoUrl: string | null;
  user: { nickname: string | null };
  tips: string | null;
}

interface Props {
  postId: string;
  shots: Shot[];
  originalImageUrl: string | null;
}

export function PostReCreeshotSection({ postId, shots, originalImageUrl }: Props) {
  const router = useRouter();

  function handleAdd() {
    const params = new URLSearchParams({ postId });
    if (originalImageUrl) params.set("referenceUrl", originalImageUrl);
    router.push(`/explore/hall/new?${params.toString()}`);
  }

  return (
    <div className="mt-3">
      {/* 섹션 헤더 */}
      <div className="px-4 mb-2 flex items-center justify-between">
        <p className="text-sm font-bold">How others reCree&apos;d</p>
        {shots.length > 0 && (
          <span className="text-xs text-muted-foreground">{shots.length} shots</span>
        )}
      </div>

      {/* 가로 스크롤 */}
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {/* Add 버튼 */}
        <button
          type="button"
          onClick={handleAdd}
          className="shrink-0 w-[90px] aspect-[4/5] border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 bg-muted/30 hover:bg-muted/50 transition-colors"
          style={{ borderRadius: "7%" }}
        >
          <Camera className="size-5 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground leading-tight text-center">Add<br />recreeshot</span>
        </button>

        {/* 리크리샷 카드 목록 */}
        {shots.map((shot) => (
          <button
            key={shot.id}
            type="button"
            onClick={() => router.push(`/explore/hall/${shot.id}`)}
            className="relative shrink-0 w-[90px] aspect-[4/5] overflow-hidden"
            style={{ borderRadius: "7%" }}
          >
            <img
              src={shot.imageUrl}
              alt="recreeshot"
              className="w-full h-full object-cover"
            />
            {shot.referencePhotoUrl && (
              <div className="absolute rounded-[10%] overflow-hidden" style={{ top: "4%", left: "4%", width: "22%", aspectRatio: "4/5", outline: "1px solid rgba(255,255,255,0.9)", boxShadow: "0 0 8px 4px rgba(255,255,255,0.6)" }}>
                <img src={shot.referencePhotoUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            {shot.showBadge && shot.matchScore !== null && (
              <div className="absolute top-1 right-1 text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none" style={{ background: "linear-gradient(to right, #C8FF09, #ffffff 150%)", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }}>
                {Math.round(shot.matchScore)}%
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Tips 섹션 */}
      {shots.some((s) => s.tips) && (
        <div className="mt-4">
          <div className="px-4 mb-2">
            <p className="text-sm font-bold">Tips from reCree&apos;rs</p>
          </div>
          <div className="px-4 space-y-2">
            {shots
              .filter((s) => s.tips)
              .map((shot) => (
                <div key={shot.id} className="rounded-xl bg-muted/50 px-3.5 py-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {shot.user.nickname ?? "Anonymous"}
                  </p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                    {shot.tips}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
