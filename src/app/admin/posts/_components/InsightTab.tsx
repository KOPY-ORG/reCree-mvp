"use client";

import { useState } from "react";
import { Loader2, Plus, X, MapPin, ArrowRight, Sparkles, Star, Lightbulb, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { translateFields } from "../_actions/draft-actions";
import type { PlaceEntry } from "./PostForm";

interface Props {
  placeEntries: PlaceEntry[];
  activePlaceIndex: number;
  setActivePlaceIndex: (i: number) => void;
  updatePlaceInsight: (
    i: number,
    field: keyof Omit<PlaceEntry, "place">,
    value: string | string[],
  ) => void;
  onAddPlace: () => void;
}

export function InsightTab({
  placeEntries,
  activePlaceIndex,
  setActivePlaceIndex,
  updatePlaceInsight,
  onAddPlace,
}: Props) {
  const [translatingField, setTranslatingField] = useState<string | null>(null);
  const [vibeInput, setVibeInput] = useState("");

  const activeEntry = placeEntries[activePlaceIndex] ?? null;

  const handleTranslateOne = async (
    field: string,
    ko: string,
    enField: keyof Omit<PlaceEntry, "place">,
  ) => {
    if (!ko.trim() || !activeEntry) return;
    setTranslatingField(field);
    const { data, error } = await translateFields({ value: ko });
    setTranslatingField(null);
    if (error) {
      toast.error(error);
    } else if (data?.value) {
      updatePlaceInsight(activePlaceIndex, enField, data.value);
    }
  };

  const addVibe = () => {
    if (!vibeInput.trim() || !activeEntry) return;
    updatePlaceInsight(activePlaceIndex, "vibe", [...activeEntry.vibe, vibeInput.trim()]);
    setVibeInput("");
  };

  const removeVibe = (i: number) => {
    if (!activeEntry) return;
    updatePlaceInsight(
      activePlaceIndex,
      "vibe",
      activeEntry.vibe.filter((_, idx) => idx !== i),
    );
  };

  if (placeEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">연결된 장소가 없습니다</p>
        <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
          오른쪽 사이드바에서 장소를 추가하면 Spot Insight를 입력할 수 있습니다
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onAddPlace}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          장소 추가
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 장소 선택 탭 (복수일 때) */}
      {placeEntries.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {placeEntries.map((entry, i) => (
            <button
              key={entry.place.id}
              type="button"
              onClick={() => setActivePlaceIndex(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activePlaceIndex === i
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700"
              }`}
            >
              <MapPin className="h-3 w-3" />
              {entry.place.nameKo}
            </button>
          ))}
        </div>
      )}

      {/* 현재 장소 이름 표시 */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium">{activeEntry.place.nameKo}</span>
        {activeEntry.place.addressKo && (
          <span className="text-xs text-muted-foreground truncate">{activeEntry.place.addressKo}</span>
        )}
      </div>

      {/* Context */}
      <div className="space-y-2 border-b border-border pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">Context</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <Textarea
            value={activeEntry.contextKo}
            onChange={(e) => updatePlaceInsight(activePlaceIndex, "contextKo", e.target.value)}
            className="min-h-[80px] max-h-[80px] resize-none"
            placeholder="이 장소에 대한 소개"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="self-center text-muted-foreground hover:bg-muted"
            disabled={!activeEntry.contextKo.trim() || translatingField === "contextEn"}
            onClick={() => handleTranslateOne("contextEn", activeEntry.contextKo, "contextEn")}
          >
            {translatingField === "contextEn" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
          <Textarea
            value={activeEntry.contextEn}
            onChange={(e) => updatePlaceInsight(activePlaceIndex, "contextEn", e.target.value)}
            className="min-h-[80px] max-h-[80px] resize-none"
            placeholder="Introduction about this place"
          />
        </div>
      </div>

      {/* Vibe */}
      <div className="space-y-2 border-b border-border pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
        <div className="flex items-center gap-1.5">
          <Star className="h-4 w-4" />
          <span className="text-sm font-semibold">Vibe</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {activeEntry.vibe.map((v, i) => (
            <Badge key={i} className="gap-1 pr-1 bg-brand/20 text-foreground border border-brand/60 hover:bg-brand/20 font-semibold">
              {v}
              <button
                type="button"
                onClick={() => removeVibe(i)}
                className="ml-0.5 opacity-60 hover:opacity-100 hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={vibeInput}
            onChange={(e) => setVibeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addVibe();
              }
            }}
            placeholder="예: Local, Warm, Cozy..."
            className="max-w-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={addVibe}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Must-try */}
      <div className="space-y-2 border-b border-border pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4" />
          <span className="text-sm font-semibold">Must-try</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <Textarea
            value={activeEntry.mustTryKo}
            onChange={(e) => updatePlaceInsight(activePlaceIndex, "mustTryKo", e.target.value)}
            className="min-h-[80px] max-h-[80px] resize-none"
            placeholder="꼭 먹어봐야 할 것, 경험해야 할 것"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="self-center text-muted-foreground hover:bg-muted"
            disabled={!activeEntry.mustTryKo.trim() || translatingField === "mustTryEn"}
            onClick={() => handleTranslateOne("mustTryEn", activeEntry.mustTryKo, "mustTryEn")}
          >
            {translatingField === "mustTryEn" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
          <Textarea
            value={activeEntry.mustTryEn}
            onChange={(e) => updatePlaceInsight(activePlaceIndex, "mustTryEn", e.target.value)}
            className="min-h-[80px] max-h-[80px] resize-none"
            placeholder="What you must try here"
          />
        </div>
      </div>

      {/* Tip */}
      <div className="space-y-2 border-b border-border pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-semibold">Tip</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
          <Textarea
            value={activeEntry.tipKo}
            onChange={(e) => updatePlaceInsight(activePlaceIndex, "tipKo", e.target.value)}
            className="min-h-[80px] max-h-[80px] resize-none"
            placeholder="방문 팁"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="self-center text-muted-foreground hover:bg-muted"
            disabled={!activeEntry.tipKo.trim() || translatingField === "tipEn"}
            onClick={() => handleTranslateOne("tipEn", activeEntry.tipKo, "tipEn")}
          >
            {translatingField === "tipEn" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </Button>
          <Textarea
            value={activeEntry.tipEn}
            onChange={(e) => updatePlaceInsight(activePlaceIndex, "tipEn", e.target.value)}
            className="min-h-[80px] max-h-[80px] resize-none"
            placeholder="Visiting tips"
          />
        </div>
      </div>
    </div>
  );
}
