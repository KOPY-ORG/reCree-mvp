"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Share2, CheckCircle2 } from "lucide-react";
import { ReCreeshotImage } from "@/components/recreeshot-image";

interface Props {
  shotPreviewUrl: string;
  referencePreviewUrl: string | null;
  matchScore: number | null;
  showBadge: boolean;
  createdId: string;
}

export function UploadStep3({
  shotPreviewUrl,
  referencePreviewUrl,
  matchScore,
  showBadge,
  createdId,
}: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [compositeFile, setCompositeFile] = useState<File | null>(null);
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
      ctx.drawImage(shotImg, 0, 0, W, H);

      if (referencePreviewUrl) {
        const refImg = await loadImage(referencePreviewUrl);
        const thumbW = W * 0.18;
        const thumbH = thumbW * (5 / 4);
        const thumbX = W * 0.03;
        const thumbY = W * 0.03;
        const thumbR = Math.round(thumbW * 0.12);

        // 1. 글로우 (CSS boxShadow 재현): frosted glass 전에 그려야 섬네일 이미지로 안이 가려짐
        ctx.save();
        ctx.shadowColor = "rgba(255,255,255,0.75)";
        ctx.shadowBlur = 60;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
        ctx.fill();
        ctx.restore();

        // 2. frosted glass (클립 안 — 글로우 fill 위를 덮음)
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
        ctx.clip();
        ctx.filter = "blur(12px)";
        ctx.drawImage(shotImg, 0, 0, W, H);
        ctx.filter = "none";
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
        ctx.restore();

        // 3. original 이미지
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
        ctx.clip();
        ctx.drawImage(refImg, thumbX, thumbY, thumbW, thumbH);
        ctx.restore();

        // 4. 흰색 테두리
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
        ctx.stroke();
        ctx.restore();
      }

      if (showBadge && matchScore !== null) {
        const badgeText = `${Math.round(matchScore)}% Match`;
        const fontSize = 32;
        const badgePadX = 28;
        const badgePadY = 20;
        ctx.font = `700 ${fontSize}px -apple-system, Helvetica Neue, sans-serif`;
        const textW = ctx.measureText(badgeText).width;
        const badgeW = textW + badgePadX * 2;
        const badgeH = fontSize + badgePadY * 2;
        const badgeX = W - badgeW - W * 0.03;
        const badgeY = W * 0.03;

        const grad = ctx.createLinearGradient(badgeX, 0, badgeX + badgeW * 1.5, 0);
        grad.addColorStop(0, "#C8FF09");
        grad.addColorStop(1, "#ffffff");

        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.15)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = "#000000";
        ctx.font = `700 ${fontSize}px -apple-system, Helvetica Neue, sans-serif`;
        ctx.textBaseline = "alphabetic";
        const textY = badgeY + badgePadY + fontSize * 0.82;
        ctx.fillText(badgeText, badgeX + badgePadX, textY);
        ctx.restore();
      }

      ctx.save();
      ctx.font = `600 28px 'Noto Sans', sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.textBaseline = "alphabetic";
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      const watermarkText = "reCree";
      const watermarkX = W - ctx.measureText(watermarkText).width - W * 0.03;
      const watermarkY = H - W * 0.03;
      ctx.fillText(watermarkText, watermarkX, watermarkY);
      ctx.restore();

      canvas.toBlob((blob) => {
        if (!blob) return;
        objectUrl = URL.createObjectURL(blob);
        setCompositeUrl(objectUrl);
        setCompositeFile(new File([blob], "recreeshot.jpg", { type: "image/jpeg" }));
        setIsComposing(false);
      }, "image/jpeg", 0.92);
    }

    compose();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [shotPreviewUrl, referencePreviewUrl, matchScore, showBadge]);

  return (
    <div className="flex flex-col flex-1 px-4 py-4 bg-background">
      <canvas ref={canvasRef} className="hidden" />

      {/* 완료 표시 */}
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
      <div className="relative mx-auto h-[50dvh] aspect-[4/5] shadow-md overflow-hidden">
        {compositeUrl ? (
          /* 합성 완료: img 태그로 표시 → iOS에서 꾹 눌러 Photos 저장 가능 */
          <img
            src={compositeUrl}
            alt="recreeshot"
            className="w-full h-full object-cover"
          />
        ) : (
          /* 합성 중: 미리보기 + 로딩 오버레이 */
          <>
            <ReCreeshotImage
              shotUrl={shotPreviewUrl}
              referenceUrl={referencePreviewUrl}
              matchScore={matchScore}
              showBadge={showBadge}
              referencePosition="top-left"
              badgePosition="top-right"
              rounded={false}
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
        {compositeUrl && compositeFile && (
          <div className="flex gap-2">
            <a
              href={compositeUrl}
              download="recreeshot.jpg"
              className="flex items-center justify-center gap-2 flex-1 py-3 rounded-full font-semibold text-sm border border-border"
            >
              <Download className="size-4" />
              Save
            </a>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.share({
                    title: "My recreeshot on reCree",
                    url: `${window.location.origin}/explore/hall/${createdId}`,
                  });
                } catch {
                  // 취소 또는 미지원 시 무시
                }
              }}
              className="flex items-center justify-center gap-2 flex-1 py-3 rounded-full font-semibold text-sm border border-border"
            >
              <Share2 className="size-4" />
              Share
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => router.push(`/explore/hall/${createdId}`)}
          className="flex items-center justify-center w-full py-3 rounded-full font-semibold text-sm bg-brand text-black"
        >
          {isComposing ? "Skip" : "Done"}
        </button>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
