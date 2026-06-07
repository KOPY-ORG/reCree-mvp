"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Share2, CheckCircle2 } from "lucide-react";
import { updateReCreeshotImageUrl } from "@/app/(user)/_actions/recreeshot-actions";
import { getReCreeshotPresignedUrl, deleteReCreeshotImages } from "@/lib/actions/upload-actions";
import { ReCreeshotImage } from "@/components/recreeshot-image";
import { coverRect, loadImage, drawReCreeshotBadge, drawReCreeshotWatermark } from "@/lib/canvas-utils";

interface Props {
  shotPreviewUrl: string;
  referencePreviewUrl: string | null;
  matchScore: number | null;
  showBadge: boolean;
  createdId: string;
  userId: string;
  uploadedShotPath: string | null;
}

export function UploadStep3({
  shotPreviewUrl,
  referencePreviewUrl,
  matchScore,
  showBadge,
  createdId,
  userId,
  uploadedShotPath,
}: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;

    async function compose() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const W = 1080;
      const H = W * (5 / 4);
      canvas.width = W;
      canvas.height = H;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const shotImg = await loadImage(shotPreviewUrl);
      // object-cover 방식: 비율 유지하며 캔버스를 채움 (찌부 방지)
      const { sx, sy, sw, sh } = coverRect(shotImg.naturalWidth, shotImg.naturalHeight, W, H);
      ctx.drawImage(shotImg, sx, sy, sw, sh, 0, 0, W, H);

      if (referencePreviewUrl) {
        const refImg = await loadImage(referencePreviewUrl);
        const thumbW = W * 0.18;
        const thumbH = thumbW * (5 / 4);
        const thumbX = W * 0.03;
        const thumbY = W * 0.03;
        const thumbR = Math.round(thumbW * 0.12);

        ctx.save();
        ctx.shadowColor = "rgba(255,255,255,0.4)";
        ctx.shadowBlur = 30;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
        ctx.clip();
        ctx.filter = "blur(12px)";
        ctx.drawImage(shotImg, sx, sy, sw, sh, 0, 0, W, H);
        ctx.filter = "none";
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
        ctx.clip();
        ctx.drawImage(refImg, thumbX, thumbY, thumbW, thumbH);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
        ctx.stroke();
        ctx.restore();
      }

      if (showBadge && matchScore !== null) drawReCreeshotBadge(ctx, W, matchScore);
      drawReCreeshotWatermark(ctx, W, H);

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        // 로컬 미리보기 + 다운로드용 URL (배지·소스이미지 포함 full composite)
        objectUrl = URL.createObjectURL(blob);
        setCompositeUrl(objectUrl);

        // DB 저장용 클린 버전 (메인 샷 + 워터마크만, CSS overlay로 배지·소스이미지 표시)
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(shotImg, sx, sy, sw, sh, 0, 0, W, H);
        drawReCreeshotWatermark(ctx, W, H);

        await new Promise<void>((resolve) => {
          canvas.toBlob(async (cleanBlob) => {
            if (!cleanBlob) { resolve(); return; }
            try {
              const cleanFile = new File([cleanBlob], `${userId}-${Date.now()}-shot.jpg`, { type: "image/jpeg" });
              const presigned = await getReCreeshotPresignedUrl(cleanFile.name, cleanFile.type);
              if (!("error" in presigned)) {
                const res = await fetch(presigned.presignedUrl, {
                  method: "PUT",
                  body: cleanFile,
                  headers: { "Content-Type": cleanFile.type },
                });
                if (res.ok) {
                  await updateReCreeshotImageUrl(createdId, presigned.cdnUrl);
                  if (uploadedShotPath) {
                    await deleteReCreeshotImages([uploadedShotPath]);
                  }
                }
              }
            } catch {
              // 업로드 실패해도 로컬 미리보기는 유지
            }
            resolve();
          }, "image/jpeg", 0.92);
        });

        setIsComposing(false);
      }, "image/jpeg", 0.92);
    }

    compose();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [shotPreviewUrl, referencePreviewUrl, matchScore, showBadge, createdId, userId, uploadedShotPath]);

  return (
    <div className="flex flex-col flex-1 px-4 py-4 bg-background">
      <canvas ref={canvasRef} className="hidden" />

      {!isComposing && (
        <div className="flex items-center gap-2.5 mb-3">
          <CheckCircle2 className="size-5 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]" style={{ color: "#C8FF09" }} />
          <div>
            <p className="text-sm font-bold leading-tight">Your recreeshot is live!</p>
            <p className="text-xs text-muted-foreground">Hold the image below to save to Photos</p>
          </div>
        </div>
      )}

      {/* 이미지 영역 */}
      <div className="relative mx-auto h-[50dvh] aspect-[4/5] shadow-md overflow-hidden rounded-xl">
        {compositeUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- compositeUrl은 canvas에서 생성된 blob URL, next/image 사용 불가 */}
            <img
              src={compositeUrl}
              alt="recreeshot"
              className="w-full h-full object-cover"
            />
          </>
        ) : (
          <>
            <ReCreeshotImage
              shotUrl={shotPreviewUrl}
              referenceUrl={referencePreviewUrl}
              matchScore={matchScore}
              showBadge={showBadge}
              referencePosition="top-left"
              badgePosition="top-right"
              className="w-full h-full"
              sizes="100vw"
            />
            {isComposing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex size-16 rounded-full bg-brand/40 animate-ping" />
                  <span className="relative inline-flex size-10 rounded-full bg-brand/80 items-center justify-center">
                    <span className="text-black text-[10px] font-bold text-center leading-tight">
                      Ready
                    </span>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="mt-4 space-y-2">
        {compositeUrl && (
          <div className="flex gap-2">
            {/* Download — 웹 브라우저용 */}
            <a
              href={compositeUrl}
              download="recreeshot.jpg"
              className="flex items-center justify-center gap-2 flex-1 py-3 rounded-full font-semibold text-sm border border-border"
            >
              <Download className="size-4" />
              Download
            </a>
            {/* Flex it — 페이지 링크 공유 */}
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.share({
                    title: "My recreeshot on reCree",
                    url: `${window.location.origin}/discover/hall/${createdId}`,
                  });
                } catch {
                  // 취소 또는 미지원 시 무시
                }
              }}
              className="flex items-center justify-center gap-2 flex-1 py-3 rounded-full font-semibold text-sm border border-border"
            >
              <Share2 className="size-4" />
              Flex it
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => router.replace(`/discover/hall/${createdId}`)}
          className="flex items-center justify-center w-full py-3 rounded-full font-semibold text-sm bg-brand text-black"
        >
          {isComposing ? "Skip" : "Done"}
        </button>
      </div>
    </div>
  );
}

