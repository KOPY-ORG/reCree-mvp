"use client";

import { useState, useMemo } from "react";
import { Palette, Type, Smile, X, Plus } from "lucide-react";
import { FrameColorPicker } from "./FrameColorPicker";
import { StickerPanel } from "./StickerPanel";
import type { PlaceResult, TagGroup, TopicItem, PostResult } from "./StickerPanel";
import { resolveBadgeOptions } from "./StickerPanel";
import type { EditorLayer, TemplateConfig } from "./editor-types";

const TEXT_SIZES = [
  { label: "S", value: 48 },
  { label: "M", value: 80 },
  { label: "L", value: 120 },
];

const TEXT_COLORS = [
  "#ffffff",
  "#000000",
  "#C8FF09",
  "#ff4444",
  "#4499ff",
  "#ffcc00",
];

type Tab = "color" | "text" | "sticker";

interface Props {
  templateConfig: TemplateConfig;
  frameColorHex: string;
  onFrameColorChange: (hex: string) => void;
  referenceLabel: string | null;
  shotLabel: string | null;
  onReferenceLabelChange: (v: string | null) => void;
  onShotLabelChange: (v: string | null) => void;
  onAddTextLayer: (text: string, fontSize: number, color: string) => void;
  // sticker panel
  uploadedReferenceUrl: string | null;
  uploadedShotUrl: string | null;
  onAddLayer: (layer: Omit<EditorLayer, "id">) => void;
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

export function EditorToolbar({
  templateConfig,
  frameColorHex,
  onFrameColorChange,
  referenceLabel,
  shotLabel,
  onReferenceLabelChange,
  onShotLabelChange,
  onAddTextLayer,
  uploadedReferenceUrl,
  uploadedShotUrl,
  onAddLayer,
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
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [showTextForm, setShowTextForm] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textSize, setTextSize] = useState(80);
  const [textColor, setTextColor] = useState("#ffffff");

  const hasFrame = templateConfig.frame !== null;

  const topicTagColors = useMemo(() => {
    return resolveBadgeOptions(topics, tagGroups, selectedTopicIds, selectedTagIds)
      .map((opt) => opt.colorHex)
      .filter(Boolean) as string[];
  }, [topics, tagGroups, selectedTopicIds, selectedTagIds]);

  function handleTabPress(tab: Tab) {
    setActiveTab((prev) => (prev === tab ? null : tab));
    setShowTextForm(false);
  }

  function handleAddText() {
    if (!textInput.trim()) return;
    onAddTextLayer(textInput.trim(), textSize, textColor);
    setTextInput("");
    setShowTextForm(false);
  }

  return (
    <div className="shrink-0 border-t border-border bg-background">
      {/* 패널 */}
      {activeTab && (
        <div className={`px-4 py-3 overflow-y-auto ${activeTab === "sticker" ? "max-h-72" : "max-h-52"}`}>
          {activeTab === "color" && hasFrame && (
            <FrameColorPicker value={frameColorHex} onChange={onFrameColorChange} extraColors={topicTagColors} />
          )}
          {activeTab === "color" && !hasFrame && (
            <p className="text-sm text-muted-foreground py-2">
              Frame color is only available for framed templates.
            </p>
          )}

          {activeTab === "text" && (
            <div className="space-y-3">
              {/* 프레임 레이블 편집 */}
              {hasFrame && (
                <div className="space-y-2">
                  <LabelRow
                    hint="Artist"
                    value={referenceLabel}
                    placeholder="Artist name"
                    onChange={onReferenceLabelChange}
                    onRestore={() =>
                      onReferenceLabelChange(
                        templateConfig.frame?.defaultLabels[0] ?? "Artist"
                      )
                    }
                  />
                  <LabelRow
                    hint="ME"
                    value={shotLabel}
                    placeholder="Your label"
                    onChange={onShotLabelChange}
                    onRestore={() =>
                      onShotLabelChange(
                        templateConfig.frame?.defaultLabels[1] ?? "ME"
                      )
                    }
                  />
                  <div className="border-t border-border/50" />
                </div>
              )}

              {/* 텍스트 추가 */}
              {!showTextForm ? (
                <button
                  type="button"
                  onClick={() => setShowTextForm(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-brand"
                >
                  <Plus className="size-4" />
                  Add text
                </button>
              ) : (
                <div className="space-y-2.5">
                  <input
                    autoFocus
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddText();
                      if (e.key === "Escape") setShowTextForm(false);
                    }}
                    placeholder="Enter text..."
                    className="w-full text-sm bg-muted/30 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-brand"
                  />
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-muted-foreground shrink-0">Size</span>
                    {TEXT_SIZES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setTextSize(s.value)}
                        className={`px-2.5 py-0.5 rounded-md text-xs font-semibold border transition-colors ${
                          textSize === s.value
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                    <div className="flex-1" />
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTextColor(c)}
                        className={`size-5 rounded-full shrink-0 transition-transform ${
                          textColor === c ? "scale-125 ring-2 ring-brand ring-offset-1 ring-offset-background" : ""
                        }`}
                        style={{
                          backgroundColor: c,
                          boxShadow:
                            c === "#ffffff"
                              ? "0 0 0 1px rgba(0,0,0,0.2)"
                              : undefined,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTextForm(false)}
                      className="flex-1 py-1.5 text-sm rounded-lg border border-border"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddText}
                      disabled={!textInput.trim()}
                      className="flex-1 py-1.5 text-sm rounded-lg bg-brand text-black font-semibold disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "sticker" && (
            <StickerPanel
              canvasWidth={templateConfig.canvasWidth}
              canvasHeight={templateConfig.canvasHeight}
              uploadedReferenceUrl={uploadedReferenceUrl}
              uploadedShotUrl={uploadedShotUrl}
              onAddLayer={onAddLayer}
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
          )}
        </div>
      )}

      {/* 탭 바 */}
      <div className="flex border-t border-border/40">
        <TabButton
          icon={<Smile className="size-5" />}
          label="Sticker"
          active={activeTab === "sticker"}
          onPress={() => handleTabPress("sticker")}
        />
        <TabButton
          icon={<Type className="size-5" />}
          label="Text"
          active={activeTab === "text"}
          onPress={() => handleTabPress("text")}
        />
        {hasFrame && (
          <TabButton
            icon={<Palette className="size-5" />}
            label="Color"
            active={activeTab === "color"}
            onPress={() => handleTabPress("color")}
          />
        )}
      </div>
    </div>
  );
}

function LabelRow({
  hint,
  value,
  placeholder,
  onChange,
  onRestore,
}: {
  hint: string;
  value: string | null;
  placeholder: string;
  onChange: (v: string | null) => void;
  onRestore: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-10 shrink-0">{hint}</span>
      {value !== null ? (
        <>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 text-sm bg-muted/30 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-brand min-w-0"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onRestore}
          className="text-xs font-medium text-brand"
        >
          + Restore
        </button>
      )}
    </div>
  );
}

function TabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
        active ? "text-brand" : "text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
