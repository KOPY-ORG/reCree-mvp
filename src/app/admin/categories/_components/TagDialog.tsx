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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createTag, updateTag, deleteTag, checkTagSlug, type TagSavedData } from "../actions";
import type { TagItem } from "./SortableTagList";

// ─── slug 자동 생성 ────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ─── TagDialogProps ───────────────────────────────────────────────────────────

interface TagDialogProps {
  open: boolean;
  tag: TagItem | null;
  defaultGroup?: string | null;
  groupOptions: { value: string; label: string }[];
  onClose: () => void;
  onSaved?: (data: TagSavedData) => void;
  onDeleted?: (id: string) => void;
}

// ─── TagDialog ─────────────────────────────────────────────────────────────────

export function TagDialog({ open, tag, defaultGroup, groupOptions, onClose, onSaved, onDeleted }: TagDialogProps) {
  const isEdit = tag !== null;
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [nameKo, setNameKo] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [slugDuplicate, setSlugDuplicate] = useState(false);
  const [slugChecking, setSlugChecking] = useState(false);
  const [group, setGroup] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  // slug 실시간 중복 체크
  useEffect(() => {
    if (!slug.trim()) { setSlugDuplicate(false); return; }
    setSlugChecking(true);
    const timer = setTimeout(async () => {
      const { exists } = await checkTagSlug(slug, tag?.id ?? undefined);
      setSlugDuplicate(exists);
      setSlugChecking(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, tag?.id]);

  useEffect(() => {
    if (open) {
      setSlugDuplicate(false);
      setSlugChecking(false);
      if (isEdit && tag) {
        setName(tag.name);
        setNameKo(tag.nameKo);
        setSlug(tag.slug);
        setSlugManual(false);
        setGroup(tag.group);
        setIsActive(tag.isActive);
      } else {
        setName("");
        setNameKo("");
        setSlug("");
        setSlugManual(false);
        setGroup(defaultGroup ?? groupOptions[0]?.value ?? "");
        setIsActive(true);
      }
    }
  }, [open, isEdit, tag, defaultGroup, groupOptions]);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugManual) setSlug(generateSlug(val));
  }

  function handleSlugChange(val: string) {
    setSlug(val);
    setSlugManual(true);
  }

  function handleSubmit() {
    if (!name.trim() || !nameKo.trim() || !slug.trim()) {
      toast.error("이름(영어/한국어)과 slug는 필수입니다.");
      return;
    }
    if (slugDuplicate) {
      toast.error("이미 사용 중인 slug입니다.");
      return;
    }

    const data = {
      name: name.trim(),
      nameKo: nameKo.trim(),
      slug: slug.trim(),
      group,
      colorHex: null as string | null,
      colorHex2: null as string | null,
      textColorHex: null as string | null,
      isActive,
    };

    startTransition(async () => {
      if (isEdit) {
        const result = await updateTag(tag!.id, data);
        if (result.error) {
          toast.error(result.error);
        } else {
          if (result.updated) onSaved?.(result.updated);
          toast.success("수정되었습니다.");
          onClose();
        }
      } else {
        const result = await createTag(data);
        if (result.error) {
          toast.error(result.error);
        } else {
          if (result.created) onSaved?.(result.created);
          toast.success("생성되었습니다.");
          onClose();
        }
      }
    });
  }

  function handleDelete() {
    if (!isEdit || !tag) return;
    if (!confirm(`"${tag.nameKo}"를 삭제하시겠습니까?`)) return;

    startTransition(async () => {
      const result = await deleteTag(tag.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        onDeleted?.(tag.id);
        toast.success("삭제되었습니다.");
        onClose();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Tag 수정" : "새 Tag 추가"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* name (영어) */}
          <div className="space-y-1.5">
            <Label htmlFor="tagName">이름 (영어) *</Label>
            <Input
              id="tagName"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="예: pasta"
            />
          </div>

          {/* nameKo */}
          <div className="space-y-1.5">
            <Label htmlFor="tagNameKo">이름 (한국어) *</Label>
            <Input
              id="tagNameKo"
              value={nameKo}
              onChange={(e) => setNameKo(e.target.value)}
              placeholder="예: 파스타"
            />
          </div>

          {/* slug */}
          <div className="space-y-1.5">
            <Label htmlFor="tagSlug">
              Slug *
              {!slugManual && (
                <span className="ml-1 text-xs text-muted-foreground">(자동 생성)</span>
              )}
            </Label>
            <Input
              id="tagSlug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="예: pasta"
            />
            {slugChecking && <p className="text-xs text-muted-foreground mt-1">확인 중…</p>}
            {!slugChecking && slugDuplicate && (
              <p className="text-xs text-destructive mt-1">이미 사용 중인 slug입니다.</p>
            )}
          </div>

          {/* group */}
          <div className="space-y-1.5">
            <Label>그룹 *</Label>
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {groupOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* isActive */}
          <div className="flex items-center justify-between">
            <Label htmlFor="tagIsActive">활성화</Label>
            <Switch
              id="tagIsActive"
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
              disabled={isPending}
              onClick={handleDelete}
            >
              삭제
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
