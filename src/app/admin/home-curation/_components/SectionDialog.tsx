"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSection, updateSection, type SectionFormData } from "../_actions/home-curation-actions";
import { PostPickerDialog, type PickablePost } from "./PostPickerDialog";
import type { ContentType, SectionType } from "@prisma/client";

type TopicOption = { id: string; nameKo: string; nameEn: string };
type TagOption = { id: string; nameKo: string; name: string };

interface SectionDialogProps {
  open: boolean;
  onClose: () => void;
  posts: PickablePost[];
  topics: TopicOption[];
  tags: TagOption[];
  editTarget?: {
    id: string;
    titleEn: string;
    titleKo: string;
    subtitleEn: string | null;
    subtitleKo: string | null;
    contentType: ContentType;
    type: SectionType;
    postIds: string[];
    filterTopicId: string | null;
    filterTagId: string | null;
    maxCount: number;
    isActive: boolean;
  };
}

const INITIAL: SectionFormData = {
  titleEn: "",
  titleKo: "",
  subtitleEn: "",
  subtitleKo: "",
  contentType: "POST",
  type: "AUTO_NEW",
  postIds: [],
  filterTopicId: "",
  filterTagId: "",
  maxCount: 10,
  isActive: true,
};

export function SectionDialog({
  open,
  onClose,
  posts,
  topics,
  tags,
  editTarget,
}: SectionDialogProps) {
  const [form, setForm] = useState<SectionFormData>(
    editTarget
      ? {
          titleEn: editTarget.titleEn,
          titleKo: editTarget.titleKo,
          subtitleEn: editTarget.subtitleEn ?? "",
          subtitleKo: editTarget.subtitleKo ?? "",
          contentType: editTarget.contentType,
          type: editTarget.type,
          postIds: editTarget.postIds,
          filterTopicId: editTarget.filterTopicId ?? "",
          filterTagId: editTarget.filterTagId ?? "",
          maxCount: editTarget.maxCount,
          isActive: editTarget.isActive,
        }
      : INITIAL
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof SectionFormData>(key: K, value: SectionFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titleEn.trim() || !form.titleKo.trim()) return;
    startTransition(async () => {
      if (editTarget) {
        await updateSection(editTarget.id, form);
      } else {
        await createSection(form);
      }
      onClose();
    });
  }

  const selectedPostLabels = posts
    .filter((p) => form.postIds.includes(p.id))
    .map((p) => p.titleEn)
    .join(", ");

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "섹션 수정" : "섹션 추가"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* 제목 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>제목 (영문) *</Label>
                <Input
                  value={form.titleEn}
                  onChange={(e) => set("titleEn", e.target.value)}
                  placeholder="e.g. Trending Now"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>제목 (한글) *</Label>
                <Input
                  value={form.titleKo}
                  onChange={(e) => set("titleKo", e.target.value)}
                  placeholder="e.g. 지금 뜨는"
                  required
                />
              </div>
            </div>

            {/* 소제목 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>소제목 (영문)</Label>
                <Input
                  value={form.subtitleEn}
                  onChange={(e) => set("subtitleEn", e.target.value)}
                  placeholder="optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label>소제목 (한글)</Label>
                <Input
                  value={form.subtitleKo}
                  onChange={(e) => set("subtitleKo", e.target.value)}
                  placeholder="선택"
                />
              </div>
            </div>

            {/* 컨텐츠 타입 */}
            <div className="space-y-1.5">
              <Label>컨텐츠 타입</Label>
              <Select
                value={form.contentType}
                onValueChange={(v) => set("contentType", v as ContentType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="RECREESHOT">ReCreeshot</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* POST 전용 옵션 */}
            {form.contentType === "POST" && (
              <div className="space-y-1.5">
                <Label>섹션 타입</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => set("type", v as SectionType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">MANUAL (직접 선택)</SelectItem>
                    <SelectItem value="AUTO_NEW">AUTO_NEW (최신순)</SelectItem>
                    <SelectItem value="AUTO_HOT">AUTO_HOT (인기순)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* MANUAL: 포스트 선택 */}
            {form.contentType === "POST" && form.type === "MANUAL" && (
              <div className="space-y-1.5">
                <Label>포스트 선택</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start font-normal"
                  onClick={() => setPickerOpen(true)}
                >
                  {form.postIds.length === 0
                    ? "포스트 선택..."
                    : `${form.postIds.length}개 선택됨`}
                </Button>
                {selectedPostLabels && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedPostLabels}
                  </p>
                )}
              </div>
            )}

            {/* AUTO / RECREESHOT: 필터 + maxCount */}
            {(form.contentType === "RECREESHOT" ||
              (form.contentType === "POST" && form.type !== "MANUAL")) && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>토픽 필터</Label>
                    <Select
                      value={form.filterTopicId || "none"}
                      onValueChange={(v) =>
                        set("filterTopicId", v === "none" ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">전체</SelectItem>
                        {topics.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nameKo} ({t.nameEn})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>태그 필터</Label>
                    <Select
                      value={form.filterTagId || "none"}
                      onValueChange={(v) =>
                        set("filterTagId", v === "none" ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="전체" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">전체</SelectItem>
                        {tags.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nameKo} ({t.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>최대 표시 수</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={form.maxCount}
                    onChange={(e) => set("maxCount", Number(e.target.value))}
                  />
                </div>
              </>
            )}

            {/* 활성화 */}
            <div className="flex items-center gap-2">
              <input
                id="section-active"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="size-4 accent-brand"
              />
              <Label htmlFor="section-active">활성화</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "저장 중..." : editTarget ? "수정" : "추가"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PostPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        posts={posts}
        selectedIds={form.postIds}
        onConfirm={(ids) => set("postIds", ids)}
      />
    </>
  );
}
