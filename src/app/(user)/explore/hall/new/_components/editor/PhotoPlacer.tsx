"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ImageCropOverlay } from "../ImageCropOverlay";
import { getTemplateConfig } from "./template-config";
import type { TemplateId } from "./editor-types";

// 슬롯 크롭 비율 (width/height) — template-config의 슬롯 치수에서 도출
function getSlotCropRatio(templateId: TemplateId): number {
  const config = getTemplateConfig(templateId);
  const slot = config.slots[0];
  return slot.width / slot.height;
}

interface PhotoSlotProps {
  label: string;
  sublabel: string;
  previewUrl: string | null;
  onPickFile: () => void;
  onRemove: () => void;
  aspectRatio: string; // CSS aspect-ratio value e.g. "16/9"
}

function PhotoSlotCard({ label, sublabel, previewUrl, onPickFile, onRemove, aspectRatio }: PhotoSlotProps) {
  return (
    <div className="flex-1 flex flex-col gap-1.5">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div
        className="relative w-full overflow-hidden rounded-xl bg-muted/40 border border-border"
        style={{ aspectRatio }}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/50 flex items-center justify-center"
            >
              <X className="size-3.5 text-white" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onPickFile}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
          >
            <div className="size-10 rounded-full bg-muted flex items-center justify-center">
              <Plus className="size-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">{sublabel}</p>
          </button>
        )}
      </div>
      {previewUrl && (
        <button
          type="button"
          onClick={onPickFile}
          className="text-xs text-muted-foreground underline underline-offset-2 text-center"
        >
          Change photo
        </button>
      )}
    </div>
  );
}

interface Props {
  templateId: TemplateId;
  referencePreviewUrl: string | null;
  shotPreviewUrl: string | null;
  onReferenceChange: (file: File) => void;
  onShotChange: (file: File) => void;
  onReferenceRemove: () => void;
  onShotRemove: () => void;
  onNext: () => void;
  isUploading?: boolean;
}

export function PhotoPlacer({
  templateId,
  referencePreviewUrl,
  shotPreviewUrl,
  onReferenceChange,
  onShotChange,
  onReferenceRemove,
  onShotRemove,
  onNext,
  isUploading,
}: Props) {
  const [pendingCrop, setPendingCrop] = useState<{ file: File; type: "reference" | "shot" } | null>(null);

  const cropRatio = getSlotCropRatio(templateId);
  const isVertical = templateId.startsWith("vertical");
  // CSS aspect-ratio: vertical 슬롯은 landscape(16/9), horizontal 슬롯은 portrait(5/8)
  const slotAspect = isVertical ? "16/9" : "5/8";

  const canProceed = !!shotPreviewUrl;

  function openFilePicker(type: "reference" | "shot") {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) setPendingCrop({ file, type });
    };
    input.click();
  }

  function handleCropConfirm(croppedFile: File) {
    if (!pendingCrop) return;
    if (pendingCrop.type === "reference") onReferenceChange(croppedFile);
    else onShotChange(croppedFile);
    setPendingCrop(null);
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-4">
        <p className="text-sm text-muted-foreground">Add your photos to the selected layout</p>

        {/* 세로 템플릿: 상하 배치 / 가로 템플릿: 좌우 배치 */}
        <div className={`flex gap-3 ${isVertical ? "flex-col" : "flex-row items-start"}`}>
          <PhotoSlotCard
            label="Original"
            sublabel="Add original photo"
            previewUrl={referencePreviewUrl}
            onPickFile={() => openFilePicker("reference")}
            onRemove={onReferenceRemove}
            aspectRatio={slotAspect}
          />
          <PhotoSlotCard
            label="Me"
            sublabel="Add your recreation"
            previewUrl={shotPreviewUrl}
            onPickFile={() => openFilePicker("shot")}
            onRemove={onShotRemove}
            aspectRatio={slotAspect}
          />
        </div>

        {!canProceed && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            Add your recreation photo to continue
          </p>
        )}
      </div>

      <div className="px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed || isUploading}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading ? "Uploading..." : "Next"}
        </button>
      </div>

      {pendingCrop && (
        <ImageCropOverlay
          file={pendingCrop.file}
          cropRatio={cropRatio}
          onConfirm={handleCropConfirm}
          onClose={() => setPendingCrop(null)}
        />
      )}
    </div>
  );
}
