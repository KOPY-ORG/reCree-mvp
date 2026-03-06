"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TopicForForm, TagForForm, TagGroupItem } from "./PostForm";

// ─── 타입 / 헬퍼 ─────────────────────────────────────────────────────────────

type EffectiveColorInfo = {
  hex: string;
  hex2: string | null;
  dir: string;
  stop: number;
  textHex: string;
};

type TopicWithEffective = TopicForForm & EffectiveColorInfo;

function getEffectiveTopicStyle(t: TopicWithEffective): React.CSSProperties {
  if (t.hex2) {
    return {
      background: `linear-gradient(${t.dir}, ${t.hex} 0%, ${t.hex2} ${t.stop}%)`,
      color: t.textHex,
    };
  }
  return { backgroundColor: t.hex, color: t.textHex };
}

function getTagChipStyle(tag: TagForForm): React.CSSProperties {
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTopics: TopicForForm[];
  allTags: TagForForm[];
  tagGroups: TagGroupItem[];
  selectedTopicIds: Set<string>;
  selectedTagIds: Set<string>;
  onConfirm: (topicIds: Set<string>, tagIds: Set<string>) => void;
}

type TabId = "topics" | "tags";

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function LabelSelectDialog({
  open,
  onOpenChange,
  allTopics,
  allTags,
  tagGroups,
  selectedTopicIds,
  selectedTagIds,
  onConfirm,
}: Props) {
  const [localTopics, setLocalTopics] = useState<Set<string>>(
    () => new Set(selectedTopicIds),
  );
  const [localTags, setLocalTags] = useState<Set<string>>(
    () => new Set(selectedTagIds),
  );
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("topics");

  const handleOpenChange = (o: boolean) => {
    if (o) {
      setLocalTopics(new Set(selectedTopicIds));
      setLocalTags(new Set(selectedTagIds));
    } else {
      setSearch("");
    }
    onOpenChange(o);
  };

  const switchTab = (tab: TabId) => {
    setActiveTab(tab);
    setSearch("");
  };

  const handleConfirm = () => {
    onConfirm(localTopics, localTags);
    setSearch("");
    onOpenChange(false);
  };

  const totalSelected = localTopics.size + localTags.size;

  // ─── 토픽 effective color 계산 ───────────────────────────────────────────

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

  // 섹션 헤더로만 쓰이는 토픽 ID 집합
  // — level 0 (K-POP, K-Drama 등) 은 항상 헤더
  // — level 1 중 자식이 있는 것 (Girl Group, Boy Group 등) 도 헤더
  // — level 1 자식 없는 것, level 2+ 는 모두 선택 가능
  const hasChildrenSet = useMemo(() => {
    const s = new Set<string>();
    allTopics.forEach((t) => {
      if (t.parentId) s.add(t.parentId);
    });
    return s;
  }, [allTopics]);

  const nonSelectableTopicIds = useMemo(
    () =>
      new Set(
        allTopics
          .filter(
            (t) => t.level === 0 || (t.level === 1 && hasChildrenSet.has(t.id)),
          )
          .map((t) => t.id),
      ),
    [allTopics, hasChildrenSet],
  );

  // ─── 토픽 렌더 ───────────────────────────────────────────────────────────

  const rootTopics = useMemo(
    () => topicsWithEffective.filter((t) => t.level === 0),
    [topicsWithEffective],
  );

  const topicSearchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return topicsWithEffective.filter(
      (t) =>
        !nonSelectableTopicIds.has(t.id) &&
        (t.nameKo.toLowerCase().includes(q) ||
          t.nameEn.toLowerCase().includes(q)),
    );
  }, [topicsWithEffective, search, nonSelectableTopicIds]);

  function getTopicChildren(parentId: string): TopicWithEffective[] {
    return topicsWithEffective.filter((t) => t.parentId === parentId);
  }

  function renderTopicChip(topic: TopicWithEffective) {
    const isSelected = localTopics.has(topic.id);
    return (
      <button
        key={topic.id}
        type="button"
        onClick={() =>
          setLocalTopics((prev) => {
            const next = new Set(prev);
            if (next.has(topic.id)) next.delete(topic.id);
            else next.add(topic.id);
            return next;
          })
        }
        className={`inline-flex items-center gap-1 rounded-full border-0 px-2.5 py-1 text-xs font-medium transition-all overflow-hidden ${
          isSelected
            ? ""
            : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        }`}
        style={isSelected ? getEffectiveTopicStyle(topic) : {}}
      >
        <span>{topic.nameEn}</span>
        <span className="opacity-60 text-[10px]">{topic.nameKo}</span>
      </button>
    );
  }

  function renderTopicSection(root: TopicWithEffective) {
    const level1 = getTopicChildren(root.id);
    if (level1.length === 0) return null;
    return (
      <div key={root.id} className="space-y-3">
        <h3 className="text-base font-bold text-foreground">{root.nameEn}</h3>
        {level1.map((l1) => {
          const level2 = getTopicChildren(l1.id);
          if (level2.length === 0) {
            return (
              <div key={l1.id} className="pl-2">
                {renderTopicChip(l1)}
              </div>
            );
          }

          const level2WithChildren = level2.filter(
            (l2) => getTopicChildren(l2.id).length > 0,
          );

          return (
            <div key={l1.id} className="space-y-2">
              <p className="text-sm font-medium text-foreground pl-1">
                {l1.nameEn}
              </p>
              {/* 모든 level 2: flex-wrap */}
              <div className="flex flex-wrap gap-1.5 pl-2">
                {level2.map((l2) => renderTopicChip(l2))}
              </div>
              {/* 선택된 level 2 중 자식이 있는 경우: 이름 명시 카드로 멤버 표시 */}
              {level2WithChildren.map((l2) => {
                if (!localTopics.has(l2.id)) return null;
                const level3 = getTopicChildren(l2.id);
                return (
                  <div
                    key={l2.id}
                    className="ml-2 rounded-lg border bg-muted/40 px-3 py-2.5 space-y-2"
                  >
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {l2.nameEn}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {level3.map((l3) => renderTopicChip(l3))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── 태그 렌더 ───────────────────────────────────────────────────────────

  const tagsByGroup = useMemo(
    () =>
      allTags.reduce<Record<string, TagForForm[]>>((acc, tag) => {
        if (!acc[tag.group]) acc[tag.group] = [];
        acc[tag.group].push(tag);
        return acc;
      }, {}),
    [allTags],
  );

  const tagSearchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allTags.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.nameKo.toLowerCase().includes(q),
    );
  }, [allTags, search]);

  const orderedTagGroups =
    tagGroups.length > 0
      ? tagGroups
      : Object.keys(tagsByGroup).map((g) => ({ group: g, nameEn: g }));

  function renderTagChip(tag: TagForForm) {
    const isSelected = localTags.has(tag.id);
    return (
      <button
        key={tag.id}
        type="button"
        onClick={() =>
          setLocalTags((prev) => {
            const next = new Set(prev);
            if (next.has(tag.id)) next.delete(tag.id);
            else next.add(tag.id);
            return next;
          })
        }
        className={`inline-flex items-center gap-1 rounded-full border-0 px-2.5 py-1 text-xs font-medium transition-all overflow-hidden ${
          isSelected
            ? ""
            : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        }`}
        style={isSelected ? getTagChipStyle(tag) : {}}
      >
        <span>{tag.name}</span>
      </button>
    );
  }

  // ─── 선택됨 (공통 하단 영역) ──────────────────────────────────────────────

  // 섹션 헤더(K-POP, Girl Group 등) 제외하고 선택됨 표시
  const selectedTopicsList = useMemo(
    () =>
      topicsWithEffective.filter(
        (t) => localTopics.has(t.id) && !nonSelectableTopicIds.has(t.id),
      ),
    [topicsWithEffective, localTopics, nonSelectableTopicIds],
  );

  const selectedTagsList = useMemo(
    () => allTags.filter((t) => localTags.has(t.id)),
    [allTags, localTags],
  );

  const hasSelected = selectedTopicsList.length > 0 || selectedTagsList.length > 0;

  // ─── 탭 정의 ─────────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "topics", label: "토픽", count: localTopics.size },
    { id: "tags", label: "태그", count: localTags.size },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* 크기 고정: w-[640px] h-[600px] */}
      <DialogContent className="w-[640px] max-w-[640px] h-[600px] flex flex-col gap-0 p-0">
        {/* 헤더 */}
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle>토픽 / 태그 선택</DialogTitle>
        </DialogHeader>

        {/* 탭 바 */}
        <div className="px-6 border-b shrink-0">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-1.5 text-[10px] rounded-full px-1.5 py-0.5 font-medium ${
                      activeTab === tab.id
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 검색창 */}
        <div className="px-6 py-3 border-b shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === "topics"
                  ? "토픽 검색 (한국어/영어)..."
                  : "태그 검색..."
              }
              className="pl-9"
            />
          </div>
        </div>

        {/* 탭 콘텐츠 (스크롤 영역) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {activeTab === "topics" && (
            <div className="space-y-5">
              {search ? (
                topicSearchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    검색 결과가 없습니다.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {topicSearchResults.map((t) => renderTopicChip(t))}
                  </div>
                )
              ) : (
                rootTopics.map((root) => renderTopicSection(root))
              )}
            </div>
          )}

          {activeTab === "tags" && (
            <div className="space-y-5">
              {search ? (
                tagSearchResults.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    검색 결과가 없습니다.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {tagSearchResults.map((t) => renderTagChip(t))}
                  </div>
                )
              ) : (
                orderedTagGroups.map(({ group, nameEn }) => {
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
          )}
        </div>

        {/* 선택됨 — 두 탭 공통 고정 영역 */}
        {hasSelected && (
          <div className="border-t px-6 py-3 shrink-0 max-h-[130px] overflow-y-auto">
            <div className="flex flex-wrap gap-1.5">
              {selectedTopicsList.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={getEffectiveTopicStyle(t)}
                >
                  <span>{t.nameEn}</span>
                  <span className="opacity-60 text-[10px]">{t.nameKo}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalTopics((prev) => {
                        const next = new Set(prev);
                        next.delete(t.id);
                        return next;
                      })
                    }
                    className="opacity-60 hover:opacity-100 ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {selectedTagsList.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={getTagChipStyle(t)}
                >
                  <span>{t.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setLocalTags((prev) => {
                        const next = new Set(prev);
                        next.delete(t.id);
                        return next;
                      })
                    }
                    className="opacity-60 hover:opacity-100 ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div className="border-t px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {totalSelected}개 선택됨
            </span>
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
