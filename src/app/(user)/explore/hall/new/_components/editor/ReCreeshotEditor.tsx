"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { loadImage } from "@/lib/canvas-utils";
import { getReCreeshotPresignedUrl } from "@/lib/actions/upload-actions";
import { exportStageToBlob } from "./canvas-export";
import { getTemplateConfig } from "./template-config";
import { EditorToolbar } from "./EditorToolbar";
import type { EditorLayer, StickerBadgeOption, TemplateId } from "./editor-types";

const KonvaStage = dynamic(() => import("./KonvaStage"), { ssr: false });

interface Props {
  templateId: TemplateId;
  referencePreviewUrl: string | null;
  shotPreviewUrl: string;
  uploadedReferenceUrl: string | null;
  uploadedShotUrl: string;
  placeName: string | null;
  badgeOptions: StickerBadgeOption[];
  onNext: (compositeUrl: string) => void;
  onError: (msg: string) => void;
}

interface EditorState {
  frameColorHex: string;
  referenceLabel: string | null;
  shotLabel: string | null;
  layers: EditorLayer[];
  selectedLayerId: string | null;
}

export function ReCreeshotEditor({
  templateId,
  referencePreviewUrl,
  shotPreviewUrl,
  uploadedReferenceUrl,
  uploadedShotUrl,
  placeName,
  badgeOptions,
  onNext,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(0);
  const [stageInstance, setStageInstance] = useState<Konva.Stage | null>(null);
  const [referenceImg, setReferenceImg] = useState<HTMLImageElement | null>(null);
  const [shotImg, setShotImg] = useState<HTMLImageElement | null>(null);
  const [stickerImages, setStickerImages] = useState<Record<string, HTMLImageElement>>({});
  const [isExporting, setIsExporting] = useState(false);

  const templateConfig = getTemplateConfig(templateId);
  const stageH =
    stageW > 0
      ? Math.round(stageW * (templateConfig.canvasHeight / templateConfig.canvasWidth))
      : 0;

  const [editorState, setEditorState] = useState<EditorState>({
    frameColorHex: "#ffffff",
    referenceLabel: templateConfig.frame?.defaultLabels[0] ?? null,
    shotLabel: templateConfig.frame?.defaultLabels[1] ?? null,
    layers: [],
    selectedLayerId: null,
  });

  // 컨테이너 너비 측정
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setStageW(Math.round(w));
    });
    ro.observe(el);
    setStageW(Math.round(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  // 사진 이미지 로드
  useEffect(() => {
    if (!referencePreviewUrl) { setReferenceImg(null); return; }
    loadImage(referencePreviewUrl).then(setReferenceImg).catch(() => setReferenceImg(null));
  }, [referencePreviewUrl]);

  useEffect(() => {
    loadImage(shotPreviewUrl).then(setShotImg).catch(() => setShotImg(null));
  }, [shotPreviewUrl]);

  // 스티커 이미지 로드 (type=sticker 레이어 추가 시)
  useEffect(() => {
    const toLoad = editorState.layers.filter(
      (l) => l.type === "sticker" && l.stickerUrl && !stickerImages[l.id]
    );
    toLoad.forEach((layer) => {
      if (!layer.stickerUrl) return;
      loadImage(layer.stickerUrl)
        .then((img) => setStickerImages((prev) => ({ ...prev, [layer.id]: img })))
        .catch(() => {});
    });
  }, [editorState.layers]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStageReady = useCallback((stage: Konva.Stage) => {
    setStageInstance(stage);
  }, []);

  function handleLayerSelect(id: string | null) {
    setEditorState((s) => ({ ...s, selectedLayerId: id }));
  }

  function handleLayerDelete(id: string) {
    setEditorState((s) => ({
      ...s,
      layers: s.layers.filter((l) => l.id !== id),
      selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId,
    }));
    setStickerImages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleLayerUpdate(
    id: string,
    updates: { x: number; y: number; scale: number; rotation: number }
  ) {
    setEditorState((s) => ({
      ...s,
      layers: s.layers.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    }));
  }

  function handleAddLayer(layerData: Omit<EditorLayer, "id">) {
    const id = crypto.randomUUID();
    setEditorState((s) => ({
      ...s,
      layers: [...s.layers, { id, ...layerData }],
      selectedLayerId: id,
    }));
  }

  function handleAddTextLayer(text: string, fontSize: number, color: string) {
    handleAddLayer({ type: "text", x: 0.5, y: 0.5, scale: 1, rotation: 0, text, fontSize, color });
  }

  async function handleContinue() {
    if (!stageInstance || isExporting) return;
    setEditorState((s) => ({ ...s, selectedLayerId: null }));
    setIsExporting(true);

    const tr = stageInstance.findOne("Transformer") as Konva.Transformer | null;
    if (tr) {
      tr.hide();
      stageInstance.batchDraw();
    }

    try {
      const blob = await exportStageToBlob(stageInstance, templateConfig.canvasWidth, stageW);
      const file = new File([blob], "recreeshot.jpg", { type: "image/jpeg" });
      const presigned = await getReCreeshotPresignedUrl(file.name, file.type);
      if ("error" in presigned) throw new Error(presigned.error);
      await fetch(presigned.presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "image/jpeg" },
      });
      onNext(presigned.cdnUrl);
    } catch (e) {
      console.error(e);
      if (tr) tr.show();
      onError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-6">
          <div
            ref={containerRef}
            className="w-full"
            style={{ boxShadow: "0 4px 28px rgba(0,0,0,0.18)" }}
          >
            {stageW > 0 && (
              <KonvaStage
                stageW={stageW}
                stageH={stageH}
                templateConfig={templateConfig}
                referenceImg={referenceImg}
                shotImg={shotImg}
                frameColorHex={editorState.frameColorHex}
                referenceLabel={editorState.referenceLabel}
                shotLabel={editorState.shotLabel}
                layers={editorState.layers}
                selectedLayerId={editorState.selectedLayerId}
                stickerImages={stickerImages}
                onStageReady={handleStageReady}
                onLayerSelect={handleLayerSelect}
                onLayerDelete={handleLayerDelete}
                onLayerUpdate={handleLayerUpdate}
              />
            )}
          </div>
        </div>
      </div>

      <EditorToolbar
        templateConfig={templateConfig}
        frameColorHex={editorState.frameColorHex}
        onFrameColorChange={(hex) => setEditorState((s) => ({ ...s, frameColorHex: hex }))}
        referenceLabel={editorState.referenceLabel}
        shotLabel={editorState.shotLabel}
        onReferenceLabelChange={(v) => setEditorState((s) => ({ ...s, referenceLabel: v }))}
        onShotLabelChange={(v) => setEditorState((s) => ({ ...s, shotLabel: v }))}
        onAddTextLayer={handleAddTextLayer}
        placeName={placeName}
        badgeOptions={badgeOptions}
        uploadedReferenceUrl={uploadedReferenceUrl}
        uploadedShotUrl={uploadedShotUrl}
        onAddLayer={handleAddLayer}
      />

      <div className="px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={handleContinue}
          disabled={isExporting || !stageInstance || !shotImg}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isExporting ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
