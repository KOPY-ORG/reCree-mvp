"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ASPECT = 4 / 5;

function initCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, ASPECT, width, height),
    width,
    height,
  );
}

async function getCroppedBlob(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = pixelCrop.width * scaleX;
  canvas.height = pixelCrop.height * scaleY;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(
    image,
    pixelCrop.x * scaleX,
    pixelCrop.y * scaleY,
    pixelCrop.width * scaleX,
    pixelCrop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
}

interface Props {
  open: boolean;
  imageSrc: string;       // 크롭할 원본 이미지 URL
  onConfirm: (blob: Blob) => void;
  onClose: () => void;
}

export function ReCreeshotCropDialog({ open, imageSrc, onConfirm, onClose }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [applying, setApplying] = useState(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(initCrop(width, height));
  }, []);

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop) return;
    setApplying(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      if (blob) onConfirm(blob);
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>리크리샷 기준 이미지 자르기</DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-1">
          4:5 비율로 고정됩니다. 드래그해서 영역을 조정하세요.
        </p>

        <div className="flex justify-center overflow-auto max-h-[60vh] bg-zinc-100 rounded-lg p-2">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={ASPECT}
            minWidth={80}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="crop source"
              onLoad={onImageLoad}
              style={{ maxHeight: "56vh", maxWidth: "100%", objectFit: "contain" }}
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={applying}>
            취소
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={applying || !completedCrop?.width}
          >
            {applying ? "적용 중..." : "적용"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
