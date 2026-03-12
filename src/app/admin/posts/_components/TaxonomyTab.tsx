"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TopicDialog } from "@/app/admin/categories/_components/TopicDialog";
import { TagDialog } from "@/app/admin/categories/_components/TagDialog";
import type { TopicSavedData } from "@/app/admin/categories/actions";
import type { TagSavedData } from "@/app/admin/categories/actions";
import type {
  TopicForForm,
  TagForForm,
  TagGroupItem,
} from "./PostForm";

type PostTopicState = { topicId: string; isVisible: boolean; displayOrder: number };
type PostTagState = { tagId: string; isVisible: boolean; displayOrder: number };
type EffInfo = { hex: string; hex2: string | null; dir: string; stop: number; textHex: string };

function getTagStyle(tag: TagForForm): React.CSSProperties {
  if (tag.effectiveColorHex2) {
    return {
      background: `linear-gradient(${tag.effectiveGradientDir}, ${tag.effectiveColorHex} 0%, ${tag.effectiveColorHex2} ${tag.effectiveGradientStop}%)`,
      color: tag.effectiveTextColorHex,
    };
  }
  return { backgroundColor: tag.effectiveColorHex, color: tag.effectiveTextColorHex };
}

interface Props {
  postTopics: PostTopicState[];
  setPostTopics: React.Dispatch<React.SetStateAction<PostTopicState[]>>;
  postTags: PostTagState[];
  setPostTags: React.Dispatch<React.SetStateAction<PostTagState[]>>;
  allTopics: TopicForForm[];
  allTags: TagForForm[];
  tagGroups: TagGroupItem[];
  topicEffectiveStyleMap: Map<string, React.CSSProperties>;
  topicEffectiveInfoMap: Map<string, EffInfo>;
  tagGroupColorMap: Map<string, TagGroupItem>;
  onTopicAdded: (topic: TopicForForm) => void;
  onTagAdded: (tag: TagForForm) => void;
}

type SubTab = "topics" | "tags";

// FlatTopic: TopicDialog에 필요한 형태
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

export function TaxonomyTab({
  postTopics, setPostTopics,
  postTags, setPostTags,
  allTopics, allTags, tagGroups,
  topicEffectiveStyleMap,
  topicEffectiveInfoMap,
  tagGroupColorMap,
  onTopicAdded,
  onTagAdded,
}: Props) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("topics");
  const [search, setSearch] = useState("");

  // 토픽 다이얼로그
  const [topicDialogOpen, setTopicDialogOpen] = useState(false);

  // 태그 다이얼로그
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [tagDialogGroup, setTagDialogGroup] = useState<string | null>(null);

  const selectedTopicIdSet = useMemo(() => new Set(postTopics.map((pt) => pt.topicId)), [postTopics]);
  const selectedTagIdSet = useMemo(() => new Set(postTags.map((pt) => pt.tagId)), [postTags]);

  // 선택 불가 토픽 (헤더 역할)
  const hasChildrenSet = useMemo(() => {
    const s = new Set<string>();
    allTopics.forEach((t) => { if (t.parentId) s.add(t.parentId); });
    return s;
  }, [allTopics]);

  const nonSelectableTopicIds = useMemo(
    () => new Set(allTopics.filter((t) => t.level === 0 || t.level === 1).map((t) => t.id)),
    [allTopics],
  );

  const toggleTopic = (topicId: string) => {
    if (selectedTopicIdSet.has(topicId)) {
      setPostTopics((prev) => prev.filter((pt) => pt.topicId !== topicId));
    } else {
      setPostTopics((prev) => [...prev, { topicId, isVisible: true, displayOrder: 0 }]);
    }
  };

  const toggleTag = (tagId: string) => {
    if (selectedTagIdSet.has(tagId)) {
      setPostTags((prev) => prev.filter((pt) => pt.tagId !== tagId));
    } else {
      setPostTags((prev) => [...prev, { tagId, isVisible: true, displayOrder: 0 }]);
    }
  };

  // ── 토픽 렌더 ──────────────────────────────────────────────────────────────

  const topicsWithStyle = useMemo(
    () => allTopics.map((t) => ({ ...t, style: topicEffectiveStyleMap.get(t.id) ?? {} })),
    [allTopics, topicEffectiveStyleMap],
  );

  const rootTopics = useMemo(() => topicsWithStyle.filter((t) => t.level === 0), [topicsWithStyle]);

  function getTopicChildren(parentId: string) {
    return topicsWithStyle.filter((t) => t.parentId === parentId);
  }

  const topicSearchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return topicsWithStyle.filter(
      (t) => !nonSelectableTopicIds.has(t.id) &&
        (t.nameKo.toLowerCase().includes(q) || t.nameEn.toLowerCase().includes(q)),
    );
  }, [topicsWithStyle, search, nonSelectableTopicIds]);

  // TopicDialog용 FlatTopic 배열
  const flatTopicsForDialog = useMemo<FlatTopic[]>(
    () => allTopics.map((t) => {
      const eff = topicEffectiveInfoMap.get(t.id);
      return {
        id: t.id,
        nameKo: t.nameKo,
        nameEn: t.nameEn,
        level: t.level,
        parentId: t.parentId,
        effectiveColorHex: eff?.hex ?? "#C8FF09",
        effectiveColorHex2: eff?.hex2 ?? null,
        effectiveGradientDir: eff?.dir ?? "to bottom",
        effectiveGradientStop: eff?.stop ?? 150,
        effectiveTextColorHex: eff?.textHex ?? "#000000",
      };
    }),
    [allTopics, topicEffectiveInfoMap],
  );

  // TagDialog용 groupOptions
  const tagGroupOptions = useMemo(
    () => tagGroups.map((g) => ({ value: g.group, label: g.nameEn || g.group })),
    [tagGroups],
  );

  // 토픽 추가 콜백
  function handleTopicSaved(saved: TopicSavedData) {
    const newTopic: TopicForForm = {
      id: saved.id,
      nameKo: saved.nameKo,
      nameEn: saved.nameEn,
      level: saved.level,
      parentId: saved.parentId,
      colorHex: saved.colorHex,
      colorHex2: saved.colorHex2,
      gradientDir: saved.gradientDir,
      gradientStop: saved.gradientStop,
      textColorHex: saved.textColorHex,
    };
    onTopicAdded(newTopic);
  }

  // 태그 추가 콜백
  function handleTagSaved(saved: TagSavedData) {
    const groupConfig = tagGroupColorMap.get(saved.group);
    const newTag: TagForForm = {
      id: saved.id,
      name: saved.name,
      nameKo: saved.nameKo,
      group: saved.group,
      colorHex: saved.colorHex,
      colorHex2: saved.colorHex2,
      textColorHex: saved.textColorHex,
      effectiveColorHex: saved.colorHex ?? groupConfig?.colorHex ?? "#C8FF09",
      effectiveColorHex2: saved.colorHex2 ?? groupConfig?.colorHex2 ?? null,
      effectiveGradientDir: groupConfig?.gradientDir ?? "to bottom",
      effectiveGradientStop: groupConfig?.gradientStop ?? 150,
      effectiveTextColorHex: saved.textColorHex ?? groupConfig?.textColorHex ?? "#000000",
    };
    onTagAdded(newTag);
    // 자동 선택
    setPostTags((prev) => [...prev, { tagId: saved.id, isVisible: true, displayOrder: 0 }]);
  }

  function renderTopicChip(topic: (typeof topicsWithStyle)[0]) {
    const isSelected = selectedTopicIdSet.has(topic.id);
    return (
      <button
        key={topic.id}
        type="button"
        onClick={() => toggleTopic(topic.id)}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
          isSelected ? "" : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        }`}
        style={isSelected ? topic.style : {}}
      >
        <span>{topic.nameEn}</span>
        <span className="opacity-60 text-[10px]">{topic.nameKo}</span>
      </button>
    );
  }

  function renderTopicSection(root: (typeof topicsWithStyle)[0]) {
    const level1 = getTopicChildren(root.id);
    if (level1.length === 0) return null;
    return (
      <div key={root.id} className="space-y-5">
        <p className="text-sm font-bold">{root.nameEn}</p>
        <div className="space-y-5">
          {level1.map((l1) => {
            const level2 = getTopicChildren(l1.id);
            if (level2.length === 0) {
              return (
                <div key={l1.id} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground pl-1">{l1.nameEn}</p>
                </div>
              );
            }
            const level2WithChildren = level2.filter((l2) => getTopicChildren(l2.id).length > 0);
            return (
              <div key={l1.id} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground pl-1">{l1.nameEn}</p>
                <div className="flex flex-wrap gap-2 pl-2">
                  {level2.map((l2) => renderTopicChip(l2))}
                </div>
                <div className="flex flex-col gap-2">
                  {level2WithChildren.map((l2) => {
                    if (!selectedTopicIdSet.has(l2.id)) return null;
                    const level3 = getTopicChildren(l2.id);
                    return (
                      <div key={l2.id} className="ml-2 rounded-lg border bg-muted/40 px-3 py-2.5 space-y-2">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{l2.nameEn}</p>
                        <div className="flex flex-wrap gap-2">
                          {level3.map((l3) => renderTopicChip(l3))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 태그 렌더 ──────────────────────────────────────────────────────────────

  const tagsByGroup = useMemo(
    () => allTags.reduce<Record<string, TagForForm[]>>((acc, tag) => {
      if (!acc[tag.group]) acc[tag.group] = [];
      acc[tag.group].push(tag);
      return acc;
    }, {}),
    [allTags],
  );

  const orderedTagGroups = tagGroups.length > 0
    ? tagGroups
    : Object.keys(tagsByGroup).map((g) => ({ group: g, nameEn: g }));

  const tagSearchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allTags.filter((t) => t.name.toLowerCase().includes(q) || t.nameKo.toLowerCase().includes(q));
  }, [allTags, search]);

  function renderTagChip(tag: TagForForm) {
    const isSelected = selectedTagIdSet.has(tag.id);
    return (
      <button
        key={tag.id}
        type="button"
        onClick={() => toggleTag(tag.id)}
        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
          isSelected ? "" : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        }`}
        style={isSelected ? getTagStyle(tag) : {}}
      >
        {tag.name}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── 서브탭: 세그먼트 컨트롤 ─────────────────────────────────────────── */}
      <div className="space-y-2 border-b border-border pb-3">
        {/* 세그먼트 컨트롤 행 */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["topics", "tags"] as SubTab[]).map((tab) => {
            const count = tab === "topics" ? postTopics.length : postTags.length;
            const isActive = activeSubTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => { setActiveSubTab(tab); setSearch(""); }}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-900 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {tab === "topics" ? "토픽" : "태그"}
                {count > 0 && (
                  <span className={`ml-1.5 inline-flex items-center justify-center rounded-full min-w-[18px] h-[18px] text-[10px] px-1 font-bold ${
                    isActive ? "bg-brand text-black" : "bg-muted text-foreground"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 검색 + 액션 버튼 행 */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeSubTab === "topics" ? "토픽 검색..." : "태그 검색..."}
              className="pl-8 h-7 text-xs"
            />
          </div>
          {activeSubTab === "topics" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 shrink-0"
                onClick={() => setTopicDialogOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                새 토픽
              </Button>
              <Link
                href="/admin/categories"
                target="_blank"
                className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                관리
                <ExternalLink className="h-3 w-3" />
              </Link>
            </>
          )}
          {activeSubTab === "tags" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 shrink-0"
                onClick={() => { setTagDialogGroup(null); setTagDialogOpen(true); }}
              >
                <Plus className="h-3 w-3 mr-1" />
                새 태그
              </Button>
              <Link
                href="/admin/categories"
                target="_blank"
                className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                관리
                <ExternalLink className="h-3 w-3" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 토픽 목록 */}
      {activeSubTab === "topics" && (
        <div className="space-y-8 pt-2">
          {search ? (
            topicSearchResults.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-4">검색 결과 없음</p>
              : <div className="flex flex-wrap gap-1.5">{topicSearchResults.map((t) => renderTopicChip(t))}</div>
          ) : (
            rootTopics.map((root) => renderTopicSection(root))
          )}
        </div>
      )}

      {/* 태그 목록 */}
      {activeSubTab === "tags" && (
        <div className="space-y-8 pt-2">
          {search ? (
            tagSearchResults.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-4">검색 결과 없음</p>
              : <div className="flex flex-wrap gap-1.5">{tagSearchResults.map((t) => renderTagChip(t))}</div>
          ) : (
            orderedTagGroups.map(({ group, nameEn }) => {
              const tags = tagsByGroup[group] ?? [];
              return (
                <div key={group} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{nameEn || group}</p>
                    <button
                      type="button"
                      onClick={() => { setTagDialogGroup(group); setTagDialogOpen(true); }}
                      className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((t) => renderTagChip(t))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground pl-1">태그 없음</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 토픽 다이얼로그 */}
      <TopicDialog
        open={topicDialogOpen}
        topic={null}
        allTopics={flatTopicsForDialog}
        parentEffectiveColor={null}
        onClose={() => setTopicDialogOpen(false)}
        onSaved={handleTopicSaved}
      />

      {/* 태그 다이얼로그 */}
      <TagDialog
        open={tagDialogOpen}
        tag={null}
        defaultGroup={tagDialogGroup}
        groupOptions={tagGroupOptions}
        onClose={() => setTagDialogOpen(false)}
        onSaved={handleTagSaved}
      />
    </div>
  );
}
