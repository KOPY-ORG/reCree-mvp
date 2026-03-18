"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MoreVertical, Download, Pencil, Trash2, Flag } from "lucide-react";
import { toast } from "sonner";
import { deleteReCreeshot } from "@/app/(user)/_actions/recreeshot-actions";
import { ReCreeshotImage } from "@/components/recreeshot-image";

interface Props {
  id: string;
  isOwner: boolean;
  imageUrl: string;
  referencePhotoUrl: string | null;
  matchScore: number | null;
  showBadge: boolean;
}

export function HallDetailTopSection({ id, isOwner, imageUrl, referencePhotoUrl, matchScore, showBadge }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const compositeFileRef = useRef<File | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 마운트 시 canvas 합성 → compositeUrl 생성
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

      try {
        const shotImg = await loadImage(imageUrl);
        ctx.drawImage(shotImg, 0, 0, W, H);

        if (referencePhotoUrl) {
          const refImg = await loadImage(referencePhotoUrl);
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
          ctx.fillStyle = "rgba(255,255,255,0.15)";
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
          objectUrl = URL.createObjectURL(blob);
          compositeFileRef.current = new File([blob], "recreeshot.jpg", { type: "image/jpeg" });
          setCompositeUrl(objectUrl);
        }, "image/jpeg", 0.92);
      } catch {
        // CORS 등 실패 시 무시
      }
    }

    compose();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl, referencePhotoUrl, matchScore, showBadge]);

  async function handleDelete() {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    const result = await deleteReCreeshot(id);
    if (result.error) {
      toast.error("Failed to delete. Please try again.");
      setIsDeleting(false);
      return;
    }
    router.push("/explore?tab=hall");
  }

  function handleReport() {
    setMenuOpen(false);
    toast.success("Report submitted. Thank you.");
  }

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-background rounded-2xl w-full max-w-xs p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-base">Delete recreeshot?</p>
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-full text-sm font-medium border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-red-500 text-white disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 흰색 헤더 */}
      <div className="flex items-center justify-between px-2 h-12 bg-white border-b border-gray-100">
        <Link href="/explore?tab=hall" className="p-2 rounded-full">
          <ChevronLeft className="size-5 text-black" />
        </Link>

        {/* 3-dot 메뉴 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            disabled={isDeleting}
            className="p-2 rounded-full disabled:opacity-50"
          >
            <MoreVertical className="size-5 text-black" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute top-10 right-0 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-max">
                {isOwner ? (
                  <>
                    {compositeUrl ? (
                      <a
                        href={compositeUrl}
                        download="recreeshot.jpg"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 w-full px-3.5 py-2.5 text-xs font-medium text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100"
                      >
                        <Download className="size-3.5 shrink-0" />
                        Save image
                      </a>
                    ) : (
                      <div className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-gray-400 border-b border-gray-100">
                        <Download className="size-3.5 shrink-0" />
                        Preparing...
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); router.push(`/explore/hall/${id}/edit`); }}
                      className="flex items-center gap-2 w-full px-3.5 py-2.5 text-xs font-medium text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100"
                    >
                      <Pencil className="size-3.5 shrink-0" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); setShowDeleteConfirm(true); }}
                      className="flex items-center gap-2 w-full px-3.5 py-2.5 text-xs font-medium text-red-500 hover:bg-gray-50 transition-colors"
                    >
                      <Trash2 className="size-3.5 shrink-0" />
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleReport}
                    className="flex items-center gap-2 w-full px-3.5 py-2.5 text-xs font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <Flag className="size-3.5 shrink-0" />
                    Report
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 이미지 영역 — Step3와 동일한 비율·구성 */}
      <div className="relative aspect-[4/5] bg-muted">
        {compositeUrl ? (
          /* 합성 완료: img 태그로 표시 → iOS 꾹 눌러 Photos 저장 가능 */
          <img
            src={compositeUrl}
            alt="recreeshot"
            className="w-full h-full object-cover"
          />
        ) : (
          /* 합성 중: ReCreeshotImage 미리보기 */
          <ReCreeshotImage
            shotUrl={imageUrl}
            referenceUrl={referencePhotoUrl}
            matchScore={matchScore}
            showBadge={showBadge}
            referencePosition="top-left"
            badgePosition="top-right"
            rounded={false}
            className="w-full h-full"
            sizes="(max-width: 672px) 100vw, 672px"
            priority
          />
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
