"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  X,
  Upload,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  MapPin,
  Phone,
  ExternalLink,
  Languages,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { PostStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  checkPostSlug,
  type PostFormData,
  type PostSourceInput,
  type SpotInsightData,
} from "../_actions/post-actions";
import { translateFields } from "../_actions/draft-actions";
import { PlacePickerSheet } from "./PlacePickerSheet";
import { PlaceDetailSheet } from "./PlaceDetailSheet";
import { LabelSelectDialog } from "./LabelSelectDialog";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// 마크다운 에디터: SSR 불가 → 동적 임포트
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

// commands는 순수 객체 → 정적 import 가능 (SSR 문제 없음)
import {
  bold,
  italic,
  strikethrough,
  link,
  quote,
  code,
  codeBlock,
  unorderedListCommand,
  orderedListCommand,
  divider,
  type ICommand,
} from "@uiw/react-md-editor/commands";
// MapPreview: SSR 불가 → 동적 임포트
const MapPreview = dynamic(
  () => import("@/components/maps/MapPreview").then((m) => m.MapPreview),
  { ssr: false, loading: () => <div className="h-40 rounded-lg border bg-muted/50" /> },
);

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export type TagForForm = {
  id: string;
  name: string;
  nameKo: string;
  group: string;
  colorHex: string | null;
  colorHex2: string | null;
  textColorHex: string | null;
  effectiveColorHex: string;
  effectiveColorHex2: string | null;
  effectiveGradientDir: string;
  effectiveGradientStop: number;
  effectiveTextColorHex: string;
};

export type TopicForForm = {
  id: string;
  nameKo: string;
  nameEn: string;
  level: number;
  parentId: string | null;
  colorHex: string | null;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string | null;
};

export type TagGroupItem = {
  group: string;
  nameEn: string;
};

export type PlaceForForm = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  addressKo: string | null;
  addressEn: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  imageUrl: string | null;
};

export type PostInitialData = {
  id: string;
  titleKo: string;
  titleEn: string;
  slug: string;
  subtitleKo: string | null;
  subtitleEn: string | null;
  bodyKo: string | null;
  bodyEn: string | null;
  thumbnailUrl: string | null;
  status: PostStatus;
  memo: string | null;
  collectedBy: string | null;
  collectedAt: string | null;
  postTopics: { topicId: string; isVisible: boolean; displayOrder: number }[];
  postTags: { tagId: string; isVisible: boolean; displayOrder: number }[];
  postSources: PostSourceInput[];
  legacySourceUrl: string | null;
  legacySourceType: string | null;
  legacySourceNote: string | null;
  postPlaces: {
    placeId: string;
    placeNameKo?: string;
    placeNameEn?: string | null;
    placeAddressKo?: string | null;
    placeAddressEn?: string | null;
    placeLatitude?: number | null;
    placeLongitude?: number | null;
    placePhone?: string | null;
    placeImageUrl?: string | null;
    context: string | null;
    vibe: string[];
    mustTry: string | null;
    tip: string | null;
    insightEn: { context?: string; mustTry?: string; tip?: string } | null;
  }[];
};

interface PostFormProps {
  mode: "create" | "edit";
  postId?: string;
  initialData?: PostInitialData;
  allTags: TagForForm[];
  allTopics: TopicForForm[];
  tagGroups: TagGroupItem[];
}

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const SOURCE_TYPES = [
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "X", label: "X (Twitter)" },
  { value: "REDDIT", label: "Reddit" },
  { value: "BLOG", label: "Blog" },
  { value: "NEWS", label: "News" },
  { value: "OTHER", label: "기타" },
];

const EMPTY_SOURCE: PostSourceInput = {
  sourceType: "",
  sourceUrl: "",
  sourceNote: "",
  sourcePostDate: "",
  referenceUrl: "",
};

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

type TopicStateItem = { topicId: string; isVisible: boolean; displayOrder: number };
type TagStateItem = { tagId: string; isVisible: boolean; displayOrder: number };

// visible 항목들의 displayOrder를 재산정 (topic+tag 통합 순서 유지)
function recalcDisplayOrders(topics: TopicStateItem[], tags: TagStateItem[]): TopicStateItem[] {
  // 현재 visible인 전체 항목을 displayOrder로 정렬 후 재산정
  const allVisible = [
    ...topics.filter((t) => t.isVisible).map((t) => ({ id: `t-${t.topicId}`, order: t.displayOrder })),
    ...tags.filter((t) => t.isVisible).map((t) => ({ id: `g-${t.tagId}`, order: t.displayOrder })),
  ].sort((a, b) => a.order - b.order);

  const newOrderMap = new Map(allVisible.map((item, idx) => [item.id, idx]));
  return topics.map((t) =>
    t.isVisible
      ? { ...t, displayOrder: newOrderMap.get(`t-${t.topicId}`) ?? 0 }
      : { ...t, displayOrder: 0 },
  );
}

function recalcDisplayOrdersTags(topics: TopicStateItem[], tags: TagStateItem[]): TagStateItem[] {
  const allVisible = [
    ...topics.filter((t) => t.isVisible).map((t) => ({ id: `t-${t.topicId}`, order: t.displayOrder })),
    ...tags.filter((t) => t.isVisible).map((t) => ({ id: `g-${t.tagId}`, order: t.displayOrder })),
  ].sort((a, b) => a.order - b.order);

  const newOrderMap = new Map(allVisible.map((item, idx) => [item.id, idx]));
  return tags.map((t) =>
    t.isVisible
      ? { ...t, displayOrder: newOrderMap.get(`g-${t.tagId}`) ?? 0 }
      : { ...t, displayOrder: 0 },
  );
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── 색상 헬퍼 ────────────────────────────────────────────────────────────────

function getTopicStyle(topic: TopicForForm): React.CSSProperties {
  if (topic.colorHex2) {
    return {
      background: `linear-gradient(${topic.gradientDir}, ${topic.colorHex} 0%, ${topic.colorHex2} ${topic.gradientStop}%)`,
      color: topic.textColorHex ?? "#000",
    };
  }
  if (topic.colorHex) {
    return { backgroundColor: topic.colorHex, color: topic.textColorHex ?? "#000" };
  }
  return { backgroundColor: "#e2e8f0", color: "#374151" };
}

function getTagStyle(tag: TagForForm): React.CSSProperties {
  if (tag.effectiveColorHex2) {
    return {
      background: `linear-gradient(${tag.effectiveGradientDir}, ${tag.effectiveColorHex} 0%, ${tag.effectiveColorHex2} ${tag.effectiveGradientStop}%)`,
      color: tag.effectiveTextColorHex,
    };
  }
  return { backgroundColor: tag.effectiveColorHex, color: tag.effectiveTextColorHex };
}

// ─── SortableLabel (DnD용 항목) ───────────────────────────────────────────────

type LabelItem = {
  id: string;
  type: "topic" | "tag";
  label: string;
  style: React.CSSProperties;
};

function SortableLabel({ item }: { item: LabelItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-background px-2 py-1"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground hover:text-foreground shrink-0"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border-transparent"
        style={item.style}
      >
        {item.label}
      </span>
    </div>
  );
}

// ─── Story 에디터 툴바 설정 ─────────────────────────────────────────────────────
const STORY_COMMANDS: ICommand[] = [
  bold, italic, strikethrough,
  divider,
  link, quote, code, codeBlock,
  divider,
  unorderedListCommand, orderedListCommand,
];
const STORY_EXTRA_COMMANDS: ICommand[] = [];

// ─── PostForm 컴포넌트 ──────────────────────────────────────────────────────────

export function PostForm({
  mode,
  postId,
  initialData,
  allTags,
  allTopics,
  tagGroups,
}: PostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = mode === "edit";

  // ── 초기 장소 정보 ──────────────────────────────────────────────────────────
  const initPlace = initialData?.postPlaces?.[0] ?? null;
  const initPlaceObj: PlaceForForm | null = initPlace
    ? {
        id: initPlace.placeId,
        nameKo: initPlace.placeNameKo ?? "",
        nameEn: initPlace.placeNameEn ?? null,
        addressKo: initPlace.placeAddressKo ?? null,
        addressEn: initPlace.placeAddressEn ?? null,
        latitude: initPlace.placeLatitude ?? null,
        longitude: initPlace.placeLongitude ?? null,
        phone: initPlace.placePhone ?? null,
        imageUrl: initPlace.placeImageUrl ?? null,
      }
    : null;

  // ── 초기 출처 목록 (postSources 없으면 레거시 단일 출처 사용) ───────────────
  const initSources: PostSourceInput[] = (() => {
    if (initialData?.postSources && initialData.postSources.length > 0) {
      return initialData.postSources;
    }
    // 레거시 필드에서 마이그레이션
    if (initialData?.legacySourceUrl) {
      return [
        {
          sourceType: initialData.legacySourceType ?? "",
          sourceUrl: initialData.legacySourceUrl,
          sourceNote: initialData.legacySourceNote ?? "",
          sourcePostDate: "",
          referenceUrl: "",
        },
      ];
    }
    return [];
  })();

  // ── 기본 폼 상태 ────────────────────────────────────────────────────────────
  const [titleKo, setTitleKo] = useState(initialData?.titleKo ?? "");
  const [titleEn, setTitleEn] = useState(initialData?.titleEn ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [subtitleKo, setSubtitleKo] = useState(initialData?.subtitleKo ?? "");
  const [subtitleEn, setSubtitleEn] = useState(initialData?.subtitleEn ?? "");
  const [bodyKo, setBodyKo] = useState(initialData?.bodyKo ?? "");
  const [bodyEn, setBodyEn] = useState(initialData?.bodyEn ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(
    initialData?.thumbnailUrl ?? "",
  );
  const [status, setStatus] = useState<PostStatus>(
    initialData?.status ?? "DRAFT",
  );
  const [memo, setMemo] = useState(initialData?.memo ?? "");
  const [collectedBy, setCollectedBy] = useState(initialData?.collectedBy ?? "");
  const [collectedAt, setCollectedAt] = useState(initialData?.collectedAt ?? "");
  const [sources, setSources] = useState<PostSourceInput[]>(initSources);

  type PostTopicState = { topicId: string; isVisible: boolean; displayOrder: number };
  type PostTagState = { tagId: string; isVisible: boolean; displayOrder: number };

  const [postTopics, setPostTopics] = useState<PostTopicState[]>(
    initialData?.postTopics ?? [],
  );
  const [postTags, setPostTags] = useState<PostTagState[]>(
    initialData?.postTags ?? [],
  );
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);

  // ── 장소 상태 ───────────────────────────────────────────────────────────────
  const [selectedPlace, setSelectedPlace] = useState<PlaceForForm | null>(
    initPlaceObj,
  );

  // ── Spot Insight 상태 ───────────────────────────────────────────────────────
  const [contextKo, setContextKo] = useState(initPlace?.context ?? "");
  const [contextEn, setContextEn] = useState(
    initPlace?.insightEn?.context ?? "",
  );
  const [mustTryKo, setMustTryKo] = useState(initPlace?.mustTry ?? "");
  const [mustTryEn, setMustTryEn] = useState(
    initPlace?.insightEn?.mustTry ?? "",
  );
  const [tipKo, setTipKo] = useState(initPlace?.tip ?? "");
  const [tipEn, setTipEn] = useState(initPlace?.insightEn?.tip ?? "");
  const [vibe, setVibe] = useState<string[]>(initPlace?.vibe ?? []);
  const [vibeInput, setVibeInput] = useState("");

  // ── UI 상태 ─────────────────────────────────────────────────────────────────
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "ok" | "error"
  >("idle");
  const [slugManual, setSlugManual] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const [placeDetailOpen, setPlaceDetailOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [enSectionOpen, setEnSectionOpen] = useState<{
    basic: boolean;
    insight: boolean;
    body: boolean;
  }>({ basic: false, insight: false, body: false });

  // ── 파생값 ─────────────────────────────────────────────────────────────────
  const topicMap = useMemo(
    () => new Map(allTopics.map((t) => [t.id, t])),
    [allTopics],
  );
  const tagMap = useMemo(
    () => new Map(allTags.map((t) => [t.id, t])),
    [allTags],
  );

  // 토픽 effective color 계산 (부모 색상 상속)
  const topicEffectiveStyleMap = useMemo(() => {
    const DEFAULT_COLOR = "#C6FD09";
    const DEFAULT_TEXT = "#000000";
    type EffInfo = { hex: string; hex2: string | null; dir: string; stop: number; textHex: string };
    const effectiveMap = new Map<string, EffInfo>();
    const styleMap = new Map<string, React.CSSProperties>();
    for (const t of allTopics) {
      const parent = t.parentId ? effectiveMap.get(t.parentId) : undefined;
      const inherits = t.colorHex === null;
      const hex = t.colorHex ?? parent?.hex ?? DEFAULT_COLOR;
      const hex2 = inherits ? (parent?.hex2 ?? null) : t.colorHex2;
      const dir = inherits ? (parent?.dir ?? "to bottom") : t.gradientDir;
      const stop = inherits ? (parent?.stop ?? 150) : t.gradientStop;
      const textHex = t.textColorHex ?? parent?.textHex ?? DEFAULT_TEXT;
      effectiveMap.set(t.id, { hex, hex2, dir, stop, textHex });
      styleMap.set(
        t.id,
        hex2
          ? { background: `linear-gradient(${dir}, ${hex} 0%, ${hex2} ${stop}%)`, color: textHex }
          : { backgroundColor: hex, color: textHex },
      );
    }
    return styleMap;
  }, [allTopics]);

  const selectedTopicIdSet = useMemo(
    () => new Set(postTopics.map((pt) => pt.topicId)),
    [postTopics],
  );
  const selectedTagIdSet = useMemo(
    () => new Set(postTags.map((pt) => pt.tagId)),
    [postTags],
  );

  // DnD sensors
  const sensors = useSensors(useSensor(PointerSensor));

  // visible 라벨 (topic + tag 통합, displayOrder 정렬)
  const visibleItems = useMemo(() => {
    const topicItems = postTopics
      .filter((pt) => pt.isVisible)
      .map((pt) => {
        const t = topicMap.get(pt.topicId);
        return {
          id: `topic-${pt.topicId}`,
          type: "topic" as const,
          topicId: pt.topicId,
          tagId: undefined as string | undefined,
          displayOrder: pt.displayOrder,
          label: t?.nameEn ?? pt.topicId,
          style: topicEffectiveStyleMap.get(pt.topicId) ?? {},
        };
      });
    const tagItems = postTags
      .filter((pt) => pt.isVisible)
      .map((pt) => {
        const t = tagMap.get(pt.tagId);
        return {
          id: `tag-${pt.tagId}`,
          type: "tag" as const,
          topicId: undefined as string | undefined,
          tagId: pt.tagId,
          displayOrder: pt.displayOrder,
          label: t?.name ?? pt.tagId,
          style: t ? getTagStyle(t) : {},
        };
      });
    return [...topicItems, ...tagItems].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [postTopics, postTags, topicMap, tagMap]);

  // ── Slug 자동 생성 + 중복 체크 ─────────────────────────────────────────────
  useEffect(() => {
    if (slugManual) return;
    if (!titleEn.trim()) return;
    setSlug(generateSlug(titleEn));
  }, [titleEn, slugManual]);

  const slugCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!slug.trim()) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current);
    slugCheckTimerRef.current = setTimeout(async () => {
      const { available } = await checkPostSlug(
        slug,
        isEdit ? postId : undefined,
      );
      setSlugStatus(available ? "ok" : "error");
    }, 400);
    return () => {
      if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current);
    };
  }, [slug, isEdit, postId]);

  // ── 썸네일 업로드 ──────────────────────────────────────────────────────────
  const handleThumbnailUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbnailUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("post-images")
        .upload(fileName, file, { upsert: false });

      if (error) {
        toast.error(`이미지 업로드 실패: ${error.message}`);
        return;
      }

      const { data } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      setThumbnailUrl(data.publicUrl);
      toast.success("썸네일이 업로드되었습니다.");
    } catch {
      toast.error("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setThumbnailUploading(false);
    }
  };

  // ── 핸들러 ─────────────────────────────────────────────────────────────────

  // 라벨 다이얼로그 confirm
  const handleLabelConfirm = (topicIds: Set<string>, tagIds: Set<string>) => {
    setPostTopics((prev) => {
      const existingMap = new Map(prev.map((pt) => [pt.topicId, pt]));
      const result: typeof prev = [];
      topicIds.forEach((topicId) => {
        if (existingMap.has(topicId)) {
          result.push(existingMap.get(topicId)!);
        } else {
          result.push({ topicId, isVisible: false, displayOrder: 0 });
        }
      });
      return result;
    });
    setPostTags((prev) => {
      const existingMap = new Map(prev.map((pt) => [pt.tagId, pt]));
      const result: typeof prev = [];
      tagIds.forEach((tagId) => {
        if (existingMap.has(tagId)) {
          result.push(existingMap.get(tagId)!);
        } else {
          result.push({ tagId, isVisible: false, displayOrder: 0 });
        }
      });
      return result;
    });
  };

  // 토픽 제거 (X 버튼)
  const removeTopic = (topicId: string) => {
    setPostTopics((prev) => prev.filter((pt) => pt.topicId !== topicId));
  };

  // 태그 제거 (X 버튼)
  const removeTag = (tagId: string) => {
    setPostTags((prev) => prev.filter((pt) => pt.tagId !== tagId));
  };

  // visible 토글
  const toggleTopicVisible = (topicId: string) => {
    setPostTopics((prev) => {
      const updated = prev.map((pt) =>
        pt.topicId === topicId ? { ...pt, isVisible: !pt.isVisible } : pt,
      );
      return recalcDisplayOrders(updated, postTags);
    });
  };

  const toggleTagVisible = (tagId: string) => {
    setPostTags((prev) => {
      const updated = prev.map((pt) =>
        pt.tagId === tagId ? { ...pt, isVisible: !pt.isVisible } : pt,
      );
      return recalcDisplayOrdersTags(postTopics, updated);
    });
  };

  // DnD 종료 시 순서 변경
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = visibleItems.findIndex((item) => item.id === active.id);
    const newIndex = visibleItems.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(visibleItems, oldIndex, newIndex);
    // displayOrder 재산정
    reordered.forEach((item, idx) => {
      if (item.type === "topic" && item.topicId) {
        setPostTopics((prev) =>
          prev.map((pt) =>
            pt.topicId === item.topicId ? { ...pt, displayOrder: idx } : pt,
          ),
        );
      } else if (item.type === "tag" && item.tagId) {
        setPostTags((prev) =>
          prev.map((pt) =>
            pt.tagId === item.tagId ? { ...pt, displayOrder: idx } : pt,
          ),
        );
      }
    });
  };

  const addVibe = () => {
    if (!vibeInput.trim()) return;
    setVibe((prev) => [...prev, vibeInput.trim()]);
    setVibeInput("");
  };

  const removeVibe = (i: number) => {
    setVibe((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── 번역 핸들러 ─────────────────────────────────────────────────────────────

  async function handleTranslateAll() {
    setIsTranslating(true);
    const { data, error } = await translateFields({
      titleKo, subtitleKo,
      contextKo, mustTryKo, tipKo,
      bodyKo,
    });
    if (error) {
      toast.error(error);
    } else if (data) {
      if (data.titleKo) setTitleEn(data.titleKo);
      if (data.subtitleKo) setSubtitleEn(data.subtitleKo);
      if (data.contextKo) setContextEn(data.contextKo);
      if (data.mustTryKo) setMustTryEn(data.mustTryKo);
      if (data.tipKo) setTipEn(data.tipKo);
      if (data.bodyKo) setBodyEn(data.bodyKo);
      setEnSectionOpen({ basic: true, insight: true, body: true });
      toast.success("전체 번역 완료. 영어 내용을 검토해주세요.");
    }
    setIsTranslating(false);
  }

  // ── 출처 핸들러 ─────────────────────────────────────────────────────────────
  const addSource = () => setSources((prev) => [...prev, { ...EMPTY_SOURCE }]);
  const removeSource = (i: number) =>
    setSources((prev) => prev.filter((_, idx) => idx !== i));
  const updateSource = (i: number, field: keyof PostSourceInput, value: string) =>
    setSources((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    );

  // ── 제출 ───────────────────────────────────────────────────────────────────
  const isImportedState = status === "IMPORTED" || status === "AI_DRAFTED";

  const handleSubmit = (targetStatus?: PostStatus) => {
    const finalStatus = targetStatus ?? status;

    if (!isImportedState) {
      if (!titleKo.trim()) {
        toast.error("한국어 제목을 입력해주세요.");
        return;
      }
      if (!titleEn.trim()) {
        toast.error("영어 제목을 입력해주세요.");
        return;
      }
      if (!slug.trim()) {
        toast.error("슬러그를 입력해주세요.");
        return;
      }
    }
    if (slugStatus === "error") {
      toast.error("슬러그가 이미 사용 중입니다.");
      return;
    }

    if (finalStatus === "PUBLISHED") {
      const missing: string[] = [];
      if (!titleKo.trim()) missing.push("한국어 제목");
      if (!titleEn.trim()) missing.push("영어 제목");
      if (postTopics.length === 0) missing.push("토픽 1개 이상");
      if (!thumbnailUrl.trim()) missing.push("썸네일 이미지");
      if (missing.length > 0) {
        toast.error(`발행 불가: ${missing.join(", ")} 필요`);
        return;
      }
    }

    const hasInsight =
      contextKo || contextEn || vibe.length > 0 || mustTryKo || mustTryEn || tipKo || tipEn;

    const spotInsight: SpotInsightData | null = hasInsight
      ? { contextKo, contextEn, vibe, mustTryKo, mustTryEn, tipKo, tipEn }
      : null;

    const data: PostFormData = {
      titleKo: titleKo.trim(),
      titleEn: titleEn.trim(),
      slug: slug.trim(),
      subtitleKo: subtitleKo.trim(),
      subtitleEn: subtitleEn.trim(),
      bodyKo: bodyKo.trim(),
      bodyEn: bodyEn.trim(),
      thumbnailUrl: thumbnailUrl.trim(),
      status: finalStatus,
      memo: memo.trim(),
      collectedBy: collectedBy.trim(),
      collectedAt: collectedAt.trim(),
      sources: sources.filter((s) => s.sourceUrl || s.sourceNote),
      topics: postTopics,
      tags: postTags,
      placeId: selectedPlace?.id ?? null,
      spotInsight,
    };

    startTransition(async () => {
      let result: { error?: string };
      if (isEdit && postId) {
        const { updatePost } = await import("../_actions/post-actions");
        result = await updatePost(postId, data);
      } else {
        const { createPost } = await import("../_actions/post-actions");
        const res = await createPost(data);
        result = res;
      }

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(isEdit ? "포스트가 수정되었습니다." : "포스트가 저장되었습니다.");
        router.push("/admin/posts");
      }
    });
  };

  // ── 렌더 ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-full flex-col">
      {/* ── Sticky 상단 액션바 ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 shrink-0 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/posts"
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-base font-semibold">
              {isEdit ? "포스트 수정" : "포스트 작성"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {status === "IMPORTED" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                가져옴
              </span>
            )}
            {status === "AI_DRAFTED" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                AI 초안 완료
              </span>
            )}

            {isEdit && slug ? (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/posts/${slug}?preview=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  미리보기
                </a>
              </Button>
            ) : !isEdit && slug ? (
              <Button variant="outline" size="sm" disabled title="저장 후 미리보기 가능">
                <Eye className="h-3.5 w-3.5 mr-1" />
                미리보기
              </Button>
            ) : null}

            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/posts">취소</Link>
            </Button>

            {isEdit && status === "AI_DRAFTED" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleSubmit("DRAFT")}
              >
                편집 시작 (DRAFT로)
              </Button>
            )}

            {isEdit && status === "PUBLISHED" && (
              <Button
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleSubmit("DRAFT")}
              >
                임시저장으로 변경
              </Button>
            )}

            <Button
              size="sm"
              disabled={isPending || slugStatus === "error"}
              onClick={() => {
                if (status === "PUBLISHED") handleSubmit("PUBLISHED");
                else if (isImportedState) handleSubmit(status);
                else handleSubmit("DRAFT");
              }}
            >
              {isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              저장
            </Button>

            {status !== "PUBLISHED" && !isImportedState && (
              <Button
                size="sm"
                variant="default"
                className="bg-brand text-black hover:bg-brand/90"
                disabled={isPending || slugStatus === "error"}
                onClick={() => handleSubmit("PUBLISHED")}
              >
                발행
              </Button>
            )}
            {isImportedState && (
              <Button
                size="sm"
                variant="default"
                className="bg-brand text-black hover:bg-brand/90 opacity-50 cursor-not-allowed"
                disabled
                title="편집을 완료한 후 발행할 수 있습니다."
              >
                발행
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 본문 ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-[1fr_380px] gap-6 items-start">

            {/* ─── 왼쪽 메인 ─────────────────────────────────────────────── */}
            <div className="space-y-6 min-w-0">

              {/* ── 섹션 1: 제목 + 썸네일 ──────────────────────────────────── */}
              <Card className="gap-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-foreground">
                    기본 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 썸네일 */}
                  <div className="space-y-2">
                    <Label>썸네일 이미지</Label>
                    {thumbnailUrl ? (
                      <div className="flex items-start gap-3">
                        <div className="relative h-24 w-40 rounded-md overflow-hidden border">
                          <Image
                            src={thumbnailUrl}
                            alt="썸네일"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setThumbnailUrl("")}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          제거
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-6 cursor-pointer hover:bg-muted/30 transition-colors">
                        {thumbnailUploading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              클릭하여 이미지 업로드
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={thumbnailUploading}
                          onChange={handleThumbnailUpload}
                        />
                      </label>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-1.5">
                    <Label htmlFor="titleKo">
                      한국어 제목 <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="titleKo"
                      value={titleKo}
                      onChange={(e) => setTitleKo(e.target.value)}
                      placeholder="예: BTS 정국이 자주 찾던 홍대 카페"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="subtitleKo">한국어 부제목</Label>
                    <Input
                      id="subtitleKo"
                      value={subtitleKo}
                      onChange={(e) => setSubtitleKo(e.target.value)}
                      placeholder="짧은 소개 문구"
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-1.5">
                    <Label htmlFor="slug">
                      슬러그 <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="slug"
                        value={slug}
                        onChange={(e) => {
                          setSlugManual(true);
                          setSlug(e.target.value);
                        }}
                        placeholder="url-friendly-slug"
                        className={
                          slugStatus === "error"
                            ? "border-destructive"
                            : slugStatus === "ok"
                              ? "border-green-500"
                              : ""
                        }
                      />
                      {slugStatus === "checking" && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      )}
                      {slugStatus === "ok" && (
                        <span className="text-xs text-green-600 shrink-0">사용 가능</span>
                      )}
                      {slugStatus === "error" && (
                        <span className="text-xs text-destructive shrink-0">이미 사용 중</span>
                      )}
                    </div>
                    {slugManual && (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() => {
                          setSlugManual(false);
                          setSlug(generateSlug(titleEn));
                        }}
                      >
                        자동 생성으로 되돌리기
                      </button>
                    )}
                  </div>

                  {/* EN 섹션 토글 */}
                  <div className="pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setEnSectionOpen((p) => ({ ...p, basic: !p.basic }))}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full"
                    >
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", enSectionOpen.basic && "rotate-180")} />
                      영어 번역 검토
                      {(titleEn || subtitleEn) && (
                        <span className="ml-auto text-green-600 text-[10px]">번역됨</span>
                      )}
                    </button>
                    {enSectionOpen.basic && (
                      <div className="mt-3 space-y-3 pl-1">
                        <div className="space-y-1.5">
                          <Label htmlFor="titleEn" className="text-xs text-muted-foreground">
                            영어 제목 <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="titleEn"
                            value={titleEn}
                            onChange={(e) => setTitleEn(e.target.value)}
                            placeholder="예: Jungkook's Favorite Café in Hongdae"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="subtitleEn" className="text-xs text-muted-foreground">영어 부제목</Label>
                          <Input
                            id="subtitleEn"
                            value={subtitleEn}
                            onChange={(e) => setSubtitleEn(e.target.value)}
                            placeholder="Short description"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── 섹션 2: Spot Insight (항상 표시) ──────────────────────── */}
              <Card className="gap-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-foreground">
                    Spot Insight
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contextKo">Context (한국어)</Label>
                    <Textarea
                      id="contextKo"
                      value={contextKo}
                      onChange={(e) => setContextKo(e.target.value)}
                      rows={3}
                      placeholder="이 장소에 대한 소개 (한국어)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="mustTryKo">Must-try (한국어)</Label>
                    <Textarea
                      id="mustTryKo"
                      value={mustTryKo}
                      onChange={(e) => setMustTryKo(e.target.value)}
                      rows={2}
                      placeholder="꼭 먹어봐야 할 것, 경험해야 할 것"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tipKo">Tip (한국어)</Label>
                    <Textarea
                      id="tipKo"
                      value={tipKo}
                      onChange={(e) => setTipKo(e.target.value)}
                      rows={2}
                      placeholder="방문 팁"
                    />
                  </div>

                  {/* Vibe */}
                  <div className="space-y-1.5">
                    <Label>Vibe</Label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {vibe.map((v, i) => (
                        <Badge key={i} variant="secondary" className="gap-1 pr-1">
                          {v}
                          <button
                            type="button"
                            onClick={() => removeVibe(i)}
                            className="ml-0.5 opacity-60 hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={vibeInput}
                        onChange={(e) => setVibeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addVibe();
                          }
                        }}
                        placeholder="예: Local, Warm, Cozy..."
                        className="max-w-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addVibe}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* EN 섹션 토글 */}
                  <div className="pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setEnSectionOpen((p) => ({ ...p, insight: !p.insight }))}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full"
                    >
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", enSectionOpen.insight && "rotate-180")} />
                      영어 번역 검토
                      {(contextEn || mustTryEn || tipEn) && (
                        <span className="ml-auto text-green-600 text-[10px]">번역됨</span>
                      )}
                    </button>
                    {enSectionOpen.insight && (
                      <div className="mt-3 space-y-3 pl-1">
                        <div className="space-y-1.5">
                          <Label htmlFor="contextEn" className="text-xs text-muted-foreground">Context (English)</Label>
                          <Textarea
                            id="contextEn"
                            value={contextEn}
                            onChange={(e) => setContextEn(e.target.value)}
                            rows={3}
                            placeholder="Introduction about this place (English)"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="mustTryEn" className="text-xs text-muted-foreground">Must-try (English)</Label>
                          <Textarea
                            id="mustTryEn"
                            value={mustTryEn}
                            onChange={(e) => setMustTryEn(e.target.value)}
                            rows={2}
                            placeholder="What you must try here"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="tipEn" className="text-xs text-muted-foreground">Tip (English)</Label>
                          <Textarea
                            id="tipEn"
                            value={tipEn}
                            onChange={(e) => setTipEn(e.target.value)}
                            rows={2}
                            placeholder="Visiting tips"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── 섹션 3: Story (본문) ────────────────────────────────────── */}
              <Card className="gap-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-foreground">
                    Story
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4" data-color-mode="light">
                  {/* ── 한국어 에디터 */}
                  <div className="space-y-1.5">
                    <Label>본문 (한국어)</Label>
                    <MDEditor
                      value={bodyKo}
                      onChange={(v) => setBodyKo(v ?? "")}
                      height={320}
                      preview="edit"
                      commands={STORY_COMMANDS}
                      extraCommands={STORY_EXTRA_COMMANDS}
                      visibleDragbar={false}
                    />
                  </div>

                  {/* EN 섹션 토글 */}
                  <div className="pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setEnSectionOpen((p) => ({ ...p, body: !p.body }))}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full"
                    >
                      <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", enSectionOpen.body && "rotate-180")} />
                      영어 번역 검토
                      {bodyEn && (
                        <span className="ml-auto text-green-600 text-[10px]">번역됨</span>
                      )}
                    </button>
                    {enSectionOpen.body && (
                      <div className="mt-3 pl-1">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">본문 (English)</Label>
                          <MDEditor
                            value={bodyEn}
                            onChange={(v) => setBodyEn(v ?? "")}
                            height={320}
                            preview="edit"
                            commands={STORY_COMMANDS}
                            extraCommands={STORY_EXTRA_COMMANDS}
                            visibleDragbar={false}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── 섹션 4: 출처 ───────────────────────────────────────────── */}
              <Card className="gap-2">
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold text-foreground">
                    출처
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSource}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    출처 추가
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sources.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      등록된 출처가 없습니다. 위 버튼을 눌러 추가하세요.
                    </p>
                  )}
                  {sources.map((src, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          출처 {i + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeSource(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">출처 유형</Label>
                          <Select
                            value={src.sourceType || ""}
                            onValueChange={(v) => updateSource(i, "sourceType", v)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue placeholder="유형 선택" />
                            </SelectTrigger>
                            <SelectContent>
                              {SOURCE_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">게시 날짜</Label>
                          <Input
                            value={src.sourcePostDate}
                            onChange={(e) =>
                              updateSource(i, "sourcePostDate", e.target.value)
                            }
                            placeholder="예: 2024-01-15"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">출처 URL</Label>
                        <div className="flex gap-1.5">
                          <Input
                            value={src.sourceUrl}
                            onChange={(e) =>
                              updateSource(i, "sourceUrl", e.target.value)
                            }
                            placeholder="https://..."
                            className="h-8 text-sm"
                          />
                          {src.sourceUrl && (
                            <a
                              href={src.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">레퍼런스 URL</Label>
                        <div className="flex gap-1.5">
                          <Input
                            value={src.referenceUrl}
                            onChange={(e) =>
                              updateSource(i, "referenceUrl", e.target.value)
                            }
                            placeholder="https://... (선택)"
                            className="h-8 text-sm"
                          />
                          {src.referenceUrl && (
                            <a
                              href={src.referenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">메모</Label>
                        <Input
                          value={src.sourceNote}
                          onChange={(e) =>
                            updateSource(i, "sourceNote", e.target.value)
                          }
                          placeholder="출처에 대한 메모"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* ── 섹션 5: 수집 정보 ──────────────────────────────────────── */}
              <Card className="gap-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-foreground">
                    수집 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="collectedBy">수집자</Label>
                      <Input
                        id="collectedBy"
                        value={collectedBy}
                        onChange={(e) => setCollectedBy(e.target.value)}
                        placeholder="예: 홍길동"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="collectedAt">수집 날짜</Label>
                      <Input
                        id="collectedAt"
                        value={collectedAt}
                        onChange={(e) => setCollectedAt(e.target.value)}
                        placeholder="예: 2024-01-15"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="memo">메모 (내부용)</Label>
                    <Textarea
                      id="memo"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      rows={2}
                      placeholder="관리자 내부 메모"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ─── 오른쪽 사이드바 (sticky) ──────────────────────────────── */}
            <div className="space-y-4 sticky top-[3.6rem]">

              {/* ── 전체 번역 카드 ──────────────────────────────────────────── */}
              <Card>
                <CardContent className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-8 text-xs"
                    onClick={handleTranslateAll}
                    disabled={isTranslating || (!titleKo && !bodyKo)}
                  >
                    {isTranslating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        번역 중...
                      </>
                    ) : (
                      <>
                        <Languages className="w-3.5 h-3.5 mr-1.5" />
                        전체 번역 (KO → EN)
                      </>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                    모든 KO 필드를 한 번에 번역합니다
                  </p>
                </CardContent>
              </Card>

              {/* ── 장소 카드 ──────────────────────────────────────────────── */}
              <Card className="gap-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-foreground">
                    장소
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedPlace ? (
                    <>
                      {/* 썸네일 */}
                      {selectedPlace.imageUrl && (
                        <div className="relative h-24 w-full overflow-hidden rounded-md border">
                          <Image
                            src={selectedPlace.imageUrl}
                            alt={selectedPlace.nameKo}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}

                      {/* 장소 정보 */}
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{selectedPlace.nameKo}</p>
                        {selectedPlace.nameEn && (
                          <p className="text-xs text-muted-foreground">{selectedPlace.nameEn}</p>
                        )}
                        {selectedPlace.addressKo && (
                          <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{selectedPlace.addressKo}</span>
                          </div>
                        )}
                        {selectedPlace.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{selectedPlace.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* 지도 미리보기 */}
                      {selectedPlace.latitude && selectedPlace.longitude ? (
                        <div className="overflow-hidden rounded-md">
                          <MapPreview
                            lat={selectedPlace.latitude}
                            lng={selectedPlace.longitude}
                            zoom={15}
                            height={180}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-24 rounded-md border bg-muted/50 text-xs text-muted-foreground">
                          지도 정보 없음
                        </div>
                      )}

                      {/* 변경 / 상세 보기 버튼 */}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => setPlacePickerOpen(true)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          변경
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => setPlaceDetailOpen(true)}
                        >
                          상세 보기
                        </Button>
                      </div>
                    </>
                  ) : (
                    /* 장소 연결 버튼 */
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setPlacePickerOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      장소 연결
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* ── 토픽 & 태그 카드 ────────────────────────────────────────── */}
              <Card className="gap-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-foreground">
                      토픽 & 태그
                    </CardTitle>
                    {(postTopics.length > 0 || postTags.length > 0) && (
                      <span className="text-xs text-muted-foreground">
                        {postTopics.length + postTags.length}개 선택
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(postTopics.length > 0 || postTags.length > 0) && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {postTopics.map((pt) => {
                        const t = topicMap.get(pt.topicId);
                        if (!t) return null;
                        return (
                          <span
                            key={pt.topicId}
                            className="inline-flex items-center gap-1 rounded-full border-transparent px-2 py-0.5 text-xs font-medium"
                            style={topicEffectiveStyleMap.get(t.id) ?? {}}
                          >
                            {t.nameEn}
                            <button
                              type="button"
                              onClick={() => removeTopic(pt.topicId)}
                              className="opacity-60 hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                      {postTags.map((pt) => {
                        const t = tagMap.get(pt.tagId);
                        if (!t) return null;
                        return (
                          <span
                            key={pt.tagId}
                            className="inline-flex items-center gap-1 rounded-full border-transparent px-2 py-0.5 text-xs font-medium"
                            style={getTagStyle(t)}
                          >
                            {t.name}
                            <button
                              type="button"
                              onClick={() => removeTag(pt.tagId)}
                              className="opacity-60 hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => setLabelDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    토픽 / 태그 추가
                  </Button>
                </CardContent>
              </Card>

              {/* ── 라벨 표시 설정 카드 ────────────────────────────────────── */}
              <Card className="gap-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-foreground">
                    라벨 표시 설정
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(postTopics.length === 0 && postTags.length === 0) ? (
                    <p className="text-xs text-muted-foreground">
                      토픽/태그를 추가하면 여기서 표시 여부와 순서를 설정할 수 있습니다.
                    </p>
                  ) : (
                    <>
                      {/* 전체 라벨 목록 (eye 토글) */}
                      <div className="space-y-1">
                        {postTopics.map((pt) => {
                          const t = topicMap.get(pt.topicId);
                          if (!t) return null;
                          return (
                            <div
                              key={pt.topicId}
                              className="flex items-center gap-2 text-xs"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setPostTopics((prev) => {
                                    const updated = prev.map((p) =>
                                      p.topicId === pt.topicId
                                        ? { ...p, isVisible: !p.isVisible }
                                        : p,
                                    );
                                    const visibleTopics = updated.filter((p) => p.isVisible);
                                    const visibleTags = postTags.filter((p) => p.isVisible);
                                    const combined = [
                                      ...visibleTopics.map((p) => ({ id: `t-${p.topicId}`, order: p.displayOrder })),
                                      ...visibleTags.map((p) => ({ id: `g-${p.tagId}`, order: p.displayOrder })),
                                    ].sort((a, b) => a.order - b.order);
                                    const orderMap = new Map(combined.map((item, idx) => [item.id, idx]));
                                    return updated.map((p) =>
                                      p.isVisible
                                        ? { ...p, displayOrder: orderMap.get(`t-${p.topicId}`) ?? 0 }
                                        : { ...p, displayOrder: 0 },
                                    );
                                  });
                                }}
                                className={`shrink-0 transition-colors ${pt.isVisible ? "text-foreground" : "text-muted-foreground/40"}`}
                              >
                                {pt.isVisible ? (
                                  <Eye className="h-3.5 w-3.5" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                                style={topicEffectiveStyleMap.get(t.id) ?? {}}
                              >
                                {t.nameEn}
                              </span>
                            </div>
                          );
                        })}
                        {postTags.map((pt) => {
                          const t = tagMap.get(pt.tagId);
                          if (!t) return null;
                          return (
                            <div
                              key={pt.tagId}
                              className="flex items-center gap-2 text-xs"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setPostTags((prev) => {
                                    const updated = prev.map((p) =>
                                      p.tagId === pt.tagId
                                        ? { ...p, isVisible: !p.isVisible }
                                        : p,
                                    );
                                    const visibleTopics = postTopics.filter((p) => p.isVisible);
                                    const visibleTags = updated.filter((p) => p.isVisible);
                                    const combined = [
                                      ...visibleTopics.map((p) => ({ id: `t-${p.topicId}`, order: p.displayOrder })),
                                      ...visibleTags.map((p) => ({ id: `g-${p.tagId}`, order: p.displayOrder })),
                                    ].sort((a, b) => a.order - b.order);
                                    const orderMap = new Map(combined.map((item, idx) => [item.id, idx]));
                                    return updated.map((p) =>
                                      p.isVisible
                                        ? { ...p, displayOrder: orderMap.get(`g-${p.tagId}`) ?? 0 }
                                        : { ...p, displayOrder: 0 },
                                    );
                                  });
                                }}
                                className={`shrink-0 transition-colors ${pt.isVisible ? "text-foreground" : "text-muted-foreground/40"}`}
                              >
                                {pt.isVisible ? (
                                  <Eye className="h-3.5 w-3.5" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                                style={getTagStyle(t)}
                              >
                                {t.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Visible 라벨 DnD 순서 변경 */}
                      {visibleItems.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">노출 순서 (드래그)</p>
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              <SortableContext
                                items={visibleItems.map((item) => item.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <div className="space-y-1">
                                  {visibleItems.map((item) => (
                                    <SortableLabel
                                      key={item.id}
                                      item={item}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sheet 컴포넌트 ───────────────────────────────────────────────────── */}
      <PlacePickerSheet
        open={placePickerOpen}
        onOpenChange={setPlacePickerOpen}
        onSelect={(place) => {
          setSelectedPlace(place);
          setPlacePickerOpen(false);
        }}
      />
      <PlaceDetailSheet
        placeId={selectedPlace?.id ?? null}
        open={placeDetailOpen}
        onOpenChange={setPlaceDetailOpen}
      />

      {/* ── Dialog 컴포넌트 ──────────────────────────────────────────────────── */}
      <LabelSelectDialog
        open={labelDialogOpen}
        onOpenChange={setLabelDialogOpen}
        allTopics={allTopics}
        allTags={allTags}
        tagGroups={tagGroups}
        selectedTopicIds={selectedTopicIdSet}
        selectedTagIds={selectedTagIdSet}
        onConfirm={handleLabelConfirm}
      />
    </div>
  );
}
