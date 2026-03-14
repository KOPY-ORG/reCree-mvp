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
import { GradientColorSection, TextColorPicker } from "./color-fields";

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
  const [colorHex, setColorHex] = useState("#C8FF09");
  const [colorHex2, setColorHex2] = useState("#ffffff");
  const [gradientDir, setGradientDir] = useState<"to bottom" | "to right">("to bottom");
  const [gradientStop, setGradientStop] = useState(150);
  const [textColorHex, setTextColorHex] = useState<string>("#000000");

  useEffect(() => {
    if (open) {
      if (mode === "edit" && groupConfig) {
        setNameEn(groupConfig.nameEn || groupConfig.group);
        setIsGradient(groupConfig.colorHex2 !== null);
        setColorHex(groupConfig.colorHex);
        setColorHex2(groupConfig.colorHex2 ?? "#ffffff");
        setGradientDir((groupConfig.gradientDir as "to bottom" | "to right") ?? "to bottom");
        setGradientStop(groupConfig.gradientStop ?? 150);
        setTextColorHex(groupConfig.textColorHex);
      } else {
        setNameEn("");
        setIsGradient(false);
        setColorHex("#C8FF09");
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

          <GradientColorSection
            colorHex={colorHex}
            onColorHex={setColorHex}
            colorHex2={colorHex2}
            onColorHex2={setColorHex2}
            isGradient={isGradient}
            onGradientToggle={setIsGradient}
            gradientDir={gradientDir}
            onGradientDir={setGradientDir}
            gradientStop={gradientStop}
            onGradientStop={setGradientStop}
          />

          <TextColorPicker
            value={textColorHex}
            onChange={(v) => setTextColorHex(v ?? "#000000")}
            showPicker={false}
          />

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
