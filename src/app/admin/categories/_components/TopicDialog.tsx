"use client";

import { useState, useEffect, useTransition, useRef, useMemo } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { createTopic, updateTopic, deleteTopic, checkTopicSlug } from "../actions";
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
  effectiveGradientDir: string;
  effectiveGradientStop: number;
  effectiveTextColorHex: string;
}

interface TopicDialogProps {
  open: boolean;
  topic: TopicNode | null;           // null = 생성 모드
  defaultParentId?: string | null;   // 생성 모드일 때 preset 부모
  allTopics: FlatTopic[];
  parentEffectiveColor: { hex: string; hex2: string | null; gradientDir: string; gradientStop: number; textHex: string } | null;
  onClose: () => void;
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────


// ─── 자손 ID 계산 (클라이언트) ──────────────────────────────────────────────────

function getDescendantIds(topicId: string, topics: FlatTopic[]): string[] {
  const children = topics.filter((t) => t.parentId === topicId);
  return children.flatMap((c) => [c.id, ...getDescendantIds(c.id, topics)]);
}

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
  gradientDir = "to bottom",
  gradientStop = 150,
  textColorHex,
  dimmed,
}: {
  label: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir?: string;
  gradientStop?: number;
  textColorHex: string;
  dimmed?: boolean;
}) {
  const background = colorHex2
    ? `linear-gradient(${gradientDir}, ${colorHex}, ${colorHex2} ${gradientStop}%)`
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

// ─── 깊이 유틸 ────────────────────────────────────────────────────────────────

function getSubtreeDepth(topicId: string, topics: FlatTopic[]): number {
  const children = topics.filter((t) => t.parentId === topicId);
  if (children.length === 0) return 0;
  return 1 + Math.max(...children.map((c) => getSubtreeDepth(c.id, topics)));
}

// allTopics는 level 오름차순 정렬 → 부모가 항상 먼저 처리됨
function buildRootIdMap(topics: FlatTopic[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of topics) {
    if (!t.parentId) map.set(t.id, t.id);
    else map.set(t.id, map.get(t.parentId) ?? t.id);
  }
  return map;
}

// ─── ParentPicker ──────────────────────────────────────────────────────────────

function ParentPicker({
  value,
  onChange,
  allTopics,
  allowedTopics,
  rootIdMap,
  rootTopics,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  allTopics: FlatTopic[];
  allowedTopics: FlatTopic[];
  rootIdMap: Map<string, string>;
  rootTopics: FlatTopic[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = value ? allTopics.find((t) => t.id === value) : null;
  const q = search.trim().toLowerCase();
  const filtered = q
    ? allowedTopics.filter(
        (t) =>
          t.nameKo.includes(search.trim()) ||
          t.nameEn.toLowerCase().includes(q)
      )
    : allowedTopics;

  function select(id: string | null) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  return (
    <div className="relative" ref={ref}>
      {/* 트리거 버튼 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm flex items-center gap-2 text-left hover:bg-muted/30 transition-colors"
      >
        {selected ? (
          <>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: selected.effectiveColorHex }}
            />
            <span className="flex-1 truncate">{selected.nameKo}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              L{selected.level}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">없음 (루트 — Level 0)</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 ml-1 shrink-0 text-muted-foreground" />
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg">
          {/* 검색 */}
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              type="text"
              placeholder="이름으로 검색…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 text-sm bg-transparent focus:outline-none"
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            {/* 없음 (루트) */}
            <button
              type="button"
              onClick={() => select(null)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${
                !value ? "bg-muted/30 font-medium" : ""
              }`}
            >
              없음 (루트 — Level 0)
            </button>

            {/* 루트별 그룹 */}
            {rootTopics.map((root) => {
              const isRootAllowed = !!allowedTopics.find((t) => t.id === root.id);
              const children = filtered.filter(
                (t) => rootIdMap.get(t.id) === root.id && t.id !== root.id
              );
              if (!isRootAllowed && children.length === 0) return null;

              return (
                <div key={root.id}>
                  {/* 루트 자체: 선택 가능하면 클릭 가능 */}
                  <button
                    type="button"
                    disabled={!isRootAllowed}
                    onClick={isRootAllowed ? () => select(root.id) : undefined}
                    className={`w-full text-left px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5
                      ${
                        isRootAllowed
                          ? "hover:bg-muted/50 cursor-pointer"
                          : "cursor-default text-muted-foreground"
                      }
                      ${value === root.id ? "bg-muted/30" : "bg-muted/20"}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: root.effectiveColorHex }}
                    />
                    {root.nameKo}
                    {isRootAllowed && (
                      <span className="ml-auto font-normal text-muted-foreground">
                        L0
                      </span>
                    )}
                  </button>

                  {/* 자식 항목 */}
                  {children.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => select(t.id)}
                      className={`w-full text-left py-1.5 pr-3 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2 ${
                        value === t.id ? "bg-muted/30" : ""
                      }`}
                      style={{ paddingLeft: `${12 + t.level * 12}px` }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: t.effectiveColorHex }}
                      />
                      <span className="truncate">{t.nameKo}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({t.nameEn})
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground shrink-0">
                        L{t.level}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}

            {filtered.length === 0 && q && (
              <p className="px-3 py-3 text-sm text-muted-foreground text-center">
                검색 결과 없음
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TopicDialog ───────────────────────────────────────────────────────────────

export function TopicDialog({ open, topic, defaultParentId, allTopics, parentEffectiveColor, onClose }: TopicDialogProps) {
  const isEdit = topic !== null;
  const [isPending, startTransition] = useTransition();

  // ─ slug 중복 체크 상태 ─
  const [slugDuplicate, setSlugDuplicate] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);

  // ─ 폼 상태 ─
  const [nameKo, setNameKo] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [parentId, setParentId] = useState<string | null>(null);
  const [inheritColor, setInheritColor] = useState(true);  // true = 부모 색 상속
  const [isGradient, setIsGradient] = useState(false);     // true = 그라데이션
  const [colorHex, setColorHex] = useState("#C6FD09");
  const [colorHex2, setColorHex2] = useState("#ffffff");   // 그라데이션 끝 색
  const [gradientDir, setGradientDir] = useState<"to bottom" | "to right">("to bottom");
  const [gradientStop, setGradientStop] = useState(150);
  const [textColorHex, setTextColorHex] = useState<"#000000" | "#FFFFFF">("#000000");
  const [isActive, setIsActive] = useState(true);

  // slug 실시간 중복 체크
  useEffect(() => {
    if (!slug.trim()) { setSlugDuplicate(false); return; }
    setSlugChecking(true);
    const timer = setTimeout(async () => {
      const { exists } = await checkTopicSlug(slug, topic?.id ?? undefined);
      setSlugDuplicate(exists);
      setSlugChecking(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, topic?.id]);

  // dialog 열릴 때 초기값 설정
  useEffect(() => {
    if (open) {
      setSlugDuplicate(false);
      setSlugChecking(false);
      if (isEdit && topic) {
        setNameKo(topic.nameKo);
        setNameEn(topic.nameEn);
        setSlug(topic.slug ?? "");
        setSlugManual(false);
        setParentId(topic.parentId);
        setInheritColor(topic.colorHex === null);
        setIsGradient(topic.colorHex2 !== null);
        setColorHex(topic.colorHex ?? parentEffectiveColor?.hex ?? "#C6FD09");
        setColorHex2(topic.colorHex2 ?? parentEffectiveColor?.hex2 ?? "#ffffff");
        setGradientDir((topic.gradientDir as "to bottom" | "to right") ?? "to bottom");
        setGradientStop(topic.gradientStop ?? 150);
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
        setParentId(defaultParentId ?? null);
        setInheritColor(true);
        setIsGradient(parentEffectiveColor?.hex2 != null);
        setColorHex(parentEffectiveColor?.hex ?? "#C6FD09");
        setColorHex2(parentEffectiveColor?.hex2 ?? "#ffffff");
        setGradientDir((parentEffectiveColor?.gradientDir as "to bottom" | "to right") ?? "to bottom");
        setGradientStop(parentEffectiveColor?.gradientStop ?? 150);
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

  const descendantIds = isEdit && topic ? getDescendantIds(topic.id, allTopics) : [];

  const parentTopic = allTopics.find((t) => t.id === parentId);
  const computedLevel = parentTopic ? parentTopic.level + 1 : 0;
  const hasChildren = isEdit && topic
    ? allTopics.some((t) => t.parentId === topic.id)
    : false;

  // 깊이 제약
  const selfSubtreeDepth = isEdit && topic ? getSubtreeDepth(topic.id, allTopics) : 0;
  const maxAllowedParentLevel = 2 - selfSubtreeDepth;

  const rootIdMap = useMemo(() => buildRootIdMap(allTopics), [allTopics]);
  const rootTopics = useMemo(() => allTopics.filter((t) => !t.parentId), [allTopics]);

  const allowedParentTopics = allTopics.filter(
    (t) =>
      t.id !== topic?.id &&
      !descendantIds.includes(t.id) &&
      t.level <= maxAllowedParentLevel
  );

  // 미리보기용 현재 effective 색
  const previewHex = inheritColor ? (parentEffectiveColor?.hex ?? "#C6FD09") : colorHex;
  const previewHex2 = inheritColor
    ? (parentEffectiveColor?.hex2 ?? null)
    : (isGradient ? colorHex2 : null);
  const previewDir = inheritColor ? (parentEffectiveColor?.gradientDir ?? "to bottom") : gradientDir;
  const previewStop = inheritColor ? (parentEffectiveColor?.gradientStop ?? 150) : gradientStop;
  const previewText = inheritColor ? (parentEffectiveColor?.textHex ?? "#000000") : textColorHex;

  // ─ 제출 ─
  function handleSubmit() {
    if (!nameKo.trim() || !nameEn.trim() || !slug.trim()) {
      toast.error("이름(KO/EN)과 slug는 필수입니다.");
      return;
    }
    if (slugDuplicate) {
      toast.error("이미 사용 중인 slug입니다.");
      return;
    }
    const data = {
      nameKo: nameKo.trim(),
      nameEn: nameEn.trim(),
      slug: slug.trim(),
      parentId: parentId || null,
      colorHex: inheritColor ? null : colorHex,
      colorHex2: inheritColor ? null : (isGradient ? colorHex2 : null),
      gradientDir,
      gradientStop,
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
            {slugChecking && <p className="text-xs text-muted-foreground mt-1">확인 중…</p>}
            {!slugChecking && slugDuplicate && (
              <p className="text-xs text-destructive mt-1">이미 사용 중인 slug입니다.</p>
            )}
          </div>

          {/* parentId */}
          <div className="space-y-1.5">
            <Label>부모 Topic</Label>
            {/* 깊이 제약 경고 */}
            {selfSubtreeDepth > 2 && (
              <p className="text-xs text-amber-600">
                ⚠ 이 항목의 하위 트리 깊이({selfSubtreeDepth})로 인해 루트 이외 부모를 선택할 수 없습니다.
              </p>
            )}
            {selfSubtreeDepth > 0 && selfSubtreeDepth <= 2 && (
              <p className="text-xs text-muted-foreground">
                하위 트리 깊이({selfSubtreeDepth})로 인해 L{maxAllowedParentLevel} 이하 항목만 선택 가능합니다.
              </p>
            )}
            <ParentPicker
              value={parentId}
              onChange={setParentId}
              allTopics={allTopics}
              allowedTopics={allowedParentTopics}
              rootIdMap={rootIdMap}
              rootTopics={rootTopics}
            />
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
                  gradientDir={previewDir}
                  gradientStop={previewStop}
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
                  <ColorPreview
                    label={nameEn || "nameEn"}
                    colorHex={colorHex}
                    colorHex2={isGradient ? colorHex2 : null}
                    gradientDir={gradientDir}
                    gradientStop={gradientStop}
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
