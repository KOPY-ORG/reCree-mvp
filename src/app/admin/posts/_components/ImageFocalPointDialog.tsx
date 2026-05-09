"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, {
  centerCrop,
  convertToPixelCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
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

interface Props {
  open: boolean;
  imageUrl: string;
  aspect: number;
  onConfirm: (blob: Blob) => void;
  onClose: () => void;
}

async function getCroppedBlob(image: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob | null> {
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width * scaleX;
  canvas.height = pixelCrop.height * scaleY;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(
    image,
    pixelCrop.x * scaleX, pixelCrop.y * scaleY,
    pixelCrop.width * scaleX, pixelCrop.height * scaleY,
    0, 0, canvas.width, canvas.height,
  );
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92));
}

export function ImageFocalPointDialog({ open, imageUrl, aspect, onConfirm, onClose }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [applying, setApplying] = useState(false);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const initial = centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
        width, height,
      );
      setCrop(initial);
      setCompletedCrop(convertToPixelCrop(initial, width, height));
    },
    // open/imageUrl 변경 시 재실행 — aspect는 open 시점에 고정
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, imageUrl],
  );

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop?.width) return;
    setApplying(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      if (blob) onConfirm(blob);
    } finally {
      setApplying(false);
    }
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
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
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
          <Button type="button" variant="outline" onClick={onClose} disabled={applying}>취소</Button>
          <Button type="button" onClick={handleConfirm} disabled={applying || !completedCrop?.width}>
            {applying ? "적용 중..." : "적용"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
