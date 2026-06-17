"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
import { ImageCropOverlay } from "../ImageCropOverlay";
import { getTemplateConfig } from "./template-config";
import { FONT_TECH, FONT_MONO, PersonIcon } from "./editor-shared";
import type { TemplateId } from "./editor-types";

// ── 헬퍼 ──────────────────────────────────────────────────────────────────────

function getSlotCropRatio(templateId: TemplateId, slotIndex: number): number {
  const config = getTemplateConfig(templateId);
  const slot = config.slots[slotIndex];
  return slot.width / slot.height;
}

// ── 프레임 캔버스 미리보기 ─────────────────────────────────────────────────────

interface SlotEntry {
  previewUrl: string | null;
  onClick: () => void;
  onRemove: () => void;
  sublabel: string;
}

function FrameCanvasPreview({
  templateId,
  slots: slotData,
}: {
  templateId: TemplateId;
  slots: SlotEntry[];
}) {
  const config = getTemplateConfig(templateId);
  const { canvasWidth, canvasHeight, frame, slots } = config;
  const pct = (v: number, total: number) => `${(v / total * 100).toFixed(3)}%`;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: `${canvasWidth} / ${canvasHeight}`,
        background: frame ? "#ffffff" : "transparent",
        boxShadow: "0 4px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* 사진 슬롯 */}
      {slots.map((slot, i) => {
        const d = slotData[i];
        if (!d) return null;
        const showOutline = !!frame && !d.previewUrl;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left:   pct(slot.x,      canvasWidth),
              top:    pct(slot.y,      canvasHeight),
              width:  pct(slot.width,  canvasWidth),
              height: pct(slot.height, canvasHeight),
              overflow: "hidden",
              background: d.previewUrl ? "transparent" : (i === 0 ? "var(--palette-brand-sub3)" : "var(--palette-brand-sub2)"),
              outline: showOutline ? "1.5px dashed #a8cc00" : "none",
              outlineOffset: "-1px",
              boxSizing: "border-box",
              cursor: d.previewUrl ? "default" : "pointer",
            }}
            onClick={!d.previewUrl ? d.onClick : undefined}
          >
            {d.previewUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.previewUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); d.onRemove(); }}
                  style={{
                    position: "absolute", top: 6, right: 6,
                    width: 24, height: 24, borderRadius: "50%",
                    background: "rgba(0,0,0,0.55)",
                    border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 1,
                  }}
                >
                  <X size={12} color="#fff" />
                </button>
              </>
            ) : (
              <div
                style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 10,
                }}
              >
                <PersonIcon color="#d0d0d0" size={52} strokeWidth={1.2} />
                <p
                  style={{
                    fontFamily: FONT_TECH,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#c0c0c0",
                    margin: 0,
                    letterSpacing: 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.sublabel}
                </p>
                {/* + 버튼 */}
                <div style={{
                  position: "absolute", bottom: 8, right: 8,
                  width: 22, height: 22,
                  background: "#0b0b0b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "var(--brand)", fontSize: 16, lineHeight: "22px", fontWeight: 300, display: "block" }}>+</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* frame 모드: 사진 아래 레이블 영역 */}
      {frame && slots.map((slot, i) => (
        <div
          key={`label-${i}`}
          style={{
            position: "absolute",
            left:   pct(slot.x,                   canvasWidth),
            top:    pct(slot.y + slot.height,      canvasHeight),
            width:  pct(slot.width,                canvasWidth),
            height: pct(frame.labelHeight,         canvasHeight),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontFamily: FONT_TECH, fontSize: 11, fontWeight: 700, color: "#000", letterSpacing: 1, textTransform: "uppercase" }}>
            {frame.defaultLabels[i] ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

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
  const [pendingCrop, setPendingCrop] = useState<{
    file: File;
    type: "reference" | "shot";
    cropRatio: number;
  } | null>(null);

  const referenceInputRef = useRef<HTMLInputElement>(null);
  const shotInputRef = useRef<HTMLInputElement>(null);

  const canProceed = !!shotPreviewUrl;
  const photoCount = (referencePreviewUrl ? 1 : 0) + (shotPreviewUrl ? 1 : 0);
  const remaining = 2 - photoCount;

  function openFilePicker(type: "reference" | "shot") {
    const ref = type === "reference" ? referenceInputRef : shotInputRef;
    if (!ref.current) return;
    ref.current.value = "";
    ref.current.click();
  }

  function handleFileChange(type: "reference" | "shot", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const cropRatio = getSlotCropRatio(templateId, type === "reference" ? 0 : 1);
      setPendingCrop({ file, type, cropRatio });
    }
  }

  function handleCropConfirm(croppedFile: File) {
    if (!pendingCrop) return;
    if (pendingCrop.type === "reference") onReferenceChange(croppedFile);
    else onShotChange(croppedFile);
    setPendingCrop(null);
  }

  const slotEntries: SlotEntry[] = [
    {
      previewUrl: referencePreviewUrl,
      onClick:    () => openFilePicker("reference"),
      onRemove:   onReferenceRemove,
      sublabel:   "Add artist photo",
    },
    {
      previewUrl: shotPreviewUrl,
      onClick:    () => openFilePicker("shot"),
      onRemove:   onShotRemove,
      sublabel:   "Add your photo",
    },
  ];

  const buttonLabel = isUploading
    ? "Uploading..."
    : canProceed
    ? "Next"
    : `Add ${remaining} more to continue`;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#F4F3EF" }}>
      <input
        ref={referenceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => handleFileChange("reference", e)}
      />
      <input
        ref={shotInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => handleFileChange("shot", e)}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 8px" }}>

        {/* 헤더 */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: "#0b0b0b", margin: 0 }}>
            Add photos
          </h2>
          <p style={{ fontSize: 14, color: "#666", margin: "4px 0 0" }}>
            Upload the artist reference & your shot
          </p>
        </div>

        {/* 캔버스 미리보기 */}
        <FrameCanvasPreview templateId={templateId} slots={slotEntries} />

        {/* 카운터 */}
        <p
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: "#888",
            margin: "6px 0 0",
            textAlign: "right",
            letterSpacing: 0.5,
          }}
        >
          {photoCount} / 2 photos
        </p>
      </div>

      {/* 하단 버튼 */}
      <div style={{ padding: "12px 16px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed || !!isUploading}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 9999,
            background: canProceed && !isUploading ? "#C6FD09" : "#e5e5e5",
            border: "none",
            fontWeight: 700,
            fontSize: 16,
            color: canProceed && !isUploading ? "#0b0b0b" : "#aaa",
            cursor: canProceed && !isUploading ? "pointer" : "default",
          }}
        >
          {buttonLabel}
        </button>
      </div>

      {pendingCrop && (
        <ImageCropOverlay
          file={pendingCrop.file}
          cropRatio={pendingCrop.cropRatio}
          onConfirm={handleCropConfirm}
          onClose={() => setPendingCrop(null)}
        />
      )}
    </div>
  );
}
