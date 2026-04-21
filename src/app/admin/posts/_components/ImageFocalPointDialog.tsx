"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PercentCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ASPECT = 3 / 2;

interface Props {
  open: boolean;
  imageUrl: string;
  focalX: number | null;
  focalY: number | null;
  zoom: number | null;
  onConfirm: (focalX: number, focalY: number, zoom: number) => void;
  onClose: () => void;
}

export function ImageFocalPointDialog({
  open, imageUrl, focalX, focalY, zoom, onConfirm, onClose,
}: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PercentCrop>();

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;

      if (focalX != null && focalY != null && zoom != null && zoom > 1) {
        // Restore previous crop from saved focal + zoom
        const wPct = 100 / zoom;
        const hPct = (wPct / 100) * width / ASPECT / height * 100;
        const xPct = Math.max(0, Math.min(100 - wPct, focalX * 100 - wPct / 2));
        const yPct = Math.max(0, Math.min(100 - hPct, focalY * 100 - hPct / 2));
        setCrop({ unit: "%", x: xPct, y: yPct, width: wPct, height: hPct });
      } else {
        setCrop(centerCrop(makeAspectCrop({ unit: "%", width: 90 }, ASPECT, width, height), width, height));
      }
    },
    // open/imageUrl 변경 시 재실행되도록 — focalX/Y/zoom은 open 시점에 고정됨
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, imageUrl, focalX, focalY, zoom],
  );

  function handleConfirm() {
    if (!completedCrop?.width) return;
    const { x, y, width: w, height: h } = completedCrop;
    onConfirm(
      Math.max(0, Math.min(1, (x + w / 2) / 100)),
      Math.max(0, Math.min(1, (y + h / 2) / 100)),
      Math.max(1, 100 / w),
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>보이는 영역 설정</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          영역을 드래그해 이동하거나 모서리를 드래그해 크기를 조절하세요.
        </p>
        <div className="flex justify-center overflow-auto max-h-[60vh] bg-zinc-100 rounded-lg p-2">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(_, pc) => setCompletedCrop(pc)}
            aspect={ASPECT}
            minWidth={20}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              onLoad={onImageLoad}
              style={{ maxHeight: "56vh", maxWidth: "100%", objectFit: "contain" }}
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>취소</Button>
          <Button type="button" onClick={handleConfirm} disabled={!completedCrop?.width}>
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
