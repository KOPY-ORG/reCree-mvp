"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { TopicType } from "@prisma/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createTopic, updateTopic, deleteTopic } from "../actions";
import type { TopicNode } from "./SortableTopicList";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface FlatTopic {
  id: string;
  nameKo: string;
  nameEn: string;
  level: number;
  parentId: string | null;
  effectiveColorHex: string;
  effectiveColorHex2: string | null;
  effectiveTextColorHex: string;
}

interface TopicDialogProps {
  open: boolean;
  topic: TopicNode | null;           // null = 생성 모드
  defaultParentId?: string | null;   // 생성 모드일 때 preset 부모
  allTopics: FlatTopic[];
  parentEffectiveColor: { hex: string; hex2: string | null; textHex: string } | null;
  onClose: () => void;
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: TopicType; label: string }[] = [
  { value: "CATEGORY", label: "카테고리" },
  { value: "GROUP", label: "그룹" },
  { value: "PERSON", label: "인물" },
  { value: "WORK", label: "작품" },
  { value: "SEASON", label: "시즌" },
  { value: "OTHER", label: "기타" },
];

// ─── slug 자동 생성 ────────────────────────────────────────────────────────────

function generateSlug(nameEn: string): string {
  return nameEn
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ─── ColorPreview ──────────────────────────────────────────────────────────────

function ColorPreview({
  label,
  colorHex,
  colorHex2,
  textColorHex,
  dimmed,
}: {
  label: string;
  colorHex: string;
  colorHex2: string | null;
  textColorHex: string;
  dimmed?: boolean;
}) {
  const background = colorHex2
    ? `linear-gradient(to bottom, ${colorHex}, ${colorHex2} 150%)`
    : colorHex;
  return (
    <span
      style={{ background, color: textColorHex, opacity: dimmed ? 0.7 : 1 }}
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
    >
      {label}
    </span>
  );
}

// ─── ColorPicker ──────────────────────────────────────────────────────────────

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

// ─── TopicDialog ───────────────────────────────────────────────────────────────

export function TopicDialog({ open, topic, defaultParentId, allTopics, parentEffectiveColor, onClose }: TopicDialogProps) {
  const isEdit = topic !== null;
  const [isPending, startTransition] = useTransition();

  // ─ 폼 상태 ─
  const [nameKo, setNameKo] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [type, setType] = useState<TopicType>("PERSON");
  const [parentId, setParentId] = useState<string | null>(null);
  const [inheritColor, setInheritColor] = useState(true);  // true = 부모 색 상속
  const [isGradient, setIsGradient] = useState(false);     // true = 그라데이션
  const [colorHex, setColorHex] = useState("#C6FD09");
  const [colorHex2, setColorHex2] = useState("#ffffff");   // 그라데이션 끝 색
  const [textColorHex, setTextColorHex] = useState<"#000000" | "#FFFFFF">("#000000");
  const [isActive, setIsActive] = useState(true);

  // dialog 열릴 때 초기값 설정
  useEffect(() => {
    if (open) {
      if (isEdit && topic) {
        setNameKo(topic.nameKo);
        setNameEn(topic.nameEn);
        setSlug(topic.slug ?? "");
        setSlugManual(false);
        setType(topic.type);
        setParentId(topic.parentId);
        setInheritColor(topic.colorHex === null);
        setIsGradient(topic.colorHex2 !== null);
        setColorHex(topic.colorHex ?? parentEffectiveColor?.hex ?? "#C6FD09");
        setColorHex2(topic.colorHex2 ?? parentEffectiveColor?.hex2 ?? "#ffffff");
        setTextColorHex(
          (topic.textColorHex ?? parentEffectiveColor?.textHex ?? "#000000") === "#FFFFFF"
            ? "#FFFFFF"
            : "#000000"
        );
        setIsActive(topic.isActive);
      } else {
        setNameKo("");
        setNameEn("");
        setSlug("");
        setSlugManual(false);
        setType("PERSON");
        setParentId(defaultParentId ?? null);
        setInheritColor(true);
        setIsGradient(parentEffectiveColor?.hex2 != null);
        setColorHex(parentEffectiveColor?.hex ?? "#C6FD09");
        setColorHex2(parentEffectiveColor?.hex2 ?? "#ffffff");
        setTextColorHex(
          (parentEffectiveColor?.textHex ?? "#000000") === "#FFFFFF" ? "#FFFFFF" : "#000000"
        );
        setIsActive(true);
      }
    }
  }, [open, isEdit, topic, defaultParentId, parentEffectiveColor]);

  // nameEn 변경 → slug 자동 생성 (수동 수정 아닐 때만)
  function handleNameEnChange(val: string) {
    setNameEn(val);
    if (!slugManual) setSlug(generateSlug(val));
  }

  function handleSlugChange(val: string) {
    setSlug(val);
    setSlugManual(true);
  }

  // 그라데이션 토글: 켜면 끝 색을 흰색으로 초기화
  function handleGradientToggle(enabled: boolean) {
    setIsGradient(enabled);
    if (enabled && colorHex2 === "#ffffff") {
      setColorHex2("#ffffff");
    }
  }

  const parentTopic = allTopics.find((t) => t.id === parentId);
  const computedLevel = parentTopic ? parentTopic.level + 1 : 0;
  const hasChildren = isEdit && topic
    ? allTopics.some((t) => t.parentId === topic.id)
    : false;

  // 미리보기용 현재 effective 색
  const previewHex = inheritColor ? (parentEffectiveColor?.hex ?? "#C6FD09") : colorHex;
  const previewHex2 = inheritColor
    ? (parentEffectiveColor?.hex2 ?? null)
    : (isGradient ? colorHex2 : null);
  const previewText = inheritColor ? (parentEffectiveColor?.textHex ?? "#000000") : textColorHex;

  // ─ 제출 ─
  function handleSubmit() {
    if (!nameKo.trim() || !nameEn.trim() || !slug.trim()) {
      toast.error("이름(KO/EN)과 slug는 필수입니다.");
      return;
    }

    const data = {
      nameKo: nameKo.trim(),
      nameEn: nameEn.trim(),
      slug: slug.trim(),
      type,
      parentId: parentId || null,
      colorHex: inheritColor ? null : colorHex,
      colorHex2: inheritColor ? null : (isGradient ? colorHex2 : null),
      textColorHex: inheritColor ? null : textColorHex,
      isActive,
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateTopic(topic!.id, data)
        : await createTopic(data);

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isEdit ? "수정되었습니다." : "생성되었습니다.");
        onClose();
      }
    });
  }

  // ─ 삭제 ─
  function handleDelete() {
    if (!isEdit || !topic) return;
    if (!confirm(`"${topic.nameKo}"를 삭제하시겠습니까?`)) return;

    startTransition(async () => {
      const result = await deleteTopic(topic.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("삭제되었습니다.");
        onClose();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Topic 수정" : "새 Topic 추가"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* nameKo */}
          <div className="space-y-1.5">
            <Label htmlFor="nameKo">이름 (한국어) *</Label>
            <Input
              id="nameKo"
              value={nameKo}
              onChange={(e) => setNameKo(e.target.value)}
              placeholder="예: 아이유"
            />
          </div>

          {/* nameEn */}
          <div className="space-y-1.5">
            <Label htmlFor="nameEn">이름 (영어) *</Label>
            <Input
              id="nameEn"
              value={nameEn}
              onChange={(e) => handleNameEnChange(e.target.value)}
              placeholder="예: IU"
            />
          </div>

          {/* slug */}
          <div className="space-y-1.5">
            <Label htmlFor="slug">
              Slug *
              {!slugManual && (
                <span className="ml-1 text-xs text-muted-foreground">(자동 생성)</span>
              )}
            </Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="예: iu"
            />
          </div>

          {/* type */}
          <div className="space-y-1.5">
            <Label>타입 *</Label>
            <Select value={type} onValueChange={(v) => setType(v as TopicType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* parentId */}
          <div className="space-y-1.5">
            <Label>부모 Topic</Label>
            <Select
              value={parentId ?? "__none__"}
              onValueChange={(v) => setParentId(v === "__none__" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="없음 (루트)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">없음 (루트 — Level 0)</SelectItem>
                {allTopics
                  .filter((t) => !isEdit || t.id !== topic?.id)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {"—".repeat(t.level)} {t.nameKo}
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({t.nameEn})
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Level: <span className="font-medium">{computedLevel}</span>
            </p>
          </div>

          {/* ─ 색상 섹션 ─ */}
          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            {/* 상속 토글 */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">라벨 색상</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">부모 색 사용</span>
                <Switch checked={inheritColor} onCheckedChange={setInheritColor} />
              </div>
            </div>

            {inheritColor ? (
              /* 상속 모드: 부모 effective 색 미리보기 */
              <div className="flex items-center gap-2 py-1">
                <ColorPreview
                  label={nameEn || "nameEn"}
                  colorHex={previewHex}
                  colorHex2={previewHex2}
                  textColorHex={previewText}
                  dimmed
                />
                <span className="text-xs text-muted-foreground">
                  {parentEffectiveColor
                    ? `부모로부터 상속 (${parentEffectiveColor.hex}${parentEffectiveColor.hex2 ? ` → ${parentEffectiveColor.hex2}` : ""})`
                    : "기본값 (#C6FD09)"}
                </span>
              </div>
            ) : (
              /* 직접 지정 모드 */
              <div className="space-y-3">
                {/* 단색 / 그라데이션 토글 */}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleGradientToggle(false)}
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
                    onClick={() => handleGradientToggle(true)}
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
                    <ColorPicker
                      label="끝 색"
                      value={colorHex2}
                      onChange={setColorHex2}
                    />
                  )}
                </div>

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
                  <ColorPreview
                    label={nameEn || "nameEn"}
                    colorHex={colorHex}
                    colorHex2={isGradient ? colorHex2 : null}
                    textColorHex={textColorHex}
                  />
                  <span className="text-sm text-muted-foreground">
                    {nameKo || "nameKo"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* isActive */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">활성화</Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {isEdit && (
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || hasChildren}
              onClick={handleDelete}
              title={hasChildren ? "자식 항목이 있어 삭제 불가" : undefined}
            >
              {hasChildren ? "삭제 불가 (자식 있음)" : "삭제"}
            </Button>
          )}

          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              취소
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "저장 중…" : "저장"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
