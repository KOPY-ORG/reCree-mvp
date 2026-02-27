"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TagForForm } from "./PostForm";

interface TagGroup {
  group: string;
  nameEn: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTags: TagForForm[];
  tagGroups: TagGroup[];
  selectedTagIds: Set<string>;
  onConfirm: (ids: Set<string>) => void;
}

function getTagChipStyle(tag: TagForForm, selected: boolean): React.CSSProperties {
  if (!selected) return {};
  if (tag.effectiveColorHex2) {
    return {
      background: `linear-gradient(${tag.effectiveGradientDir}, ${tag.effectiveColorHex} 0%, ${tag.effectiveColorHex2} ${tag.effectiveGradientStop}%)`,
      color: tag.effectiveTextColorHex,
    };
  }
  return {
    backgroundColor: tag.effectiveColorHex,
    color: tag.effectiveTextColorHex,
  };
}

export function TagSelectDialog({
  open,
  onOpenChange,
  allTags,
  tagGroups,
  selectedTagIds,
  onConfirm,
}: Props) {
  const [localSelected, setLocalSelected] = useState<Set<string>>(
    () => new Set(selectedTagIds),
  );
  const [search, setSearch] = useState("");

  const handleOpenChange = (o: boolean) => {
    if (o) setLocalSelected(new Set(selectedTagIds));
    else setSearch("");
    onOpenChange(o);
  };

  const toggleTag = (id: string) => {
    setLocalSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(localSelected);
    setSearch("");
    onOpenChange(false);
  };

  const tagsByGroup = useMemo(
    () =>
      allTags.reduce<Record<string, TagForForm[]>>((acc, tag) => {
        if (!acc[tag.group]) acc[tag.group] = [];
        acc[tag.group].push(tag);
        return acc;
      }, {}),
    [allTags],
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allTags.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.nameKo.toLowerCase().includes(q),
    );
  }, [allTags, search]);

  function renderTagChip(tag: TagForForm) {
    const isSelected = localSelected.has(tag.id);
    return (
      <button
        key={tag.id}
        type="button"
        onClick={() => toggleTag(tag.id)}
        className={`inline-flex items-center gap-1 rounded-full border-0 px-2.5 py-1 text-xs font-medium transition-all overflow-hidden ${
          isSelected
            ? ""
            : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        }`}
        style={isSelected ? { ...getTagChipStyle(tag, isSelected), boxShadow: "0 0 0 2px rgba(0,0,0,0.2)" } : {}}
      >
        <span>{tag.name}</span>
      </button>
    );
  }

  const orderedGroups = tagGroups.length > 0
    ? tagGroups
    : Object.keys(tagsByGroup).map((g) => ({ group: g, nameEn: g }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>태그 선택</DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="태그 검색..."
              className="pl-9"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {search ? (
            searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                검색 결과가 없습니다.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {searchResults.map((t) => renderTagChip(t))}
              </div>
            )
          ) : (
            orderedGroups.map(({ group, nameEn }) => {
              const tags = tagsByGroup[group];
              if (!tags || tags.length === 0) return null;
              return (
                <div key={group} className="space-y-2">
                  <h3 className="text-base font-bold text-foreground">
                    {nameEn || group}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => renderTagChip(t))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{localSelected.size}개 선택됨</span>
            <Link
              href="/admin/categories"
              target="_blank"
              className="text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              분류 관리 →
            </Link>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="rounded-md border px-4 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-md bg-foreground px-4 py-1.5 text-sm text-background hover:bg-foreground/90 transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
