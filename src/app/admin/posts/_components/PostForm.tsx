"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Eye,
  Languages,
  MapPin,
  Phone,
  Sparkles,
  Star,
  Train,
  X,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const MapPreview = dynamic(
  () => import("@/components/maps/MapPreview").then((m) => m.MapPreview),
  { ssr: false, loading: () => <div className="h-[260px] rounded-md bg-muted/50 animate-pulse" /> },
);
import type { PostStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  checkPostSlug,
  type PostFormData,
  type PostImageInput,
  type PostSourceInput,
  type SpotInsightData,
} from "../_actions/post-actions";
import { translateFields, fetchAIDraft } from "../_actions/draft-actions";
import { PlacePickerSheet } from "./PlacePickerSheet";
import { PlaceDetailSheet } from "./PlaceDetailSheet";
import { ContentTab } from "./ContentTab";
import { TaxonomyTab } from "./TaxonomyTab";
import { InsightTab } from "./InsightTab";
import { SourceTab } from "./SourceTab";
import { PostImageSection } from "./PostImageSection";
import { LabelVisibilityCard } from "./LabelVisibilityCard";
import { AIDraftReviewDialog, type AIDraftData } from "./AIDraftReviewSheet";

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
  colorHex?: string;
  colorHex2?: string | null;
  gradientDir?: string;
  gradientStop?: number;
  textColorHex?: string;
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
  rating: number | null;
  status: string;
  operatingHours: unknown;
  googleMapsUrl: string | null;
  naverMapsUrl: string | null;
  gettingThere: string | null;
};

export type PlaceEntry = {
  place: PlaceForForm;
  contextKo: string;
  contextEn: string;
  mustTryKo: string;
  mustTryEn: string;
  tipKo: string;
  tipEn: string;
  vibe: string[];
};

export type PostInitialData = {
  id: string;
  titleKo: string;
  titleEn: string;
  slug: string;
  bodyKo: string | null;
  bodyEn: string | null;
  status: PostStatus;
  memo: string | null;
  collectedBy: string | null;
  collectedAt: string | null;
  postTopics: { topicId: string; isVisible: boolean; displayOrder: number }[];
  postTags: { tagId: string; isVisible: boolean; displayOrder: number }[];
  postImages: PostImageInput[];
  postSources: PostSourceInput[];
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
    placeRating?: number | null;
    placeStatus?: string;
    placeOperatingHours?: unknown;
    placeGoogleMapsUrl?: string | null;
    placeNaverMapsUrl?: string | null;
    placeGettingThere?: string | null;
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
  onSuccess?: () => void;
  isEmbedded?: boolean;
}

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "place", label: "장소" },
  { id: "insight", label: "Spot Insight" },
  { id: "taxonomy", label: "분류/태그" },
  { id: "content", label: "본문" },
  { id: "source", label: "출처" },
  { id: "images", label: "이미지" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const EMPTY_SOURCE: PostSourceInput = {
  url: "",
  sourceType: "PRIMARY",
  platform: "",
  sourceNote: "",
  sourcePostDate: "",
  isOriginalLink: false,
};

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── PostForm 컴포넌트 ──────────────────────────────────────────────────────────

export function PostForm({
  mode,
  postId,
  initialData,
  allTags: initialAllTags,
  allTopics: initialAllTopics,
  tagGroups,
  onSuccess,
  isEmbedded,
}: PostFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEdit = mode === "edit";

  // ── 탭 상태 ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>("place");

  // ── 초기 장소 entries ────────────────────────────────────────────────────────
  const initPlaceEntries: PlaceEntry[] = (initialData?.postPlaces ?? []).map((pp) => ({
    place: {
      id: pp.placeId,
      nameKo: pp.placeNameKo ?? "",
      nameEn: pp.placeNameEn ?? null,
      addressKo: pp.placeAddressKo ?? null,
      addressEn: pp.placeAddressEn ?? null,
      latitude: pp.placeLatitude ?? null,
      longitude: pp.placeLongitude ?? null,
      phone: pp.placePhone ?? null,
      imageUrl: pp.placeImageUrl ?? null,
      rating: pp.placeRating ?? null,
      status: pp.placeStatus ?? "OPEN",
      operatingHours: pp.placeOperatingHours ?? null,
      googleMapsUrl: pp.placeGoogleMapsUrl ?? null,
      naverMapsUrl: pp.placeNaverMapsUrl ?? null,
      gettingThere: pp.placeGettingThere ?? null,
    },
    contextKo: pp.context ?? "",
    contextEn: (pp.insightEn as { context?: string } | null)?.context ?? "",
    mustTryKo: pp.mustTry ?? "",
    mustTryEn: (pp.insightEn as { mustTry?: string } | null)?.mustTry ?? "",
    tipKo: pp.tip ?? "",
    tipEn: (pp.insightEn as { tip?: string } | null)?.tip ?? "",
    vibe: pp.vibe ?? [],
  }));

  // ── 초기 출처 ───────────────────────────────────────────────────────────────
  const initSources: PostSourceInput[] = initialData?.postSources ?? [];

  // ── 폼 상태 ─────────────────────────────────────────────────────────────────
  const [titleKo, setTitleKo] = useState(initialData?.titleKo ?? "");
  const [titleEn, setTitleEn] = useState(initialData?.titleEn ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [bodyKo, setBodyKo] = useState(initialData?.bodyKo ?? "");
  const [bodyEn, setBodyEn] = useState(initialData?.bodyEn ?? "");
  const [images, setImages] = useState<PostImageInput[]>(initialData?.postImages ?? []);
  const [status, setStatus] = useState<PostStatus>(initialData?.status ?? "DRAFT");
  const [memo, setMemo] = useState(initialData?.memo ?? "");
  const [collectedBy, setCollectedBy] = useState(initialData?.collectedBy ?? "");
  const [collectedAt, setCollectedAt] = useState(initialData?.collectedAt ?? "");
  const [sources, setSources] = useState<PostSourceInput[]>(initSources);

  type PostTopicState = { topicId: string; isVisible: boolean; displayOrder: number };
  type PostTagState = { tagId: string; isVisible: boolean; displayOrder: number };

  const [postTopics, setPostTopics] = useState<PostTopicState[]>(initialData?.postTopics ?? []);
  const [postTags, setPostTags] = useState<PostTagState[]>(initialData?.postTags ?? []);

  // ── 인라인 추가용 로컬 목록 ──────────────────────────────────────────────────
  const [localAllTopics, setLocalAllTopics] = useState<TopicForForm[]>(initialAllTopics);
  const [localAllTags, setLocalAllTags] = useState<TagForForm[]>(initialAllTags);

  // ── 복수 장소 + Insight 상태 ─────────────────────────────────────────────────
  const [placeEntries, setPlaceEntries] = useState<PlaceEntry[]>(initPlaceEntries);
  const [activePlaceIndex, setActivePlaceIndex] = useState(0);

  // ── UI 상태 ─────────────────────────────────────────────────────────────────
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [slugManual, setSlugManual] = useState(false);
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslatingTitle, setIsTranslatingTitle] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftResult, setDraftResult] = useState<AIDraftData | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // ── 파생값 ─────────────────────────────────────────────────────────────────
  type EffInfo = { hex: string; hex2: string | null; dir: string; stop: number; textHex: string };

  const { topicEffectiveStyleMap, topicEffectiveInfoMap } = useMemo(() => {
    const DEFAULT_COLOR = "#C8FF09";
    const DEFAULT_TEXT = "#000000";
    const effectiveMap = new Map<string, EffInfo>();
    const styleMap = new Map<string, React.CSSProperties>();
    for (const t of localAllTopics) {
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
    return { topicEffectiveStyleMap: styleMap, topicEffectiveInfoMap: effectiveMap };
  }, [localAllTopics]);

  const tagGroupColorMap = useMemo(
    () => new Map(tagGroups.map((g) => [g.group, g])),
    [tagGroups],
  );

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
      const { available } = await checkPostSlug(slug, isEdit ? postId : undefined);
      setSlugStatus(available ? "ok" : "error");
    }, 400);
    return () => {
      if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current);
    };
  }, [slug, isEdit, postId]);

  // ── 출처 핸들러 ─────────────────────────────────────────────────────────────
  const addSource = () => setSources((prev) => [...prev, { ...EMPTY_SOURCE }]);
  const removeSource = (i: number) => setSources((prev) => prev.filter((_, idx) => idx !== i));
  const updateSource = (i: number, patch: Partial<PostSourceInput>) =>
    setSources((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  // ── 장소 핸들러 ─────────────────────────────────────────────────────────────
  const addPlace = (place: PlaceForForm) => {
    // 단일 장소: 기존 Insight 유지하며 장소만 교체
    setPlaceEntries((prev) => {
      const existing = prev[0];
      return [{
        place,
        contextKo: existing?.contextKo ?? "",
        contextEn: existing?.contextEn ?? "",
        mustTryKo: existing?.mustTryKo ?? "",
        mustTryEn: existing?.mustTryEn ?? "",
        tipKo: existing?.tipKo ?? "",
        tipEn: existing?.tipEn ?? "",
        vibe: existing?.vibe ?? [],
      }];
    });
    setActivePlaceIndex(0);
    setPlacePickerOpen(false);
  };

  const removePlace = () => {
    setPlaceEntries([]);
    setActivePlaceIndex(0);
  };

  const updatePlaceInsight = (
    i: number,
    field: keyof Omit<PlaceEntry, "place">,
    value: string | string[],
  ) => {
    setPlaceEntries((prev) =>
      prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)),
    );
  };

  // ── 전체 번역 ───────────────────────────────────────────────────────────────
  async function handleTranslateAll() {
    const activeEntry = placeEntries[activePlaceIndex];
    setIsTranslating(true);
    const { data, error } = await translateFields({
      title: titleKo,
      body: bodyKo,
      context: activeEntry?.contextKo ?? "",
      mustTry: activeEntry?.mustTryKo ?? "",
      tip: activeEntry?.tipKo ?? "",
    });
    if (error) {
      toast.error(error);
    } else if (data) {
      if (data.title) setTitleEn(data.title);
      if (data.body) setBodyEn(data.body);
      if (activeEntry && activePlaceIndex < placeEntries.length) {
        setPlaceEntries((prev) =>
          prev.map((e, idx) => {
            if (idx !== activePlaceIndex) return e;
            return {
              ...e,
              contextEn: data.context ?? e.contextEn,
              mustTryEn: data.mustTry ?? e.mustTryEn,
              tipEn: data.tip ?? e.tipEn,
            };
          }),
        );
      }
      toast.success("전체 번역 완료. 영어 내용을 검토해주세요.");
    }
    setIsTranslating(false);
  }

  // ── AI 초안 채우기 ──────────────────────────────────────────────────────────
  async function handleFillAIDraft() {
    if (!postId) return;
    setIsGeneratingDraft(true);
    const { data, error } = await fetchAIDraft(postId);
    setIsGeneratingDraft(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (!data) return;
    setDraftResult(data);
    setReviewDialogOpen(true);
  }

  function handleApplyDraft(selected: Partial<AIDraftData>) {
    if (selected.titleKo !== undefined) setTitleKo(selected.titleKo);
    if (selected.storyKo !== undefined) setBodyKo(selected.storyKo);
    if (placeEntries.length > 0 && (
      selected.contextKo !== undefined ||
      selected.vibes !== undefined || selected.mustTryKo !== undefined ||
      selected.tipKo !== undefined
    )) {
      setPlaceEntries((prev) =>
        prev.map((e, idx) =>
          idx !== 0
            ? e
            : {
                ...e,
                ...(selected.contextKo !== undefined && { contextKo: selected.contextKo }),
                ...(selected.vibes !== undefined && { vibe: selected.vibes }),
                ...(selected.mustTryKo !== undefined && { mustTryKo: selected.mustTryKo }),
                ...(selected.tipKo !== undefined && { tipKo: selected.tipKo }),
              },
        ),
      );
    }
    toast.success("AI 초안이 적용되었습니다. 내용을 검토 후 저장하세요.");
  }

  // ── 제출 ───────────────────────────────────────────────────────────────────

  function buildFormData(finalStatus: PostStatus): PostFormData {
    return {
      titleKo: titleKo.trim(),
      titleEn: titleEn.trim(),
      slug: slug.trim(),
      bodyKo: bodyKo.trim(),
      bodyEn: bodyEn.trim(),
      status: finalStatus,
      memo: memo.trim(),
      collectedBy: collectedBy.trim(),
      collectedAt: collectedAt.trim(),
      images,
      sources: sources.filter((s) => s.url || s.sourceNote),
      topics: postTopics,
      tags: postTags,
      places: placeEntries.map((e) => {
        const hasInsight =
          e.contextKo || e.contextEn || e.vibe.length > 0 ||
          e.mustTryKo || e.mustTryEn || e.tipKo || e.tipEn;
        const spotInsight: SpotInsightData | null = hasInsight
          ? {
              contextKo: e.contextKo, contextEn: e.contextEn,
              vibe: e.vibe,
              mustTryKo: e.mustTryKo, mustTryEn: e.mustTryEn,
              tipKo: e.tipKo, tipEn: e.tipEn,
            }
          : null;
        return { placeId: e.place.id, spotInsight };
      }),
    };
  }

  const handleSubmit = (targetStatus?: PostStatus) => {
    const finalStatus = targetStatus ?? status;

    if (!titleKo.trim()) { toast.error("한국어 제목을 입력해주세요."); return; }
    if (!titleEn.trim()) { toast.error("영어 제목을 입력해주세요."); return; }
    if (!slug.trim()) { toast.error("슬러그를 입력해주세요."); return; }
    if (slugStatus === "error") { toast.error("슬러그가 이미 사용 중입니다."); return; }

    if (finalStatus === "PUBLISHED") {
      const missing: string[] = [];
      if (postTopics.length === 0) missing.push("토픽 1개 이상");
      if (!images.some((img) => img.isThumbnail)) missing.push("썸네일 이미지");
      const visibleCount =
        postTopics.filter((t) => t.isVisible).length + postTags.filter((t) => t.isVisible).length;
      if (visibleCount < 1) missing.push("라벨 1개 이상 표시 설정 필요");
      if (missing.length > 0) { toast.error(`발행 불가: ${missing.join(", ")} 필요`); return; }
    }

    startTransition(async () => {
      const data = buildFormData(finalStatus);
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
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/admin/posts");
        }
      }
    });
  };

  const handlePreview = () => {
    if (!isEdit || !postId || !slug.trim()) return;
    if (!titleKo.trim()) { toast.error("한국어 제목을 입력해주세요."); return; }
    if (!slug.trim()) { toast.error("슬러그를 입력해주세요."); return; }

    startTransition(async () => {
      const data = buildFormData(status);
      const { updatePost } = await import("../_actions/post-actions");
      const result = await updatePost(postId, data);

      if (result.error) {
        toast.error(result.error);
      } else {
        window.open(`/posts/${slug.trim()}?preview=1`, "_blank");
      }
    });
  };

  // ── 번역 상태 계산 ───────────────────────────────────────────────────────────
  const insightTranslated = placeEntries.some(
    (e) => e.contextEn || e.mustTryEn || e.tipEn,
  );

  // ── 렌더 ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-full flex-col">
      {/* ── Sticky 액션바 ──────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 shrink-0 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {isEmbedded ? (
              <button
                type="button"
                onClick={onSuccess}
                className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/admin/posts"
                className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
            <h1 className="text-base font-semibold">
              {isEdit ? "포스트 수정" : "포스트 작성"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {!isEmbedded && isEdit && initialData?.slug && (
              <Button variant="outline" size="sm" disabled={isPending} onClick={handlePreview}>
                {isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Eye className="h-3.5 w-3.5" />
                }
                미리보기
              </Button>
            )}

            {isEmbedded ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/admin/posts/${postId}/edit`}>전체 편집 페이지</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/posts">취소</Link>
              </Button>
            )}

            {!isEmbedded && isEdit && status === "PUBLISHED" && (
              <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleSubmit("DRAFT")}>
                임시저장으로 변경
              </Button>
            )}

            <Button
              size="sm"
              disabled={isPending || slugStatus === "error"}
              onClick={() => {
                if (status === "PUBLISHED") handleSubmit("PUBLISHED");
                else handleSubmit("DRAFT");
              }}
            >
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              저장
            </Button>

            {!isEmbedded && status !== "PUBLISHED" && (
              <Button
                size="sm"
                className="bg-brand text-black hover:bg-brand/90"
                disabled={isPending || slugStatus === "error"}
                onClick={() => handleSubmit("PUBLISHED")}
              >
                발행
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 본문 ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-[1fr_320px] gap-6 items-start">

            {/* ── 왼쪽: 제목 카드 + 탭 카드 ───────────────────────────── */}
            <div className="min-w-0 space-y-3">

              {/* 카드 1: 제목 + 슬러그 + 장소 — sticky */}
              <div className="sticky top-14 z-30">
                <Card className="gap-3 py-4 border-0">
                  <CardContent className="space-y-3">
                    {/* 제목 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center h-6">
                          <span className="text-xs font-medium text-muted-foreground">제목 (한국어)</span>
                        </div>
                        <input
                          value={titleKo}
                          onChange={(e) => setTitleKo(e.target.value)}
                          placeholder="한국어 제목을 입력하세요"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between h-6">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-muted-foreground">Title (English)</span>
                            {titleEn && (
                              <span className="text-[10px] text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded">
                                번역됨
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-muted-foreground gap-1"
                            disabled={!titleKo.trim() || isTranslatingTitle}
                            onClick={async () => {
                              setIsTranslatingTitle(true);
                              const { data, error } = await translateFields({ value: titleKo });
                              setIsTranslatingTitle(false);
                              if (error) { toast.error(error); }
                              else if (data?.value) setTitleEn(data.value);
                            }}
                          >
                            {isTranslatingTitle ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Languages className="h-3 w-3" />
                            )}
                            번역
                          </Button>
                        </div>
                        <input
                          value={titleEn}
                          onChange={(e) => setTitleEn(e.target.value)}
                          placeholder="Enter English title"
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                    </div>

                    {/* 슬러그 */}
                    <div className="space-y-1.5">
                      <div className="flex items-center h-6">
                        <span className="text-xs font-medium text-muted-foreground">슬러그</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          value={slug}
                          onChange={(e) => { setSlugManual(true); setSlug(e.target.value); }}
                          placeholder="url-friendly-slug"
                          className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${
                            slugStatus === "error" ? "border-destructive" : slugStatus === "ok" ? "border-green-500" : ""
                          }`}
                        />
                        {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                        {slugStatus === "ok" && <Check className="h-4 w-4 text-green-600 shrink-0" />}
                        {slugStatus === "error" && <span className="text-xs text-destructive shrink-0">중복</span>}
                      </div>
                      {slugManual && (
                        <button type="button" className="text-xs text-muted-foreground underline" onClick={() => { setSlugManual(false); setSlug(generateSlug(titleEn)); }}>
                          자동 생성으로 되돌리기
                        </button>
                      )}
                    </div>

                  </CardContent>
                </Card>
              </div>

              {/* 카드 2: 탭 바 + 탭 콘텐츠 */}
              <Card className="overflow-hidden py-0 gap-0 border-0">
                {/* 탭 네비게이션 */}
                <div className="flex gap-1 px-4 py-2 border-b">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
                        activeTab === tab.id
                          ? "bg-zinc-900 text-white font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* 탭 콘텐츠 */}
                <div className="px-6 py-4">
                  {activeTab === "place" && (() => {
                    const entry = placeEntries[0] ?? null;
                    const place = entry?.place ?? null;
                    const STATUS_LABEL: Record<string, string> = { OPEN: "영업 중", CLOSED_TEMP: "임시 휴업", CLOSED_PERMANENT: "폐업" };
                    // 사용자 페이지와 동일하게 naverMapsUrl은 nameKo로 동적 생성
                    const naverMapsFallback = place?.nameKo
                      ? `https://map.naver.com/v5/search/${encodeURIComponent(place.nameKo)}`
                      : null;
                    return entry && place ? (
                      <div className="space-y-3">
                        {/* 이름 + 버튼 */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <MapPin className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              <p className="font-semibold text-sm">{place.nameKo}</p>
                              {place.nameEn && <p className="text-xs text-muted-foreground">{place.nameEn}</p>}
                            </div>
                            {place.addressKo && (
                              <p className="text-xs text-muted-foreground pl-5">{place.addressKo}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPlacePickerOpen(true)}>변경</Button>
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={removePlace}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* 지도 */}
                        {place.latitude && place.longitude ? (
                          <div className="overflow-hidden rounded-lg border">
                            <MapPreview lat={place.latitude} lng={place.longitude} zoom={15} height={220} />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-36 rounded-lg border bg-muted/50 text-sm text-muted-foreground">지도 정보 없음</div>
                        )}

                        {/* 지도 링크 버튼 */}
                        <div className="grid grid-cols-2 gap-2">
                          {place.googleMapsUrl ? (
                            <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 h-9 rounded-md border text-xs font-medium hover:bg-muted/50 transition-colors">
                              <ExternalLink className="h-3.5 w-3.5" />Google Maps
                            </a>
                          ) : <div />}
                          {(place.naverMapsUrl ?? naverMapsFallback) && (
                            <a href={(place.naverMapsUrl ?? naverMapsFallback)!} target="_blank" rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 h-9 rounded-md border text-xs font-medium hover:bg-muted/50 transition-colors">
                              <ExternalLink className="h-3.5 w-3.5" />Naver Maps
                            </a>
                          )}
                        </div>

                        {/* 상세 정보 */}
                        <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5 text-xs">
                          {/* 상태 + 평점 */}
                          <div className="flex items-center gap-3">
                            {place.status && (
                              <span className={place.status === "OPEN" ? "text-green-600 font-medium" : "text-muted-foreground"}>
                                {STATUS_LABEL[place.status] ?? place.status}
                              </span>
                            )}
                            {place.rating != null && (
                              <div className="flex items-center gap-0.5 text-muted-foreground">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span>{place.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>

                          {/* 영업시간 */}
                          {Array.isArray(place.operatingHours) && (place.operatingHours as string[]).length > 0 && (
                            <div className="flex gap-1.5">
                              <Clock className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
                              <ul className="space-y-0.5">
                                {(place.operatingHours as string[]).map((line, i) => (
                                  <li key={i} className="text-muted-foreground">{line}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* 전화번호 */}
                          {place.phone && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Phone className="h-3 w-3 shrink-0" />
                              <span>{place.phone}</span>
                            </div>
                          )}

                          {/* Getting there */}
                          {place.gettingThere && (
                            <div className="flex gap-1.5">
                              <Train className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
                              <p className="text-muted-foreground">{place.gettingThere}</p>
                            </div>
                          )}

                          {/* 편집 링크 */}
                          <div className="pt-0.5 border-t border-border">
                            <a href={`/admin/places/${place.id}/edit`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline">
                              <ExternalLink className="h-3 w-3" />장소 편집
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPlacePickerOpen(true)}
                        className="w-full flex flex-col items-center gap-3 py-14 rounded-lg border border-dashed text-muted-foreground hover:border-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        <MapPin className="h-6 w-6" />
                        <div className="text-center">
                          <p className="text-sm font-medium">장소 연결</p>
                          <p className="text-xs mt-0.5 opacity-70">포스트와 관련된 장소를 검색하여 연결합니다</p>
                        </div>
                      </button>
                    );
                  })()}
                  {activeTab === "insight" && (
                    <InsightTab
                      placeEntries={placeEntries}
                      activePlaceIndex={activePlaceIndex}
                      setActivePlaceIndex={setActivePlaceIndex}
                      updatePlaceInsight={updatePlaceInsight}
                      onAddPlace={() => setPlacePickerOpen(true)}
                    />
                  )}
                  {activeTab === "taxonomy" && (
                    <TaxonomyTab
                      postTopics={postTopics} setPostTopics={setPostTopics}
                      postTags={postTags} setPostTags={setPostTags}
                      allTopics={localAllTopics} allTags={localAllTags} tagGroups={tagGroups}
                      topicEffectiveStyleMap={topicEffectiveStyleMap}
                      topicEffectiveInfoMap={topicEffectiveInfoMap}
                      tagGroupColorMap={tagGroupColorMap}
                      onTopicAdded={(topic) => setLocalAllTopics((prev) => [...prev, topic])}
                      onTagAdded={(tag) => setLocalAllTags((prev) => [...prev, tag])}
                    />
                  )}
                  {activeTab === "content" && (
                    <ContentTab
                      bodyKo={bodyKo} setBodyKo={setBodyKo}
                      bodyEn={bodyEn} setBodyEn={setBodyEn}
                    />
                  )}
                  {activeTab === "source" && (
                    <SourceTab
                      sources={sources}
                      addSource={addSource}
                      removeSource={removeSource}
                      updateSource={updateSource}
                    />
                  )}
                  {activeTab === "images" && (
                    <PostImageSection
                      postId={postId}
                      images={images}
                      onChange={setImages}
                      sources={sources}
                    />
                  )}
                </div>
              </Card>
            </div>

            {/* ── 오른쪽: 사이드바 ────────────────────────────────────── */}
            <div className="space-y-3 sticky top-14">

              {/* 상태 */}
              <Card className="gap-3 py-4 border-0">
                <CardContent className="flex items-center justify-between">
                  <span className="text-sm font-semibold">상태</span>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                    status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      status === "PUBLISHED" ? "bg-green-500" : "bg-yellow-400"
                    }`} />
                    {status === "PUBLISHED" ? "발행됨" : "임시저장"}
                  </span>
                </CardContent>
              </Card>

              {/* 썸네일 */}
              <Card className="gap-3 py-4 border-0">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">썸네일</CardTitle>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                      onClick={() => setActiveTab("images")}
                    >
                      변경 →
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const thumb = images.find((img) => img.isThumbnail);
                    return thumb ? (
                      <div className="relative aspect-[3/2] rounded-lg overflow-hidden border">
                        <img src={thumb.url} alt="썸네일" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center aspect-[3/2] rounded-lg border bg-muted/50 text-xs text-muted-foreground">
                        썸네일 미설정
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* AI 초안 — edit 모드 전용 */}
              {isEdit && (
                <Card className="gap-3 py-4 border-0">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">AI 초안</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-8 text-xs"
                      disabled={isGeneratingDraft || placeEntries.length === 0}
                      onClick={handleFillAIDraft}
                    >
                      {isGeneratingDraft ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          생성 중...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                          AI 초안 채우기
                        </>
                      )}
                    </Button>
                    {placeEntries.length === 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
                        장소를 먼저 연결하세요
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* 번역 상태 */}
              <Card className="gap-3 py-4 border-0">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">번역 상태</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "제목", done: !!titleEn.trim() },
                    { label: "본문", done: !!bodyEn.trim() },
                    { label: "Spot Insight", done: insightTranslated },
                  ].map(({ label, done }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={done ? "text-green-600" : "text-muted-foreground/40"}>
                        {done ? "번역됨" : "미완료"}
                      </span>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-8 text-xs mt-2"
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
                </CardContent>
              </Card>

              {/* 라벨 표시 설정 */}
              <LabelVisibilityCard
                postTopics={postTopics}
                setPostTopics={setPostTopics}
                postTags={postTags}
                setPostTags={setPostTags}
                allTopics={localAllTopics}
                allTags={localAllTags}
                topicEffectiveStyleMap={topicEffectiveStyleMap}
              />

              {/* 수집 정보 */}
              <Card className="gap-3 py-4 border-0">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">수집 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="collectedBy" className="text-xs">수집자</Label>
                      <Input
                        id="collectedBy"
                        value={collectedBy}
                        onChange={(e) => setCollectedBy(e.target.value)}
                        placeholder="예: 홍길동"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="collectedAt" className="text-xs">수집 날짜</Label>
                      <Input
                        id="collectedAt"
                        type="date"
                        value={collectedAt}
                        onChange={(e) => setCollectedAt(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="memo" className="text-xs">메모 (내부용)</Label>
                    <Textarea
                      id="memo"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      rows={2}
                      placeholder="관리자 내부 메모"
                      className="text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sheet / Dialog ───────────────────────────────────────────────── */}
      <PlacePickerSheet
        open={placePickerOpen}
        onOpenChange={setPlacePickerOpen}
        onSelect={addPlace}
      />
      <AIDraftReviewDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        draft={draftResult}
        current={{
          titleKo,
          bodyKo,
          contextKo: placeEntries[0]?.contextKo ?? "",
          vibes: placeEntries[0]?.vibe ?? [],
          mustTryKo: placeEntries[0]?.mustTryKo ?? "",
          tipKo: placeEntries[0]?.tipKo ?? "",
        }}
        onApply={handleApplyDraft}
      />
    </div>
  );
}
