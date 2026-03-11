"use client";

import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateBannerLabels, type LabelOverride } from "../_actions/home-curation-actions";
import { toast } from "sonner";

type TopicOption = {
  topicId: string;
  nameEn: string;
  isVisible: boolean;
  effectiveColorHex: string;
  effectiveTextColorHex: string;
};

type TagOption = {
  tagId: string;
  name: string;
  isVisible: boolean;
  effectiveColorHex: string;
  effectiveTextColorHex: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  bannerId: string;
  postTopics: TopicOption[];
  postTags: TagOption[];
  initialOverrides: LabelOverride[] | null;
};

const MAX_LABELS = 3;

function labelKey(o: LabelOverride) {
  return `${o.type}:${o.id}`;
}

export function BannerLabelDialog({
  open,
  onClose,
  bannerId,
  postTopics,
  postTags,
  initialOverrides,
}: Props) {
  // 초기 선택: override가 있으면 그대로, 없으면 isVisible 기본값
  function computeDefault(): LabelOverride[] {
    const topics = postTopics
      .filter((t) => t.isVisible)
      .map((t): LabelOverride => ({ type: "topic", id: t.topicId }));
    const tags = postTags
      .filter((t) => t.isVisible)
      .map((t): LabelOverride => ({ type: "tag", id: t.tagId }));
    return [...topics, ...tags].slice(0, 2);
  }

  const [selected, setSelected] = useState<LabelOverride[]>(
    initialOverrides ?? computeDefault()
  );
  const [, startTransition] = useTransition();

  function getColor(o: LabelOverride): { bg: string; text: string } {
    if (o.type === "topic") {
      const t = postTopics.find((t) => t.topicId === o.id);
      return { bg: t?.effectiveColorHex ?? "#BABABA", text: t?.effectiveTextColorHex ?? "#FCFCFC" };
    }
    const t = postTags.find((t) => t.tagId === o.id);
    return { bg: t?.effectiveColorHex ?? "#BABABA", text: t?.effectiveTextColorHex ?? "#FCFCFC" };
  }

  function getLabel(o: LabelOverride): string {
    if (o.type === "topic") return postTopics.find((t) => t.topicId === o.id)?.nameEn ?? o.id;
    return postTags.find((t) => t.tagId === o.id)?.name ?? o.id;
  }

  function isChecked(o: LabelOverride) {
    return selected.some((s) => labelKey(s) === labelKey(o));
  }

  function toggle(o: LabelOverride) {
    setSelected((prev) => {
      const key = labelKey(o);
      if (prev.some((s) => labelKey(s) === key)) {
        return prev.filter((s) => labelKey(s) !== key);
      }
      if (prev.length >= MAX_LABELS) return prev;
      return [...prev, o];
    });
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setSelected((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx: number) {
    setSelected((prev) => {
      if (idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function handleReset() {
    startTransition(async () => {
      try {
        await updateBannerLabels(bannerId, []);
        toast.success("기본 라벨로 초기화했습니다.");
        onClose();
      } catch {
        toast.error("초기화에 실패했습니다.");
      }
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      try {
        await updateBannerLabels(bannerId, selected);
        toast.success("라벨 설정을 저장했습니다.");
        onClose();
      } catch {
        toast.error("저장에 실패했습니다.");
      }
    });
  }

  const allOptions: { label: LabelOverride; name: string; colorBg: string; colorText: string }[] = [
    ...postTopics.map((t) => ({
      label: { type: "topic" as const, id: t.topicId },
      name: t.nameEn,
      colorBg: t.effectiveColorHex,
      colorText: t.effectiveTextColorHex,
    })),
    ...postTags.map((t) => ({
      label: { type: "tag" as const, id: t.tagId },
      name: t.name,
      colorBg: t.effectiveColorHex,
      colorText: t.effectiveTextColorHex,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>배너 라벨 설정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 선택 가능한 라벨 목록 */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              라벨 선택 (최대 {MAX_LABELS}개)
            </p>
            <div className="space-y-1.5">
              {allOptions.length === 0 && (
                <p className="text-sm text-muted-foreground">이 포스트에 라벨이 없습니다.</p>
              )}
              {allOptions.map((opt) => {
                const checked = isChecked(opt.label);
                const disabled = !checked && selected.length >= MAX_LABELS;
                return (
                  <label
                    key={labelKey(opt.label)}
                    className={`flex items-center gap-2.5 cursor-pointer rounded px-2 py-1.5 hover:bg-muted/40 transition-colors ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(opt.label)}
                      className="shrink-0"
                    />
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: opt.colorBg, color: opt.colorText }}
                    >
                      {opt.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {opt.label.type === "topic" ? "토픽" : "태그"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 선택된 라벨 순서 */}
          {selected.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">표시 순서</p>
              <div className="space-y-1">
                {selected.map((o, idx) => {
                  const color = getColor(o);
                  return (
                    <div key={labelKey(o)} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 text-right">{idx + 1}</span>
                      <span
                        className="flex-1 px-2 py-0.5 rounded-full text-xs font-semibold truncate"
                        style={{ backgroundColor: color.bg, color: color.text }}
                      >
                        {getLabel(o)}
                      </span>
                      <button
                        type="button"
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveDown(idx)}
                        disabled={idx === selected.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            기본으로 초기화
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
