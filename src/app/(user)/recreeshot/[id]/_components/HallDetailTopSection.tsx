"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, MoreVertical, Download, Pencil, Trash2, Flag } from "lucide-react";
import { showError } from "@/lib/toast";
import { deleteReCreeshot } from "@/app/(user)/_actions/recreeshot-actions";
import { ReportDialog } from "@/components/ReportDialog";
import { coverRect, loadImage } from "@/lib/canvas-utils";

interface Props {
  id: string;
  isOwner: boolean;
  isLoggedIn: boolean;
  imageUrl: string;
  referencePhotoUrl: string | null;
}

export function HallDetailTopSection({ id, isOwner, isLoggedIn, imageUrl, referencePhotoUrl }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const savedTab = searchParams.get("savedTab");

  function handleBack() {
    if (from === "profile") router.push("/profile");
    else if (from === "saved") router.push(savedTab ? `/saved?tab=${savedTab}` : "/saved");
    else if (from === "new") router.push("/recreeshot");
    else router.back();
  }
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  /** 다운로드 시에만 캔버스 합성 실행 */
  async function composeForDownload(): Promise<string> {
    const canvas = canvasRef.current!;
    const W = 1080;
    const H = W * (5 / 4);
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    const proxy = (url: string) => `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const shotImg = await loadImage(proxy(imageUrl));
    const { sx, sy, sw, sh } = coverRect(shotImg.naturalWidth, shotImg.naturalHeight, W, H);
    ctx.drawImage(shotImg, sx, sy, sw, sh, 0, 0, W, H);

    if (referencePhotoUrl) {
      const refImg = await loadImage(proxy(referencePhotoUrl));
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
      ctx.drawImage(shotImg, sx, sy, sw, sh, 0, 0, W, H);
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


    return new Promise<string>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error("toBlob returned null")); return; }
        resolve(URL.createObjectURL(blob));
      }, "image/jpeg", 0.92);
    });
  }

  function triggerDownload(blobUrl: string, filename: string) {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);   // Safari: DOM 삽입돼야 신뢰된 click
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  }

  async function handleSave() {
    setMenuOpen(false);
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const url = await composeForDownload();   // 항상 blob:
      triggerDownload(url, "recreeshot.jpg");
    } catch {
      try {
        const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`);
        if (!res.ok) throw new Error("proxy fetch failed");
        const blob = await res.blob();
        triggerDownload(URL.createObjectURL(blob), "recreeshot.jpg");
      } catch {
        showError("이미지를 다운로드하지 못했어요. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setIsDownloading(false);
    }
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
    if (from === "profile") router.push("/profile");
    else router.push("/recreeshot");
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
                      disabled={isDownloading}
                      className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="size-4 shrink-0" />
                      {isDownloading ? "Downloading..." : "Download"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); router.push(`/recreeshot/${id}/edit`); }}
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

      {/* 이미지 — HTML 오버레이 방식 (CORS 불필요) */}
      <div className="px-4">
      <div className="relative aspect-[4/5] bg-muted overflow-hidden shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element -- HTML 오버레이 렌더링(CORS 불필요), 사용자 업로드 이미지 */}
        <img
          src={imageUrl}
          alt="recreeshot"
          className="w-full h-full object-cover"
        />

        {/* 레퍼런스 사진 오버레이 (좌상단) */}
        {referencePhotoUrl && (
          <div
            className="absolute"
            style={{ top: "3%", left: "3%", width: "18%", aspectRatio: "4/5", zIndex: 10 }}
          >
            <div
              style={{
                position: "absolute",
                inset: "-12%",
                background: "rgba(255,255,255,0.3)",
                filter: "blur(5px)",
                zIndex: -1,
              }}
            />
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                outline: "1px solid white",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- 레퍼런스 오버레이: 외부 사용자 이미지 */}
              <img src={referencePhotoUrl} alt="original" className="w-full h-full object-cover" />
            </div>
          </div>
        )}

      </div>
      </div>
    </>
  );
}

