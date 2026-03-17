"use client";

import { useRef, useState } from "react";
import { MoreVertical, Download } from "lucide-react";

interface Props {
  imageUrl: string;
  referencePhotoUrl: string | null;
  matchScore: number | null;
  showBadge: boolean;
}

export function HallDetailMenuButton({ imageUrl, referencePhotoUrl, matchScore, showBadge }: Props) {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function handleSaveImage() {
    setOpen(false);
    setIsGenerating(true);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = 1080;
    const H = W * (4 / 3);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const shotImg = await loadImage(imageUrl);
    ctx.drawImage(shotImg, 0, 0, W, H);

    if (referencePhotoUrl) {
      const refImg = await loadImage(referencePhotoUrl);
      const thumbW = W * 0.18;
      const thumbH = thumbW * (4 / 3);
      const thumbX = W * 0.03;
      const thumbY = W * 0.03;
      const thumbR = Math.round(thumbW * 0.12);

      // frosted glass
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
      ctx.clip();
      ctx.filter = "blur(12px)";
      ctx.drawImage(shotImg, 0, 0, W, H);
      ctx.filter = "none";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
      ctx.restore();

      // 글로우 레이어 — 이미지 그리기 전에
      ctx.save();
      ctx.filter = "blur(8px)";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.roundRect(thumbX - 2, thumbY - 2, thumbW + 4, thumbH + 4, thumbR + 2);
      ctx.fill();
      ctx.filter = "none";
      ctx.restore();

      // original 이미지 (글로우 위에)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
      ctx.clip();
      ctx.drawImage(refImg, thumbX, thumbY, thumbW, thumbH);
      ctx.restore();

      // 흰색 테두리
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
      ctx.stroke();
      ctx.restore();
    }

    // 배지
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

    // 워터마크
    ctx.save();
    ctx.font = `600 28px 'Noto Sans', sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    const watermarkText = "reCree";
    const watermarkX = W - ctx.measureText(watermarkText).width - W * 0.03;
    const watermarkY = H - W * 0.03;
    ctx.fillText(watermarkText, watermarkX, watermarkY);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recreeshot.jpg";
      a.click();
      URL.revokeObjectURL(url);
      setIsGenerating(false);
    }, "image/jpeg", 0.92);
  }

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-full"
        >
          <MoreVertical className="size-5 text-white" />
        </button>

        {open && (
          <>
            {/* 배경 dimmer */}
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute top-9 right-0 z-20 bg-background rounded-xl shadow-xl overflow-hidden min-w-[160px] border border-border/30">
              <button
                type="button"
                onClick={handleSaveImage}
                disabled={isGenerating}
                className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                <Download className="size-4 shrink-0" />
                {isGenerating ? "Saving..." : "Save image"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
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
