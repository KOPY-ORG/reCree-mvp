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
import type { TopicForForm } from "./PostForm";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTopics: TopicForForm[];
  selectedTopicIds: Set<string>;
  onConfirm: (ids: Set<string>) => void;
}

type EffectiveColorInfo = {
  hex: string;
  hex2: string | null;
  dir: string;
  stop: number;
  textHex: string;
};

type TopicWithEffective = TopicForForm & EffectiveColorInfo;

function getEffectiveChipStyle(t: TopicWithEffective): React.CSSProperties {
  if (t.hex2) {
    return {
      background: `linear-gradient(${t.dir}, ${t.hex} 0%, ${t.hex2} ${t.stop}%)`,
      color: t.textHex,
    };
  }
  return { backgroundColor: t.hex, color: t.textHex };
}

export function TopicSelectDialog({
  open,
  onOpenChange,
  allTopics,
  selectedTopicIds,
  onConfirm,
}: Props) {
  const [localSelected, setLocalSelected] = useState<Set<string>>(
    () => new Set(selectedTopicIds),
  );
  const [search, setSearch] = useState("");

  // effective color 계산 (부모 색상 상속)
  const topicsWithEffective = useMemo<TopicWithEffective[]>(() => {
    const DEFAULT_COLOR = "#C6FD09";
    const DEFAULT_TEXT = "#000000";
    const effectiveMap = new Map<string, EffectiveColorInfo>();

    return allTopics.map((t) => {
      const parent = t.parentId ? effectiveMap.get(t.parentId) : undefined;
      const inherits = t.colorHex === null;

      const hex = t.colorHex ?? parent?.hex ?? DEFAULT_COLOR;
      const hex2 = inherits ? (parent?.hex2 ?? null) : t.colorHex2;
      const dir = inherits ? (parent?.dir ?? "to bottom") : t.gradientDir;
      const stop = inherits ? (parent?.stop ?? 150) : t.gradientStop;
      const textHex = t.textColorHex ?? parent?.textHex ?? DEFAULT_TEXT;

      effectiveMap.set(t.id, { hex, hex2, dir, stop, textHex });
      return { ...t, hex, hex2, dir, stop, textHex };
    });
  }, [allTopics]);

  // 다이얼로그가 열릴 때 외부 상태 동기화
  const handleOpenChange = (o: boolean) => {
    if (o) setLocalSelected(new Set(selectedTopicIds));
    else setSearch("");
    onOpenChange(o);
  };

  const toggleTopic = (id: string) => {
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

  // level 0 토픽들 (카테고리)
  const rootTopics = useMemo(
    () => topicsWithEffective.filter((t) => t.level === 0),
    [topicsWithEffective],
  );

  // 검색 결과 (nameKo + nameEn)
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return topicsWithEffective.filter(
      (t) =>
        t.nameKo.toLowerCase().includes(q) ||
        t.nameEn.toLowerCase().includes(q),
    );
  }, [topicsWithEffective, search]);

  // 카테고리별 자식 토픽 (level >= 1)
  function getChildren(parentId: string): TopicWithEffective[] {
    return topicsWithEffective.filter((t) => t.parentId === parentId);
  }

  function renderTopicChip(topic: TopicWithEffective) {
    const isSelected = localSelected.has(topic.id);
    return (
      <button
        key={topic.id}
        type="button"
        onClick={() => toggleTopic(topic.id)}
        className={`inline-flex items-center gap-1 rounded-full border-0 px-2.5 py-1 text-xs font-medium transition-all overflow-hidden ${
          isSelected ? "" : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        }`}
        style={isSelected ? getEffectiveChipStyle(topic) : {}}
      >
        <span>{topic.nameEn}</span>
        <span className="opacity-60 text-[10px]">{topic.nameKo}</span>
      </button>
    );
  }

  function renderSection(root: TopicForForm) {
    const level1 = getChildren(root.id);
    if (level1.length === 0) return null;

    return (
      <div key={root.id} className="space-y-3">
        <h3 className="text-base font-bold text-foreground">
          {root.nameEn}
        </h3>
        {level1.map((l1) => {
          const level2 = getChildren(l1.id);
          return (
            <div key={l1.id} className="space-y-1.5">
              <p className="text-sm font-medium text-foreground pl-1">{l1.nameEn}</p>
              {level2.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pl-2">
                  {level2.map((t) => renderTopicChip(t))}
                </div>
              ) : (
                <div className="pl-2">{renderTopicChip(l1)}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>토픽 선택</DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="토픽 검색 (한국어/영어)..."
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
                {searchResults.map((t) => renderTopicChip(t))}
              </div>
            )
          ) : (
            rootTopics.map((root) => renderSection(root))
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
