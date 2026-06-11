"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { MapPin } from "lucide-react";
import { loadImage, drawReCreeshotWatermark, drawReCreeshotBadge } from "@/lib/canvas-utils";
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

async function applyWatermark(blob: Blob, matchScore?: number | null): Promise<Blob> {
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
    if (matchScore != null) drawReCreeshotBadge(ctx, W, matchScore);
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
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sectionW, setSectionW] = useState(0);
  const [sectionH, setSectionH] = useState(0);
  const [stageInstance, setStageInstance] = useState<Konva.Stage | null>(null);
  const [referenceImg, setReferenceImg] = useState<HTMLImageElement | null>(null);
  const [shotImg, setShotImg] = useState<HTMLImageElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [scorePhase, setScorePhase] = useState<"idle" | "calculating" | "result">("idle");
  const [isScoring, setIsScoring] = useState(false);

  const templateConfig = getTemplateConfig(templateId);
  const aspect = templateConfig.canvasHeight / templateConfig.canvasWidth;
  // 장소 박스가 sectionRef 안에 위치하므로 높이 차감
  const locationOverhead = selectedPlace ? 48 : 0; // box ~40px + mt-1 4px + buffer
  const stageW =
    sectionW > 0 && sectionH > 0
      ? Math.round(Math.min(sectionW, (sectionH - locationOverhead) / aspect))
      : 0;
  const stageH = stageW > 0 ? Math.round(stageW * aspect) : 0;

  // HTML 배지 오버레이 위치 — 카드 우상단 코너 고정 6px
  const badgeTop = 6;
  const badgeRight = 6;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        setSectionW(Math.round(rect.width));
        setSectionH(Math.round(rect.height));
      }
    });
    ro.observe(el);
    setSectionW(Math.round(el.clientWidth));
    setSectionH(Math.round(el.clientHeight));
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
    onError("");
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
      const blob = await applyWatermark(rawBlob, showMatchScore ? matchScore : null);
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
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden" style={{ background: "#F4F3EF" }}>
        {(selectedTagIds.length > 0 || selectedTopicIds.length > 0) && (
          <div className="shrink-0">
            <SelectionStrip
              selectedTagIds={selectedTagIds}
              selectedTopicIds={selectedTopicIds}
              tagGroups={tagGroups}
              topics={topics}
            />
          </div>
        )}
        {/* sectionRef: 캔버스 가용 공간 측정 (badge switch 제외) */}
        <div className="flex-1 min-h-0 flex flex-col px-4 py-3">
          <div ref={sectionRef} className="flex-1 min-h-0 flex flex-col items-center">
            <div
              ref={containerRef}
              className="relative"
              style={{
                width: stageW > 0 ? stageW : undefined,
                boxShadow: "0 4px 28px rgba(0,0,0,0.18)",
              }}
            >
              {stageW > 0 && (
                <KonvaStage
                  stageW={stageW}
                  stageH={stageH}
                  templateConfig={templateConfig}
                  referenceImg={referenceImg}
                  shotImg={shotImg}
                  referenceLabel={referenceLabel}
                  shotLabel={shotLabel}
                  onStageReady={handleStageReady}
                />
              )}
              {/* HTML match badge — ③④와 동일한 룩 */}
              {matchScore != null && showMatchScore && stageW > 0 && (
                <div
                  className="absolute z-10 pointer-events-none text-xs font-bold px-2.5 py-[3px] rounded-full text-black"
                  style={{
                    top: badgeTop,
                    right: badgeRight,
                    background: "linear-gradient(to right, #C8FF09, white 150%)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                >
                  {Math.round(matchScore)}% Match
                </div>
              )}
            </div>
            {/* 장소 — 캔버스 바로 아래, 흰 박스 + 라임 윤곽선 */}
            {selectedPlace && stageW > 0 && (
              <div
                className="flex items-center gap-2 bg-brand-sub3 border border-brand rounded-xl px-3 py-2.5 mt-1"
                style={{ width: stageW }}
              >
                <MapPin className="size-4 text-foreground shrink-0" />
                <span className="text-sm font-medium">{selectedPlace.nameEn ?? selectedPlace.nameKo}</span>
              </div>
            )}
          </div>
          {/* BadgeSwitch — shrink-0으로 sectionRef 높이에서 자동 제외 */}
          {matchScore != null && (
            <div className="shrink-0 flex justify-end mt-2.5">
              <button
                type="button"
                onClick={() => onShowMatchScoreChange(!showMatchScore)}
                className="inline-flex items-center gap-2 rounded-full select-none"
                style={{
                  background: "rgba(16,18,22,.58)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,.14)",
                  padding: "5px 9px 5px 11px",
                }}
              >
                <span className="font-bold text-[10.5px] tracking-[.04em] text-white/90">
                  {showMatchScore ? "Badge on" : "Badge off"}
                </span>
                <span
                  className="relative shrink-0 rounded-full transition-colors"
                  style={{ width: 34, height: 19, background: showMatchScore ? "#C8FF09" : "rgba(255,255,255,.26)" }}
                >
                  <span
                    className="absolute w-[15px] h-[15px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.3)] transition-[left]"
                    style={{ top: 2, left: showMatchScore ? 17 : 2 }}
                  />
                </span>
              </button>
            </div>
          )}
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
  selectedTagIds,
  selectedTopicIds,
  tagGroups,
  topics,
}: {
  selectedTagIds: string[];
  selectedTopicIds: string[];
  tagGroups: TagGroup[];
  topics: TopicItem[];
}) {
  const topicColorMap = computeTopicEffectiveColors(topics);

  return (
    <div className="px-4 pt-3 pb-0">
      <div className="flex flex-wrap gap-1.5">
          {selectedTopicIds.map((id) => {
            const colors = topicColorMap.get(id);
            const topic = topics.find((t) => t.id === id);
            if (!topic || !colors) return null;
            const bg = colors.hex2
              ? `linear-gradient(${colors.dir}, ${colors.hex}, ${colors.hex2} ${colors.stop}%)`
              : colors.hex;
            return (
              <span key={id} className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: bg, color: colors.textHex }}>
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
              <span key={id} className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ background: bg, color: c.textColorHex }}>
                {tag.name}
              </span>
            );
          })}
      </div>
    </div>
  );
}
