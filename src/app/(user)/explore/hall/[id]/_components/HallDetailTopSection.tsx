"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, MoreVertical, Download, Pencil, Trash2, Flag } from "lucide-react";
import { showError } from "@/lib/toast";
import { deleteReCreeshot } from "@/app/(user)/_actions/recreeshot-actions";
import { ReportDialog } from "@/components/ReportDialog";

interface Props {
  id: string;
  isOwner: boolean;
  isLoggedIn: boolean;
  imageUrl: string;
  referencePhotoUrl: string | null;
  matchScore: number | null;
  showBadge: boolean;
}

export function HallDetailTopSection({ id, isOwner, isLoggedIn, imageUrl, referencePhotoUrl, matchScore, showBadge }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  function handleBack() {
    if (from === "profile") {
      router.push("/profile");
    } else {
      router.back();
    }
  }
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

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

          ctx.save();
          ctx.shadowColor = "rgba(255,255,255,0.75)";
          ctx.shadowBlur = 60;
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.beginPath();
          ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
          ctx.fill();
          ctx.restore();

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

          ctx.save();
          ctx.beginPath();
          ctx.roundRect(thumbX, thumbY, thumbW, thumbH, thumbR);
          ctx.clip();
          ctx.drawImage(refImg, thumbX, thumbY, thumbW, thumbH);
          ctx.restore();

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
          const badgePadY = 10;
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
          ctx.fillText(badgeText, badgeX + badgePadX, badgeY + badgePadY + fontSize * 0.82);
          ctx.restore();
        }

        // imageUrl에 워터마크가 이미 포함되어 있으므로 별도 렌더링 불필요

        canvas.toBlob((blob) => {
          if (!blob) return;
          objectUrl = URL.createObjectURL(blob);
          setCompositeUrl(objectUrl);
        }, "image/jpeg", 0.92);
      } catch {
        // CORS 실패 등 → compositeUrl 없이 imageUrl fallback
      }
    }

    compose();
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [imageUrl, referencePhotoUrl, matchScore, showBadge]);

  function handleSave() {
    setMenuOpen(false);
    const url = compositeUrl ?? imageUrl;
    const a = document.createElement("a");
    a.href = url;
    a.download = "recreeshot.jpg";
    a.click();
  }

  async function handleDelete() {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    const result = await deleteReCreeshot(id);
    if (result.error) {
      showError("Failed to delete. Please try again.");
      setIsDeleting(false);
      return;
    }
    router.push("/explore?tab=hall");
  }

  function handleReport() {
    setMenuOpen(false);
    if (!isLoggedIn) {
      showError("Please sign in to report content.");
      return;
    }
    setReportOpen(true);
  }

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        reCreeshotId={id}
      />

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

      {/* 헤더 */}
      <div className="flex items-center justify-between px-2 h-12 bg-white border-b border-gray-100">
        <button type="button" onClick={handleBack} className="p-2 rounded-full">
          <ChevronLeft className="size-5 text-black" />
        </button>

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
              <div className="absolute top-10 right-0 z-20 bg-white/80 backdrop-blur-md rounded-xl shadow-md overflow-hidden min-w-[160px]">
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100"
                    >
                      <Download className="size-4 shrink-0" />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); router.push(`/explore/hall/${id}/edit`); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100"
                    >
                      <Pencil className="size-4 shrink-0" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); setShowDeleteConfirm(true); }}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-red-500 hover:bg-gray-50 transition-colors"
                    >
                      <Trash2 className="size-4 shrink-0" />
                      Delete
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleReport}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <Flag className="size-4 shrink-0" />
                    Report
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 이미지 — canvas 합성본 표시 (꾹 눌러 저장 시 동일 이미지) */}
      <div className="relative aspect-[4/5] bg-muted">
        <img
          src={compositeUrl ?? imageUrl}
          alt="recreeshot"
          className="w-full h-full object-cover"
        />
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
