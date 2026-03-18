"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CROP_RATIO = 3 / 2;  // width / height

interface DragState {
  startX: number; startY: number;
  startBoxX: number; startBoxY: number;
  boxW: number; boxH: number;
  iw: number; ih: number;
}

interface Props {
  open: boolean;
  imageUrl: string;
  focalX: number | null;
  focalY: number | null;
  onConfirm: (focalX: number, focalY: number) => void;
  onClose: () => void;
}

export function ImageFocalPointDialog({
  open, imageUrl, focalX, focalY, onConfirm, onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [boxPos, setBoxPos] = useState({ x: 0, y: 0 });
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const boxPosRef = useRef({ x: 0, y: 0 });
  const boxSizeRef = useRef({ w: 0, h: 0 });
  const imgSizeRef = useRef({ w: 0, h: 0 });
  const initialized = useRef(false);
  const draggingRef = useRef<DragState | null>(null);

  // open 때마다 리셋
  useEffect(() => {
    if (!open) return;
    initialized.current = false;
    const img = imgRef.current;
    const container = containerRef.current;
    if (img?.complete && img.naturalWidth > 0 && container) {
      init(container, img);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, imageUrl]);

  function init(container: HTMLDivElement, img: HTMLImageElement) {
    if (initialized.current) return;
    const iw = container.clientWidth;
    if (iw === 0) return;
    initialized.current = true;

    const ih = Math.round(iw * (img.naturalHeight / img.naturalWidth));
    imgSizeRef.current = { w: iw, h: ih };

    // 박스 크기: 좌우 100% 또는 상하 100% (3:2 비율 유지)
    const bw = Math.min(iw, ih * CROP_RATIO);
    const bh = bw / CROP_RATIO;
    setBoxSize({ w: bw, h: bh });
    boxSizeRef.current = { w: bw, h: bh };

    const fx = focalX ?? 0.5;
    const fy = focalY ?? 0.5;
    const pos = {
      x: Math.max(0, Math.min(iw - bw, fx * iw - bw / 2)),
      y: Math.max(0, Math.min(ih - bh, fy * ih - bh / 2)),
    };
    setBoxPos(pos);
    boxPosRef.current = pos;
  }

  function onImageLoad() {
    const img = imgRef.current;
    const container = containerRef.current;
    if (img && container) init(container, img);
  }

  // window 레벨 이동 처리
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = draggingRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      const pos = {
        x: Math.max(0, Math.min(d.iw - d.boxW, d.startBoxX + dx)),
        y: Math.max(0, Math.min(d.ih - d.boxH, d.startBoxY + dy)),
      };
      setBoxPos(pos);
      boxPosRef.current = pos;
    }

    function onUp() {
      draggingRef.current = null;
      setIsDragging(false);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function startDrag(e: React.PointerEvent) {
    e.preventDefault();
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const iw = container.clientWidth;
    const ih = Math.round(iw * (img.naturalHeight / img.naturalWidth));
    imgSizeRef.current = { w: iw, h: ih };
    const { w: bw, h: bh } = boxSizeRef.current;
    draggingRef.current = {
      startX: e.clientX, startY: e.clientY,
      startBoxX: boxPosRef.current.x, startBoxY: boxPosRef.current.y,
      boxW: bw, boxH: bh,
      iw, ih,
    };
    setIsDragging(true);
  }

  function handleConfirm() {
    const { w: iw, h: ih } = imgSizeRef.current;
    const { w: bw, h: bh } = boxSizeRef.current;
    const pos = boxPosRef.current;
    if (iw === 0 || bw === 0) { onConfirm(focalX ?? 0.5, focalY ?? 0.5); return; }
    onConfirm(
      Math.max(0, Math.min(1, (pos.x + bw / 2) / iw)),
      Math.max(0, Math.min(1, (pos.y + bh / 2) / ih)),
    );
  }

  const { w: bw, h: bh } = boxSize;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>보이는 영역 설정</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          사각형을 드래그해 보이는 영역을 선택하세요.
        </p>

        <div ref={containerRef} className="relative select-none overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            className="w-full h-auto block"
            draggable={false}
            onLoad={onImageLoad}
          />

          {bw > 0 && (
            <>
              {/* 어두운 오버레이 4분할 */}
              <div className="absolute inset-x-0 top-0 bg-black/55 pointer-events-none"
                style={{ height: boxPos.y }} />
              <div className="absolute inset-x-0 bg-black/55 pointer-events-none"
                style={{ top: boxPos.y + bh, bottom: 0 }} />
              <div className="absolute bg-black/55 pointer-events-none"
                style={{ left: 0, top: boxPos.y, width: boxPos.x, height: bh }} />
              <div className="absolute bg-black/55 pointer-events-none"
                style={{ left: boxPos.x + bw, top: boxPos.y, right: 0, height: bh }} />

              {/* 크롭 박스 (이동) */}
              <div
                className="absolute"
                style={{
                  left: boxPos.x, top: boxPos.y,
                  width: bw, height: bh,
                  border: "2px dashed rgba(255,255,255,0.8)",
                  cursor: isDragging ? "grabbing" : "grab",
                  touchAction: "none",
                }}
                onPointerDown={startDrag}
              />
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="button" onClick={handleConfirm}>적용</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
