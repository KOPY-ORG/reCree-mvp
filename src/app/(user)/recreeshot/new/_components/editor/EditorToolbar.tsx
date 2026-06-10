"use client";

import { useState, useMemo } from "react";
import { Palette, MapPin, Tag, Image, X, Percent } from "lucide-react";
import { FrameColorPicker } from "./FrameColorPicker";
import { StickerPanel } from "./StickerPanel";
import type { PlaceResult, TagGroup, TopicItem, PostResult } from "./StickerPanel";
import { resolveBadgeOptions } from "./StickerPanel";
import { ScoreSheet } from "./ScoreSheet";
import type { TemplateConfig, StickerStyle } from "./editor-types";

interface Props {
  templateConfig: TemplateConfig;
  frameColorHex: string;
  onFrameColorChange: (hex: string) => void;
  referenceLabel: string;
  shotLabel: string;
  onReferenceLabelChange: (v: string) => void;
  onShotLabelChange: (v: string) => void;
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
  hasReference?: boolean;
  referencePreviewUrl?: string | null;
  shotPreviewUrl?: string;
  isScoring?: boolean;
  scorePhase?: "idle" | "calculating" | "result";
  matchScore?: number | null;
  showMatchScore?: boolean;
  stickerStyle?: StickerStyle;
  stickerColor?: string;
  onCalculateScore?: () => void;
  onStickerStyleChange?: (style: StickerStyle) => void;
  onStickerColorChange?: (color: string) => void;
  onPlaceSticker?: () => void;
  onRemoveSticker?: () => void;
  onToggleMatchScore?: () => void;
}

export function EditorToolbar({
  templateConfig,
  frameColorHex,
  onFrameColorChange,
  referenceLabel,
  shotLabel,
  onReferenceLabelChange,
  onShotLabelChange,
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
  hasReference,
  referencePreviewUrl,
  shotPreviewUrl = "",
  isScoring,
  scorePhase = "idle",
  matchScore,
  showMatchScore,
  stickerStyle = "pill",
  stickerColor = "#C8FF09",
  onCalculateScore,
  onStickerStyleChange,
  onStickerColorChange,
  onPlaceSticker,
  onRemoveSticker,
  onToggleMatchScore,
}: Props) {
  const [colorPanelOpen, setColorPanelOpen] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [scoreSheetOpen, setScoreSheetOpen] = useState(false);

  const hasFrame = templateConfig.frame !== null;
  const tagCount = selectedTagIds.length + selectedTopicIds.length;

  const topicTagColors = useMemo(() => {
    return resolveBadgeOptions(topics, tagGroups, selectedTopicIds, selectedTagIds)
      .map((opt) => opt.colorHex)
      .filter(Boolean) as string[];
  }, [topics, tagGroups, selectedTopicIds, selectedTagIds]);

  return (
    <div className="shrink-0 bg-background">
      {/* 라벨 인라인 영역 (프레임 템플릿 전용 — 항상 표시) */}
      {hasFrame && (
        <div className="px-4 pt-3 pb-2 space-y-2 border-b border-border/30">
          <LabelRow hint="Artist" value={referenceLabel} placeholder="Artist name" onChange={onReferenceLabelChange} />
          <LabelRow hint="ME" value={shotLabel} placeholder="Your label" onChange={onShotLabelChange} />
        </div>
      )}

      {/* Color 패널 (색상만) */}
      {colorPanelOpen && hasFrame && (
        <div className="px-4 py-3 bg-background">
          <FrameColorPicker value={frameColorHex} onChange={onFrameColorChange} extraColors={topicTagColors} />
        </div>
      )}

      {/* StickerPanel — 장소·태그 시트 */}
      <StickerPanel
        locationSheetOpen={locationSheetOpen}
        onLocationSheetChange={setLocationSheetOpen}
        tagSheetOpen={tagSheetOpen}
        onTagSheetChange={setTagSheetOpen}
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
      />

      {/* Score 시트 */}
      {hasReference && (
        <ScoreSheet
          open={scoreSheetOpen}
          onOpenChange={setScoreSheetOpen}
          referencePreviewUrl={referencePreviewUrl ?? null}
          shotPreviewUrl={shotPreviewUrl}
          phase={isScoring ? "calculating" : scorePhase}
          score={matchScore ?? null}
          showMatchScore={!!showMatchScore}
          selectedStyle={stickerStyle}
          selectedColor={stickerColor}
          onCalculate={() => onCalculateScore?.()}
          onStyleChange={(s) => onStickerStyleChange?.(s)}
          onColorChange={(c) => onStickerColorChange?.(c)}
          onPlace={() => onPlaceSticker?.()}
          onRemove={() => onRemoveSticker?.()}
        />
      )}

      {/* 탭 바 */}
      <div className="flex">
        <SheetTabButton icon={<Image className="size-5" />} label="Photo" checked onPress={() => {}} />
        <SheetTabButton
          icon={<MapPin className="size-5" />}
          label="Location"
          checked={!!selectedPlace}
          required
          onPress={() => { setColorPanelOpen(false); setLocationSheetOpen(true); }}
        />
        <SheetTabButton
          icon={<Tag className="size-5" />}
          label="Tag"
          checked={tagCount > 0}
          required
          onPress={() => { setColorPanelOpen(false); setTagSheetOpen(true); }}
        />
        {hasFrame && (
          <TabButton
            icon={<Palette className="size-5" />}
            label="Frame"
            active={colorPanelOpen}
            onPress={() => setColorPanelOpen((p) => !p)}
          />
        )}
        {hasReference && (
          <ScoreTabButton
            matchScore={matchScore ?? null}
            showMatchScore={!!showMatchScore}
            onPress={() => { setColorPanelOpen(false); setScoreSheetOpen(true); }}
            onToggle={() => onToggleMatchScore?.()}
          />
        )}
      </div>
    </div>
  );
}

// ── LabelRow ──────────────────────────────────────────────────────────────────

function LabelRow({ hint, value, placeholder, onChange }: {
  hint: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-10 shrink-0">{hint}</span>
      <div className="flex-1 flex items-center bg-muted/30 rounded-lg px-3 py-1.5 min-w-0 focus-within:ring-1 focus-within:ring-brand">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent outline-none min-w-0"
        />
        {value && (
          <button type="button" onClick={() => onChange("")} className="shrink-0 ml-1 text-muted-foreground/50 hover:text-muted-foreground">
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── TabButton ─────────────────────────────────────────────────────────────────

function TabButton({ icon, label, active, onPress }: {
  icon: React.ReactNode; label: string; active: boolean; onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${active ? "text-brand" : "text-foreground"}`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── SheetTabButton ────────────────────────────────────────────────────────────

// ── ScoreTabButton ────────────────────────────────────────────────────────────

function ScoreTabButton({ matchScore, showMatchScore, onPress, onToggle }: {
  matchScore: number | null; showMatchScore: boolean;
  onPress: () => void; onToggle: () => void;
}) {
  if (matchScore != null) {
    return (
      <button
        type="button"
        onClick={onPress}
        className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${showMatchScore ? "text-brand" : "text-foreground"}`}
      >
        <div className="relative">
          <Percent className="size-5" />
          <span className="absolute -top-1 -right-1.5 bg-brand text-black text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
            ✓
          </span>
        </div>
        {Math.round(matchScore)}%
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-foreground"
    >
      <Percent className="size-5" />
      Score
    </button>
  );
}

// ── SheetTabButton ────────────────────────────────────────────────────────────

function SheetTabButton({ icon, label, checked, required, onPress }: {
  icon: React.ReactNode; label: string; checked?: boolean; required?: boolean; onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium text-foreground"
    >
      <div className="relative">
        {icon}
        {checked ? (
          <span className="absolute -top-1 -right-1.5 bg-brand text-black text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
            ✓
          </span>
        ) : required ? (
          <span className="absolute -top-1 -right-1.5 bg-red-500 w-2.5 h-2.5 rounded-full" />
        ) : null}
      </div>
      {label}
    </button>
  );
}
