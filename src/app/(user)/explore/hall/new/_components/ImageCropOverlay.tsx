"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";

const CROP_RATIO = 4 / 5; // width / height
const MIN_BOX_W = 80;

type DragMode = "move" | "tl" | "tr" | "bl" | "br";

interface DragState {
  mode: DragMode;
  startX: number;
  startY: number;
  startBox: { x: number; y: number; w: number; h: number };
  imgW: number;
  imgH: number;
}

interface Box { x: number; y: number; w: number; h: number }

interface Props {
  file: File;
  onConfirm: (croppedFile: File) => void;
  onClose: () => void;
}

export function ImageCropOverlay({ file, onConfirm, onClose }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [imgDisplayH, setImgDisplayH] = useState(0);
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const boxRef = useRef<Box>({ x: 0, y: 0, w: 0, h: 0 });
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function initCrop() {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || img.naturalWidth === 0) return;

    const dw = container.clientWidth;
    const dh = Math.round(dw * (img.naturalHeight / img.naturalWidth));
    setImgDisplayH(dh);

    let bw = dw;
    let bh = bw / CROP_RATIO;
    if (bh > dh) { bh = dh; bw = bh * CROP_RATIO; }

    const b = { x: (dw - bw) / 2, y: (dh - bh) / 2, w: bw, h: bh };
    setBox(b);
    boxRef.current = b;
  }

  function computeNewBox(drag: DragState, cx: number, cy: number): Box {
    const dx = cx - drag.startX;
    const dy = cy - drag.startY;
    const { x, y, w, h } = drag.startBox;
    const { imgW, imgH } = drag;

    let nx = x, ny = y, nw = w;

    if (drag.mode === "move") {
      nx = Math.max(0, Math.min(imgW - w, x + dx));
      ny = Math.max(0, Math.min(imgH - h, y + dy));
      return { x: nx, y: ny, w, h };
    }

    // 리사이즈: 주 드래그 축은 x (가로), ratio로 세로 유지
    if (drag.mode === "br") {
      nw = Math.max(MIN_BOX_W, w + dx);
    } else if (drag.mode === "bl") {
      nw = Math.max(MIN_BOX_W, w - dx);
    } else if (drag.mode === "tr") {
      nw = Math.max(MIN_BOX_W, w + dx);
    } else if (drag.mode === "tl") {
      nw = Math.max(MIN_BOX_W, w - dx);
    }

    let nh = nw / CROP_RATIO;

    // 이미지 경계 초과 보정
    if (drag.mode === "br") {
      if (x + nw > imgW) { nw = imgW - x; nh = nw / CROP_RATIO; }
      if (y + nh > imgH) { nh = imgH - y; nw = nh * CROP_RATIO; }
      nx = x; ny = y;
    } else if (drag.mode === "bl") {
      const fixedRight = x + w;
      nx = fixedRight - nw;
      if (nx < 0) { nx = 0; nw = fixedRight; nh = nw / CROP_RATIO; }
      if (y + nh > imgH) { nh = imgH - y; nw = nh * CROP_RATIO; nx = fixedRight - nw; }
      ny = y;
    } else if (drag.mode === "tr") {
      const fixedBottom = y + h;
      ny = fixedBottom - nh;
      if (x + nw > imgW) { nw = imgW - x; nh = nw / CROP_RATIO; }
      if (ny < 0) { ny = 0; nh = fixedBottom; nw = nh * CROP_RATIO; }
      nx = x;
    } else if (drag.mode === "tl") {
      const fixedRight = x + w;
      const fixedBottom = y + h;
      nx = fixedRight - nw;
      ny = fixedBottom - nh;
      if (nx < 0) { nx = 0; nw = fixedRight; nh = nw / CROP_RATIO; ny = fixedBottom - nh; }
      if (ny < 0) { ny = 0; nh = fixedBottom; nw = nh * CROP_RATIO; nx = fixedRight - nw; }
    }

    return { x: Math.max(0, nx), y: Math.max(0, ny), w: nw, h: nh };
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const b = computeNewBox(d, e.clientX, e.clientY);
      setBox(b);
      boxRef.current = b;
    }
    function onUp() { dragRef.current = null; setIsDragging(false); }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startDrag(e: React.PointerEvent, mode: DragMode) {
    e.preventDefault();
    e.stopPropagation();
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const dw = container.clientWidth;
    const dh = Math.round(dw * (img.naturalHeight / img.naturalWidth));
    dragRef.current = {
      mode,
      startX: e.clientX, startY: e.clientY,
      startBox: { ...boxRef.current },
      imgW: dw, imgH: dh,
    };
    setIsDragging(true);
  }

  async function handleConfirm() {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container || isProcessing) return;
    setIsProcessing(true);

    const dw = container.clientWidth;
    const scale = img.naturalWidth / dw;
    const { x: bx, y: by, w: bw, h: bh } = boxRef.current;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bw * scale);
    canvas.height = Math.round(bh * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(img, bx * scale, by * scale, bw * scale, bh * scale, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
      onConfirm(croppedFile);
    }, "image/jpeg", 0.92);
  }

  const { x: bx, y: by, w: bw, h: bh } = box;

  const HANDLE = 24; // 핸들 터치 영역 px

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button type="button" onClick={onClose} className="p-2 text-white">
          <X className="size-5" />
        </button>
        <p className="text-white text-sm font-semibold">Crop photo</p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isProcessing || bw === 0}
          className="px-3 py-1.5 text-sm font-bold text-black bg-brand rounded-full disabled:opacity-40"
        >
          {isProcessing ? "..." : "Done"}
        </button>
      </div>

      {/* 이미지 + 크롭박스 */}
      <div className="flex-1 flex items-center overflow-hidden">
        <div
          ref={containerRef}
          className="relative w-full select-none"
          style={{ height: imgDisplayH || undefined }}
        >
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              className="w-full h-auto block"
              draggable={false}
              onLoad={initCrop}
            />
          )}

          {bw > 0 && (
            <>
              {/* 어두운 오버레이 4분할 */}
              <div className="absolute inset-x-0 top-0 bg-black/60 pointer-events-none" style={{ height: by }} />
              <div className="absolute inset-x-0 bg-black/60 pointer-events-none" style={{ top: by + bh, bottom: 0 }} />
              <div className="absolute bg-black/60 pointer-events-none" style={{ left: 0, top: by, width: bx, height: bh }} />
              <div className="absolute bg-black/60 pointer-events-none" style={{ left: bx + bw, top: by, right: 0, height: bh }} />

              {/* 크롭박스 본체 (이동용) */}
              <div
                className="absolute"
                style={{
                  left: bx, top: by, width: bw, height: bh,
                  border: "1.5px solid rgba(255,255,255,0.85)",
                  cursor: isDragging ? "grabbing" : "grab",
                  touchAction: "none",
                }}
                onPointerDown={(e) => startDrag(e, "move")}
              >
                {/* 3분할 격자선 */}
                <div className="absolute inset-0 pointer-events-none" style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)
                  `,
                  backgroundSize: `${bw / 3}px ${bh / 3}px`,
                }} />
              </div>

              {/* 모서리 핸들 (리사이즈) — 크롭박스 밖에 렌더링해 z-index 충돌 방지 */}
              {(["tl", "tr", "bl", "br"] as DragMode[]).map((corner) => {
                const isL = corner.endsWith("l");
                const isT = corner.startsWith("t");
                const cx = isL ? bx : bx + bw;
                const cy = isT ? by : by + bh;
                const borderStyle = {
                  borderTop: isT ? "3px solid white" : "none",
                  borderBottom: !isT ? "3px solid white" : "none",
                  borderLeft: isL ? "3px solid white" : "none",
                  borderRight: !isL ? "3px solid white" : "none",
                };
                return (
                  <div
                    key={corner}
                    className="absolute"
                    style={{
                      left: cx - HANDLE / 2,
                      top: cy - HANDLE / 2,
                      width: HANDLE,
                      height: HANDLE,
                      cursor: corner === "tl" || corner === "br" ? "nwse-resize" : "nesw-resize",
                      touchAction: "none",
                      display: "flex",
                      alignItems: isT ? "flex-start" : "flex-end",
                      justifyContent: isL ? "flex-start" : "flex-end",
                    }}
                    onPointerDown={(e) => startDrag(e, corner)}
                  >
                    <div style={{ width: 16, height: 16, ...borderStyle }} />
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      <p className="text-center text-white/40 text-xs py-3 shrink-0">
        Drag to move · Drag corners to resize
      </p>
    </div>
  );
}
