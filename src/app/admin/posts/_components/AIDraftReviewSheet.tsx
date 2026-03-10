"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export type AIDraftData = {
  titleKo: string;
  titleEn: string;
  contextKo: string;
  contextEn: string;
  vibes: string[];
  mustTryKo: string;
  mustTryEn: string;
  tipKo: string;
  tipEn: string;
  storyKo: string;
  storyEn: string;
};

export type CurrentFormSnapshot = {
  titleKo: string;
  bodyKo: string;
  contextKo: string;
  vibes: string[];
  mustTryKo: string;
  tipKo: string;
};

type FieldKey = "titleKo" | "storyKo" | "contextKo" | "vibes" | "mustTryKo" | "tipKo";

type StepDef = {
  title: string;
  fields: {
    key: FieldKey;
    label: string;
    multiline?: boolean;
    vertical?: boolean;
    getCurrentValue: (current: CurrentFormSnapshot) => string;
  }[];
};

const STEPS: StepDef[] = [
  {
    title: "제목",
    fields: [
      {
        key: "titleKo",
        label: "제목",
        vertical: true,
        getCurrentValue: (c) => c.titleKo,
      },
    ],
  },
  {
    title: "Spot Insight",
    fields: [
      {
        key: "contextKo",
        label: "Context",
        multiline: true,
        getCurrentValue: (c) => c.contextKo,
      },
      {
        key: "vibes",
        label: "Vibes",
        getCurrentValue: (c) => c.vibes.join(", "),
      },
      {
        key: "mustTryKo",
        label: "Must Try",
        getCurrentValue: (c) => c.mustTryKo,
      },
      {
        key: "tipKo",
        label: "Tip",
        getCurrentValue: (c) => c.tipKo,
      },
    ],
  },
  {
    title: "본문",
    fields: [
      {
        key: "storyKo",
        label: "본문",
        multiline: true,
        getCurrentValue: (c) => c.bodyKo,
      },
    ],
  },
];

interface AIDraftReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: AIDraftData | null;
  current: CurrentFormSnapshot;
  onApply: (selected: Partial<AIDraftData>) => void;
}

// ─── 헬퍼 ───────────────────────────────────────────────────────────────────────

function initEditedValues(draft: AIDraftData): Record<FieldKey, string> {
  return {
    titleKo: draft.titleKo,
    storyKo: draft.storyKo,
    contextKo: draft.contextKo,
    vibes: draft.vibes.join(", "),
    mustTryKo: draft.mustTryKo,
    tipKo: draft.tipKo,
  };
}

// ─── AIDraftReviewDialog ────────────────────────────────────────────────────────

export function AIDraftReviewDialog({
  open,
  onOpenChange,
  draft,
  current,
  onApply,
}: AIDraftReviewDialogProps) {
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<Record<FieldKey, boolean>>({
    titleKo: true,
    storyKo: true,
    contextKo: true,
    vibes: true,
    mustTryKo: true,
    tipKo: true,
  });
  const [editedValues, setEditedValues] = useState<Record<FieldKey, string>>({
    titleKo: "", storyKo: "", contextKo: "", vibes: "", mustTryKo: "", tipKo: "",
  });

  useEffect(() => {
    if (open && draft) setEditedValues(initEditedValues(draft));
  }, [open, draft]);

  if (!draft) return null;

  const currentStep = STEPS[step];
  const allCheckedInStep = currentStep.fields.every((f) => checked[f.key]);

  function toggleAll() {
    const newVal = !allCheckedInStep;
    setChecked((prev) => {
      const next = { ...prev };
      for (const f of currentStep.fields) next[f.key] = newVal;
      return next;
    });
  }

  function buildSelected(): Partial<AIDraftData> {
    const result: Partial<AIDraftData> = {};
    if (checked.titleKo) result.titleKo = editedValues.titleKo;
    if (checked.storyKo) result.storyKo = editedValues.storyKo;
    if (checked.contextKo) result.contextKo = editedValues.contextKo;
    if (checked.vibes) result.vibes = editedValues.vibes.split(",").map((v) => v.trim()).filter(Boolean);
    if (checked.mustTryKo) result.mustTryKo = editedValues.mustTryKo;
    if (checked.tipKo) result.tipKo = editedValues.tipKo;
    return result;
  }

  function handleApplySelected() {
    onApply(buildSelected());
    onOpenChange(false);
  }

  function handleApplyAll() {
    const all: Partial<AIDraftData> = {
      titleKo: editedValues.titleKo,
      storyKo: editedValues.storyKo,
      contextKo: editedValues.contextKo,
      vibes: editedValues.vibes.split(",").map((v) => v.trim()).filter(Boolean),
      mustTryKo: editedValues.mustTryKo,
      tipKo: editedValues.tipKo,
    };
    onApply(all);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setStep(0);
        onOpenChange(o);
      }}
    >
      <DialogContent className="!w-[900px] !max-w-[900px] h-[700px] flex flex-col p-0 gap-0 overflow-hidden !rounded-[32px]">
        {/* 헤더 */}
        <DialogHeader className="px-6 pt-5 pb-3 shrink-0 border-b">
          <DialogTitle className="text-base mb-3">AI 초안 검토</DialogTitle>
          {/* 스텝 탭 + 전체 선택/해제 */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                    step === i
                      ? "bg-zinc-900 text-white font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {`${["①", "②", "③"][i]} ${s.title}`}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground underline hover:text-foreground"
              onClick={toggleAll}
            >
              {allCheckedInStep ? "전체 해제" : "전체 선택"}
            </button>
          </div>
        </DialogHeader>

        {/* 스크롤 영역 */}
        <div className="overflow-y-auto flex-1">
          {currentStep.fields.map((field) => {
            const currentVal = field.getCurrentValue(current);
            const isChecked = checked[field.key];

            return (
              <div key={field.key} className="px-6 py-4 border-b last:border-b-0">
                {/* 상단: 라벨 + 체크박스 */}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold">{field.label}</span>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(val) =>
                      setChecked((prev) => ({ ...prev, [field.key]: !!val }))
                    }
                  />
                </div>

                {/* 하단: 현재값 | AI값 */}
                <div className={`grid gap-3 ${field.vertical ? "grid-cols-1" : "grid-cols-2"}`}>
                  {/* 현재값 */}
                  <div>
                    <p className="text-[11px] text-zinc-400 mb-1">현재</p>
                    <div
                      className={`bg-zinc-50 rounded-lg px-4 py-3 text-sm text-zinc-500 ${
                        field.multiline ? "whitespace-pre-wrap min-h-[80px]" : ""
                      }`}
                    >
                      {currentVal || <span className="opacity-40">—</span>}
                    </div>
                  </div>

                  {/* AI값 */}
                  <div>
                    <p className="text-[11px] text-zinc-400 mb-1">AI 초안</p>
                    {field.multiline ? (
                      <textarea
                        value={editedValues[field.key]}
                        onChange={(e) =>
                          setEditedValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        disabled={!isChecked}
                        rows={4}
                        className={`w-full bg-white border rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] transition-opacity ${
                          isChecked ? "opacity-100" : "opacity-40"
                        }`}
                      />
                    ) : (
                      <input
                        type="text"
                        value={editedValues[field.key]}
                        onChange={(e) =>
                          setEditedValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        disabled={!isChecked}
                        className={`w-full bg-white border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-opacity ${
                          isChecked ? "opacity-100" : "opacity-40"
                        }`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 푸터 */}
        <DialogFooter className="px-6 py-3 border-t shrink-0 flex-row items-center justify-between gap-2">
          {/* 이전 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className="gap-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            이전
          </Button>

          {/* 스텝 dot 인디케이터 */}
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? "bg-zinc-900" : "bg-zinc-200"
                }`}
              />
            ))}
          </div>

          {/* 오른쪽 버튼들 */}
          <div className="flex gap-2">
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep((s) => s + 1)}
                className="gap-1"
              >
                다음
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={handleApplySelected}>
                선택 항목 적용
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-brand text-black hover:bg-brand/90 border-0"
              onClick={handleApplyAll}
            >
              모두 적용
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 이전 이름으로도 export (하위 호환)
export { AIDraftReviewDialog as AIDraftReviewSheet };
