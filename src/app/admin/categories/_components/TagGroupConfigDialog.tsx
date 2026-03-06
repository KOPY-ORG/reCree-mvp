"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertTagGroupConfig, createTagGroup, type TagGroupConfigCreated, type TagGroupConfigData } from "../actions";
import type { TagGroupConfigItem } from "./SortableTagList";
import { ColorLabel } from "./SortableTagList";

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-border cursor-pointer p-0.5 bg-transparent shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs h-8"
          maxLength={7}
        />
      </div>
    </div>
  );
}

interface TagGroupConfigDialogProps {
  open: boolean;
  mode: "create" | "edit";
  groupConfig: TagGroupConfigItem | null;
  onClose: () => void;
  onCreated?: (created: TagGroupConfigCreated) => void;
  onUpdated?: (updated: TagGroupConfigData) => void;
}

export function TagGroupConfigDialog({ open, mode, groupConfig, onClose, onCreated, onUpdated }: TagGroupConfigDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [nameEn, setNameEn] = useState("");
  const [isGradient, setIsGradient] = useState(false);
  const [colorHex, setColorHex] = useState("#C6FD09");
  const [colorHex2, setColorHex2] = useState("#ffffff");
  const [gradientDir, setGradientDir] = useState<"to bottom" | "to right">("to bottom");
  const [gradientStop, setGradientStop] = useState(150);
  const [textColorHex, setTextColorHex] = useState<"#000000" | "#FFFFFF">("#000000");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && groupConfig) {
        setNameEn(groupConfig.nameEn || groupConfig.group);
        setIsGradient(groupConfig.colorHex2 !== null);
        setColorHex(groupConfig.colorHex);
        setColorHex2(groupConfig.colorHex2 ?? "#ffffff");
        setGradientDir((groupConfig.gradientDir as "to bottom" | "to right") ?? "to bottom");
        setGradientStop(groupConfig.gradientStop ?? 150);
        setTextColorHex(groupConfig.textColorHex === "#FFFFFF" ? "#FFFFFF" : "#000000");
      } else {
        setNameEn("");
        setIsGradient(false);
        setColorHex("#C6FD09");
        setColorHex2("#ffffff");
        setGradientDir("to bottom");
        setGradientStop(150);
        setTextColorHex("#000000");
      }
    }
  }, [open, mode, groupConfig]);

  function handleSubmit() {
    const formData = {
      nameEn: nameEn.trim(),
      colorHex,
      colorHex2: isGradient ? colorHex2 : null,
      gradientDir,
      gradientStop,
      textColorHex,
    };

    startTransition(async () => {
      if (mode === "create") {
        if (!nameEn.trim()) {
          toast.error("그룹 이름(영어)을 입력해주세요.");
          return;
        }
        const result = await createTagGroup(formData);
        if (result.error) {
          toast.error(result.error);
        } else {
          if (result.created) onCreated?.(result.created);
          toast.success("새 그룹이 생성되었습니다.");
          onClose();
        }
      } else {
        if (!groupConfig) return;
        const result = await upsertTagGroupConfig(groupConfig.group, formData);
        if (result.error) {
          toast.error(result.error);
        } else {
          if (result.updated) onUpdated?.(result.updated);
          toast.success("그룹 설정이 저장되었습니다.");
          onClose();
        }
      }
    });
  }

  if (mode === "edit" && !groupConfig) return null;

  const previewName = nameEn.trim() || (mode === "edit" && groupConfig ? groupConfig.group : "NEW GROUP");
  const derivedKey = nameEn.trim().toUpperCase().replace(/\W+/g, "_");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "새 Tag 그룹 추가"
              : `${groupConfig!.group} 그룹 설정`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 영어 라벨 이름 */}
          <div className="space-y-1.5">
            <Label htmlFor="groupNameEn">그룹 이름 (영어) *</Label>
            <Input
              id="groupNameEn"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="예: Fashion"
            />
            {mode === "create" && nameEn.trim() && (
              <p className="text-xs text-muted-foreground">
                그룹 키: <span className="font-mono font-semibold">{derivedKey}</span>
              </p>
            )}
          </div>

          {/* 단색 / 그라데이션 토글 */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setIsGradient(false)}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-all ${
                !isGradient
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              단색
            </button>
            <button
              type="button"
              onClick={() => setIsGradient(true)}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-all ${
                isGradient
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
            >
              그라데이션
            </button>
          </div>

          {/* 색 피커 */}
          <div className={`grid gap-3 ${isGradient ? "grid-cols-2" : "grid-cols-1"}`}>
            <ColorPicker
              label={isGradient ? "시작 색" : "배경색"}
              value={colorHex}
              onChange={setColorHex}
            />
            {isGradient && (
              <ColorPicker label="끝 색" value={colorHex2} onChange={setColorHex2} />
            )}
          </div>

          {/* 그라데이션 방향 + 범위 */}
          {isGradient && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">방향</Label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGradientDir("to bottom")}
                    className={`flex-1 py-1 rounded text-xs font-medium border transition-all ${
                      gradientDir === "to bottom"
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    세로 ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setGradientDir("to right")}
                    className={`flex-1 py-1 rounded text-xs font-medium border transition-all ${
                      gradientDir === "to right"
                        ? "bg-foreground text-background border-foreground"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    가로 →
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">끝 위치 (%)</Label>
                <input
                  type="number"
                  min={50}
                  max={300}
                  step={10}
                  value={gradientStop}
                  onChange={(e) => setGradientStop(Number(e.target.value))}
                  className="w-full h-8 rounded border border-border px-2 text-xs font-mono bg-transparent"
                />
              </div>
            </div>
          )}

          {/* 글자색 */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">글자색</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTextColorHex("#000000")}
                className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-all ${
                  textColorHex === "#000000"
                    ? "bg-black text-white border-black ring-2 ring-black/30"
                    : "bg-white text-black border-border"
                }`}
              >
                검정
              </button>
              <button
                type="button"
                onClick={() => setTextColorHex("#FFFFFF")}
                className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-all ${
                  textColorHex === "#FFFFFF"
                    ? "bg-white text-black border-gray-400 ring-2 ring-gray-300"
                    : "bg-gray-100 text-gray-500 border-border"
                }`}
              >
                흰색
              </button>
            </div>
          </div>

          {/* 미리보기 */}
          <div className="flex items-center gap-2 pt-0.5">
            <ColorLabel
              name={previewName}
              colorHex={colorHex}
              colorHex2={isGradient ? colorHex2 : null}
              gradientDir={gradientDir}
              gradientStop={gradientStop}
              textColorHex={textColorHex}
            />
            <span className="text-xs text-muted-foreground">미리보기</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            취소
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "저장 중…" : mode === "create" ? "생성" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
