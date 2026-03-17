"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Zap, CheckCircle2 } from "lucide-react";
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
    async function compose() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // 미리보기와 동일한 비율로 캔버스 생성 (패딩 없음)
      const W = 1080;
      const H = W * (4 / 3);
      canvas.width = W;
      canvas.height = H;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 메인 shot — 직사각형 (라운드 없음)
      const shotImg = await loadImage(shotPreviewUrl);
      ctx.drawImage(shotImg, 0, 0, W, H);

      // original 썸네일 (좌상단, 18% 너비, 미리보기와 동일 비율)
      if (referencePreviewUrl) {
        const refImg = await loadImage(referencePreviewUrl);
        const thumbW = W * 0.18;
        const thumbH = thumbW * (4 / 3);
        const thumbX = W * 0.03;
        const thumbY = W * 0.03; // 좌상단
        // rounded-xl = 12px on ~54px element(미리보기) → 비율 약 22%
        const thumbR = Math.round(thumbW * 0.12);

        // frosted glass 효과: clip 안에서 main shot을 blur로 그리기
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

        // 흰색 글로우 레이어 — 이미지 그리기 전에 테두리 바깥에만
        ctx.save();
        ctx.filter = "blur(8px)";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.roundRect(thumbX - 2, thumbY - 2, thumbW + 4, thumbH + 4, thumbR + 2);
        ctx.fill();
        ctx.filter = "none";
        ctx.restore();

        // original 이미지 그리기 (글로우 위에)
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

      // 배지 (우하단)
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
        const badgeY = W * 0.03; // 우상단

        // 그라데이션 (미리보기와 동일: 좌→우 brand→white)
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

        // 텍스트 — alphabetic baseline으로 정확한 수직 중앙 정렬
        ctx.save();
        ctx.fillStyle = "#000000";
        ctx.font = `700 ${fontSize}px -apple-system, Helvetica Neue, sans-serif`;
        ctx.textBaseline = "alphabetic";
        const textY = badgeY + badgePadY + fontSize * 0.82;
        ctx.fillText(badgeText, badgeX + badgePadX, textY);
        ctx.restore();
      }

      // 워터마크 (우하단)
      ctx.save();
      ctx.font = `600 28px 'Noto Sans', sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.textBaseline = "alphabetic";
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      const watermarkText = "reCree";
      const watermarkX = W - ctx.measureText(watermarkText).width - W * 0.03;
      const watermarkY = H - W * 0.03;
      ctx.fillText(watermarkText, watermarkX, watermarkY);
      ctx.restore();

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
        await navigator.share({ files: [compositeFile], title: "My recreeshot" });
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

  return (
    <div className="flex flex-col flex-1 px-4 py-4 bg-background">
      <canvas ref={canvasRef} className="hidden" />

      {/* 완료 표시 */}
      {!isComposing && (
        <div className="flex items-center gap-2.5 mb-3">
          <CheckCircle2 className="size-5 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]" style={{ color: "#C8FF09" }} />
          <div>
            <p className="text-sm font-bold leading-tight">Your recreeshot is live!</p>
            <p className="text-xs text-muted-foreground">Save or share it with your friends</p>
          </div>
        </div>
      )}

      {/* 이미지 — Step 1/2와 동일한 비율·스타일 */}
      <div className="relative mx-auto h-[50dvh] aspect-[3/4] shadow-md">
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

        {/* 워터마크 */}
        <p className="absolute bottom-2 right-2.5 z-10 text-white/75 text-[11px] font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] pointer-events-none select-none" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
          reCree
        </p>

        {/* 합성 중 로딩 오버레이 */}
        {isComposing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl z-10">
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
      </div>

      {/* 하단 버튼 */}
      <div className="mt-4 space-y-2">
        {!isComposing && compositeUrl && (
          <a
            href={compositeUrl}
            download="recreeshot.jpg"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-sm border border-border"
          >
            <Download className="size-4" />
            Save image
          </a>
        )}
        {!isComposing && (
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-full font-semibold text-sm bg-brand text-black"
          >
            <Zap className="size-4" />
            Flex it
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push(`/explore/hall/${createdId}`)}
          className="flex items-center justify-center w-full py-3 rounded-full font-semibold text-sm text-muted-foreground"
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
