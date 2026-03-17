"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Share2, ArrowRight } from "lucide-react";

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
    async function compose() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const SIZE = 1080;
      canvas.width = SIZE;
      canvas.height = SIZE * (4 / 3);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 메인 shot 이미지 로드
      const shotImg = await loadImage(shotPreviewUrl);
      ctx.drawImage(shotImg, 0, 0, canvas.width, canvas.height);

      // original 썸네일 (좌상단, 25% 너비, 동일 비율)
      if (referencePreviewUrl) {
        const refImg = await loadImage(referencePreviewUrl);
        const thumbW = canvas.width * 0.25;
        const thumbH = thumbW * (4 / 3);
        const thumbX = canvas.width * 0.03;
        const thumbY = canvas.width * 0.03;
        const radius = 16;

        // 둥근 클리핑
        ctx.save();
        roundedRect(ctx, thumbX, thumbY, thumbW, thumbH, radius);
        ctx.clip();
        ctx.drawImage(refImg, thumbX, thumbY, thumbW, thumbH);
        ctx.restore();

        // 흰색 테두리
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        roundedRect(ctx, thumbX, thumbY, thumbW, thumbH, radius);
        ctx.stroke();
        ctx.restore();
      }

      // 배지 (우상단)
      if (showBadge && matchScore !== null) {
        const badgeText = `${matchScore}% Match`;
        const badgePadX = 20;
        const badgePadY = 12;
        const fontSize = 28;
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(badgeText).width;
        const badgeW = textWidth + badgePadX * 2;
        const badgeH = fontSize + badgePadY * 2;
        const badgeX = canvas.width - badgeW - canvas.width * 0.03;
        const badgeY = canvas.width * 0.03;

        ctx.save();
        ctx.fillStyle = "#C8FF09";
        roundedRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
        ctx.fill();
        ctx.fillStyle = "#000000";
        ctx.textBaseline = "middle";
        ctx.fillText(badgeText, badgeX + badgePadX, badgeY + badgeH / 2);
        ctx.restore();
      }

      // blob → URL + File
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const file = new File([blob], "recreeshot.jpg", { type: "image/jpeg" });
        setCompositeUrl(url);
        setCompositeFile(file);
        setIsComposing(false);
      }, "image/jpeg", 0.92);
    }

    compose();
  }, [shotPreviewUrl, referencePreviewUrl, matchScore, showBadge]);

  async function handleShare() {
    if (!compositeFile) return;
    try {
      if (navigator.share && navigator.canShare({ files: [compositeFile] })) {
        await navigator.share({ files: [compositeFile], title: "My reCreeshot" });
      } else if (compositeUrl) {
        const a = document.createElement("a");
        a.href = compositeUrl;
        a.download = "recreeshot.jpg";
        a.click();
      }
    } catch {
      // 공유 취소는 무시
    }
  }

  function handleDone() {
    router.push(`/explore/hall/${createdId}`);
  }

  return (
    <div className="flex flex-col flex-1 bg-black">
      {/* 합성 이미지 표시 */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />
        {isComposing ? (
          <div className="flex items-center justify-center size-full">
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex size-24 rounded-full bg-brand/40 animate-ping" />
              <span className="relative inline-flex size-16 rounded-full bg-brand/80 items-center justify-center">
                <span className="text-black text-xs font-bold text-center leading-tight">
                  Creating<br />image
                </span>
              </span>
            </div>
          </div>
        ) : compositeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={compositeUrl}
            alt="composite"
            className="w-full h-full object-contain"
          />
        ) : null}
      </div>

      {/* 하단 버튼 */}
      <div className="px-4 py-4 space-y-2 bg-black">
        {!isComposing && (
          <>
            {compositeUrl && (
              <a
                href={compositeUrl}
                download="recreeshot.jpg"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-sm bg-white text-black"
              >
                <Download className="size-4" />
                Save image
              </a>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-sm bg-brand text-black"
            >
              <Share2 className="size-4" />
              Share
            </button>
          </>
        )}
        <button
          type="button"
          onClick={handleDone}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-sm text-white/70"
        >
          {isComposing ? "Skip" : "Done"}
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
