"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { MapPin } from "lucide-react";
import { loadImage, drawReCreeshotWatermark } from "@/lib/canvas-utils";
import { getReCreeshotPresignedUrl } from "@/lib/actions/upload-actions";
import { previewMatchScore } from "@/app/(user)/_actions/recreeshot-actions";
import { exportStageToBlob } from "./canvas-export";
import { getTemplateConfig } from "./template-config";
import { EditorToolbar } from "./EditorToolbar";
import type { PlaceResult, TagGroup, TopicItem, PostResult } from "./StickerPanel";
import type { TemplateId } from "./editor-types";
import { computeTopicEffectiveColors, resolveTagColors } from "@/lib/post-labels";

const KonvaStage = dynamic(() => import("./KonvaStage"), { ssr: false });

interface Props {
  templateId: TemplateId;
  onTemplateChange: (id: TemplateId) => void;
  referenceLabel: string;
  shotLabel: string;
  onReferenceLabelChange: (v: string) => void;
  onShotLabelChange: (v: string) => void;
  matchScore: number | null;
  showMatchScore: boolean;
  onMatchScoreChange: (v: number | null) => void;
  onShowMatchScoreChange: (v: boolean) => void;
  referencePreviewUrl: string | null;
  shotPreviewUrl: string;
  uploadedReferenceUrl: string | null;
  uploadedShotUrl: string;
  onNext: (compositeUrl: string) => void;
  onError: (msg: string) => void;
  selectedPlace: PlaceResult | null;
  onPlaceChange: (place: PlaceResult | null) => void;
  linkedPosts: PostResult[];
  linkedPostId: string | undefined;
  onLinkedPostChange: (id: string | undefined, tagIds?: string[], topicIds?: string[]) => void;
  selectedTagIds: string[];
  selectedTopicIds: string[];
  onTagsChange: (tagIds: string[], topicIds: string[]) => void;
  tagGroups: TagGroup[];
  topics: TopicItem[];
}

async function applyWatermark(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const W = img.naturalWidth;
    const H = img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(img, 0, 0, W, H);
    await document.fonts.ready;
    drawReCreeshotWatermark(ctx, W, H);
    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b ?? blob), "image/jpeg", 0.92);
    });
  } catch (e) {
    console.warn("[reCree] watermark failed, uploading without:", e);
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ReCreeshotEditor({
  templateId,
  onTemplateChange,
  referenceLabel,
  shotLabel,
  onReferenceLabelChange,
  onShotLabelChange,
  matchScore,
  showMatchScore,
  onMatchScoreChange,
  onShowMatchScoreChange,
  referencePreviewUrl,
  shotPreviewUrl,
  uploadedReferenceUrl,
  uploadedShotUrl,
  onNext,
  onError,
  selectedPlace,
  onPlaceChange,
  linkedPosts,
  linkedPostId,
  onLinkedPostChange,
  selectedTagIds,
  selectedTopicIds,
  onTagsChange,
  tagGroups,
  topics,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(0);
  const [stageInstance, setStageInstance] = useState<Konva.Stage | null>(null);
  const [referenceImg, setReferenceImg] = useState<HTMLImageElement | null>(null);
  const [shotImg, setShotImg] = useState<HTMLImageElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [scorePhase, setScorePhase] = useState<"idle" | "calculating" | "result">("idle");
  const [isScoring, setIsScoring] = useState(false);

  const templateConfig = getTemplateConfig(templateId);
  const stageH =
    stageW > 0
      ? Math.round(stageW * (templateConfig.canvasHeight / templateConfig.canvasWidth))
      : 0;

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

  useEffect(() => {
    if (!referencePreviewUrl) { setReferenceImg(null); return; }
    loadImage(referencePreviewUrl).then(setReferenceImg).catch(() => setReferenceImg(null));
  }, [referencePreviewUrl]);

  useEffect(() => {
    loadImage(shotPreviewUrl).then(setShotImg).catch(() => setShotImg(null));
  }, [shotPreviewUrl]);

  const handleStageReady = useCallback((stage: Konva.Stage) => {
    setStageInstance(stage);
  }, []);

  async function handleCalculateScore() {
    if (!uploadedReferenceUrl || isScoring) return;
    setIsScoring(true);
    setScorePhase("calculating");
    const wasNull = matchScore === null;
    try {
      const result = await previewMatchScore(uploadedReferenceUrl, uploadedShotUrl);
      if ("error" in result) throw new Error(result.error);
      onMatchScoreChange(result.score);
      setScorePhase("result");
      if (wasNull) onShowMatchScoreChange(true);
    } catch (e) {
      console.error(e);
      setScorePhase("idle");
      onError("Score calculation failed. Please try again.");
    } finally {
      setIsScoring(false);
    }
  }

  async function handleContinue() {
    if (!stageInstance || isExporting) return;
    setIsExporting(true);
    try {
      const rawBlob = await exportStageToBlob(stageInstance, templateConfig.canvasWidth, stageW);
      const blob = await applyWatermark(rawBlob);
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
      onError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto" style={{ background: "#F4F3EF" }}>
        {(selectedPlace || selectedTagIds.length > 0 || selectedTopicIds.length > 0) && (
          <SelectionStrip
            selectedPlace={selectedPlace}
            selectedTagIds={selectedTagIds}
            selectedTopicIds={selectedTopicIds}
            tagGroups={tagGroups}
            topics={topics}
          />
        )}
        <div className="px-4 py-6">
          <div ref={containerRef} className="w-full" style={{ boxShadow: "0 4px 28px rgba(0,0,0,0.18)" }}>
            {stageW > 0 && (
              <KonvaStage
                stageW={stageW}
                stageH={stageH}
                templateConfig={templateConfig}
                referenceImg={referenceImg}
                shotImg={shotImg}
                referenceLabel={referenceLabel}
                shotLabel={shotLabel}
                matchScore={matchScore}
                showMatchScore={showMatchScore}
                onStageReady={handleStageReady}
              />
            )}
          </div>
        </div>
      </div>

      <EditorToolbar
        templateId={templateId}
        onTemplateChange={onTemplateChange}
        templateConfig={templateConfig}
        referenceLabel={referenceLabel}
        shotLabel={shotLabel}
        onReferenceLabelChange={onReferenceLabelChange}
        onShotLabelChange={onShotLabelChange}
        selectedPlace={selectedPlace}
        onPlaceChange={onPlaceChange}
        linkedPosts={linkedPosts}
        linkedPostId={linkedPostId}
        onLinkedPostChange={onLinkedPostChange}
        selectedTagIds={selectedTagIds}
        selectedTopicIds={selectedTopicIds}
        onTagsChange={onTagsChange}
        tagGroups={tagGroups}
        topics={topics}
        hasReference={!!uploadedReferenceUrl}
        referencePreviewUrl={referencePreviewUrl}
        shotPreviewUrl={shotPreviewUrl}
        isScoring={isScoring}
        scorePhase={scorePhase}
        matchScore={matchScore}
        showMatchScore={showMatchScore}
        onCalculateScore={handleCalculateScore}
        onToggleMatchScore={() => onShowMatchScoreChange(!showMatchScore)}
      />

      <div className="px-4 py-3 shrink-0">
        {(() => {
          const hasLocation = !!selectedPlace;
          const hasTag = selectedTagIds.length > 0 || selectedTopicIds.length > 0;
          const canProceed = hasLocation && hasTag && !!stageInstance && !!shotImg;
          const label = isExporting
            ? "Saving..."
            : !hasLocation
            ? "Set location to continue"
            : !hasTag
            ? "Add tag to continue"
            : "Share →";
          return (
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canProceed || isExporting}
              className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {label}
            </button>
          );
        })()}
      </div>
    </div>
  );
}

// ── SelectionStrip ─────────────────────────────────────────────────────────────

function SelectionStrip({
  selectedPlace,
  selectedTagIds,
  selectedTopicIds,
  tagGroups,
  topics,
}: {
  selectedPlace: PlaceResult | null;
  selectedTagIds: string[];
  selectedTopicIds: string[];
  tagGroups: TagGroup[];
  topics: TopicItem[];
}) {
  const topicColorMap = computeTopicEffectiveColors(topics);
  const placeName = selectedPlace?.nameEn ?? selectedPlace?.nameKo ?? null;

  return (
    <div className="px-4 pt-4 pb-0">
      <div className="flex flex-wrap gap-1.5">
        {placeName && (
          <span className="pill-badge bg-white/80 text-foreground shadow-sm">
            <MapPin className="size-3 shrink-0 text-muted-foreground" />
            {placeName}
          </span>
        )}
        {selectedTopicIds.map((id) => {
          const colors = topicColorMap.get(id);
          const topic = topics.find((t) => t.id === id);
          if (!topic || !colors) return null;
          const bg = colors.hex2
            ? `linear-gradient(${colors.dir}, ${colors.hex}, ${colors.hex2} ${colors.stop}%)`
            : colors.hex;
          return (
            <span key={id} className="pill-badge shadow-sm" style={{ background: bg, color: colors.textHex }}>
              {topic.nameEn}
            </span>
          );
        })}
        {selectedTagIds.map((id) => {
          const groupData = tagGroups.find((g) => g.tags.some((t) => t.id === id));
          const tag = groupData?.tags.find((t) => t.id === id);
          if (!tag || !groupData) return null;
          const c = resolveTagColors(tag, groupData);
          const bg = c.colorHex2
            ? `linear-gradient(${c.gradientDir}, ${c.colorHex}, ${c.colorHex2} ${c.gradientStop}%)`
            : c.colorHex;
          return (
            <span key={id} className="pill-badge shadow-sm" style={{ background: bg, color: c.textColorHex }}>
              {tag.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}
