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
  Loader2,
  Eye,
  Languages,
  MapPin,
  Phone,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

const MapPreview = dynamic(
  () => import("@/components/maps/MapPreview").then((m) => m.MapPreview),
  { ssr: false, loading: () => <div className="h-[260px] rounded-md bg-muted/50 animate-pulse" /> },
);
import type { PostStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  checkPostSlug,
  type PostFormData,
  type PostSourceInput,
  type SpotInsightData,
} from "../_actions/post-actions";
import { translateFields } from "../_actions/draft-actions";
import { PlacePickerSheet } from "./PlacePickerSheet";
import { PlaceDetailSheet } from "./PlaceDetailSheet";
import { ContentTab } from "./ContentTab";
import { TaxonomyTab } from "./TaxonomyTab";
import { InsightTab } from "./InsightTab";
import { SourceTab } from "./SourceTab";
import { ThumbnailTab } from "./ThumbnailTab";
import { LabelVisibilityCard } from "./LabelVisibilityCard";

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
  { id: "thumbnail", label: "썸네일" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const EMPTY_SOURCE: PostSourceInput = {
  sourceType: "",
  sourceUrl: "",
  sourceNote: "",
  sourcePostDate: "",
  referenceUrl: "",
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
  allTags,
  allTopics,
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
  const initSources: PostSourceInput[] = (() => {
    if (initialData?.postSources && initialData.postSources.length > 0) {
      return initialData.postSources;
    }
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

  // ── 폼 상태 ─────────────────────────────────────────────────────────────────
  const [titleKo, setTitleKo] = useState(initialData?.titleKo ?? "");
  const [titleEn, setTitleEn] = useState(initialData?.titleEn ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [bodyKo, setBodyKo] = useState(initialData?.bodyKo ?? "");
  const [bodyEn, setBodyEn] = useState(initialData?.bodyEn ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl ?? "");
  const [status, setStatus] = useState<PostStatus>(initialData?.status ?? "DRAFT");
  const [memo, setMemo] = useState(initialData?.memo ?? "");
  const [collectedBy, setCollectedBy] = useState(initialData?.collectedBy ?? "");
  const [collectedAt, setCollectedAt] = useState(initialData?.collectedAt ?? "");
  const [sources, setSources] = useState<PostSourceInput[]>(initSources);

  type PostTopicState = { topicId: string; isVisible: boolean; displayOrder: number };
  type PostTagState = { tagId: string; isVisible: boolean; displayOrder: number };

  const [postTopics, setPostTopics] = useState<PostTopicState[]>(initialData?.postTopics ?? []);
  const [postTags, setPostTags] = useState<PostTagState[]>(initialData?.postTags ?? []);

  // ── 복수 장소 + Insight 상태 ─────────────────────────────────────────────────
  const [placeEntries, setPlaceEntries] = useState<PlaceEntry[]>(initPlaceEntries);
  const [activePlaceIndex, setActivePlaceIndex] = useState(0);

  // ── UI 상태 ─────────────────────────────────────────────────────────────────
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [slugManual, setSlugManual] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslatingTitle, setIsTranslatingTitle] = useState(false);

  // ── 파생값 ─────────────────────────────────────────────────────────────────
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

  // ── 썸네일 업로드 ──────────────────────────────────────────────────────────
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const { data } = supabase.storage.from("post-images").getPublicUrl(fileName);
      setThumbnailUrl(data.publicUrl);
      toast.success("썸네일이 업로드되었습니다.");
    } catch {
      toast.error("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setThumbnailUploading(false);
    }
  };

  // ── 출처 핸들러 ─────────────────────────────────────────────────────────────
  const addSource = () => setSources((prev) => [...prev, { ...EMPTY_SOURCE }]);
  const removeSource = (i: number) => setSources((prev) => prev.filter((_, idx) => idx !== i));
  const updateSource = (i: number, field: keyof PostSourceInput, value: string) =>
    setSources((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

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
      titleKo,
      contextKo: activeEntry?.contextKo ?? "",
      mustTryKo: activeEntry?.mustTryKo ?? "",
      tipKo: activeEntry?.tipKo ?? "",
      bodyKo,
    });
    if (error) {
      toast.error(error);
    } else if (data) {
      if (data.titleKo) setTitleEn(data.titleKo);
      if (data.bodyKo) setBodyEn(data.bodyKo);
      if (activeEntry && activePlaceIndex < placeEntries.length) {
        setPlaceEntries((prev) =>
          prev.map((e, idx) => {
            if (idx !== activePlaceIndex) return e;
            return {
              ...e,
              contextEn: data.contextKo ?? e.contextEn,
              mustTryEn: data.mustTryKo ?? e.mustTryEn,
              tipEn: data.tipKo ?? e.tipEn,
            };
          }),
        );
      }
      toast.success("전체 번역 완료. 영어 내용을 검토해주세요.");
    }
    setIsTranslating(false);
  }

  // ── 제출 ───────────────────────────────────────────────────────────────────
  const handleSubmit = (targetStatus?: PostStatus) => {
    const finalStatus = targetStatus ?? status;

    if (!titleKo.trim()) { toast.error("한국어 제목을 입력해주세요."); return; }
    if (!titleEn.trim()) { toast.error("영어 제목을 입력해주세요."); return; }
    if (!slug.trim()) { toast.error("슬러그를 입력해주세요."); return; }
    if (slugStatus === "error") { toast.error("슬러그가 이미 사용 중입니다."); return; }

    if (finalStatus === "PUBLISHED") {
      const missing: string[] = [];
      if (postTopics.length === 0) missing.push("토픽 1개 이상");
      if (!thumbnailUrl.trim()) missing.push("썸네일 이미지");
      const visibleCount =
        postTopics.filter((t) => t.isVisible).length + postTags.filter((t) => t.isVisible).length;
      if (visibleCount < 1) missing.push("라벨 1개 이상 표시 설정 필요");
      if (missing.length > 0) { toast.error(`발행 불가: ${missing.join(", ")} 필요`); return; }
    }

    const data: PostFormData = {
      titleKo: titleKo.trim(),
      titleEn: titleEn.trim(),
      slug: slug.trim(),
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
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/admin/posts");
        }
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
            {!isEmbedded && (isEdit && slug ? (
              <Button variant="outline" size="sm" asChild>
                <a href={`/posts/${slug}?preview=1`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  미리보기
                </a>
              </Button>
            ) : !isEdit && slug ? (
              <Button variant="outline" size="sm" disabled>
                <Eye className="h-3.5 w-3.5 mr-1" />
                미리보기
              </Button>
            ) : null)}

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
                <Card className="gap-3 py-4">
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
                        {slugStatus === "ok" && <span className="text-xs text-green-600 shrink-0">✓</span>}
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
              <Card className="overflow-hidden py-0 gap-0">
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
                    return entry ? (
                      <div className="space-y-3">
                        {/* 장소 정보 */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-baseline gap-2">
                              <p className="font-semibold text-base">{entry.place.nameKo}</p>
                              {entry.place.nameEn && (
                                <p className="text-sm text-muted-foreground">· {entry.place.nameEn}</p>
                              )}
                            </div>
                            {entry.place.addressKo && (
                              <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                <span>{entry.place.addressKo}</span>
                              </div>
                            )}
                            {entry.place.phone && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                <span>{entry.place.phone}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPlacePickerOpen(true)}
                            >
                              변경
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={removePlace}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* 지도 미리보기 */}
                        {entry.place.latitude && entry.place.longitude ? (
                          <div className="overflow-hidden rounded-lg border">
                            <MapPreview
                              lat={entry.place.latitude}
                              lng={entry.place.longitude}
                              zoom={15}
                              height={260}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-40 rounded-lg border bg-muted/50 text-sm text-muted-foreground">
                            지도 정보 없음
                          </div>
                        )}

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
                      allTopics={allTopics} allTags={allTags} tagGroups={tagGroups}
                      topicEffectiveStyleMap={topicEffectiveStyleMap}
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
                      memo={memo} setMemo={setMemo}
                      collectedBy={collectedBy} setCollectedBy={setCollectedBy}
                      collectedAt={collectedAt} setCollectedAt={setCollectedAt}
                    />
                  )}
                  {activeTab === "thumbnail" && (
                    <ThumbnailTab
                      sources={sources}
                      thumbnailUrl={thumbnailUrl}
                      setThumbnailUrl={setThumbnailUrl}
                      thumbnailUploading={thumbnailUploading}
                      handleThumbnailUpload={handleThumbnailUpload}
                    />
                  )}
                </div>
              </Card>
            </div>

            {/* ── 오른쪽: 사이드바 ────────────────────────────────────── */}
            <div className="space-y-3 sticky top-14">

              {/* 상태 */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs text-muted-foreground">상태</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {status === "PUBLISHED" ? "발행됨" : "임시저장"}
                </span>
              </div>

              {/* 썸네일 */}
              <Card className="gap-3 py-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">썸네일</CardTitle>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                      onClick={() => setActiveTab("thumbnail")}
                    >
                      변경 →
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {thumbnailUrl ? (
                    <div className="relative aspect-[3/2] rounded-lg overflow-hidden border">
                      <Image src={thumbnailUrl} alt="썸네일" fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center aspect-[3/2] rounded-lg border bg-muted/50 text-xs text-muted-foreground">
                      썸네일 미설정
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 번역 상태 */}
              <Card className="gap-3 py-4">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">번역 상태</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "제목", done: !!titleEn.trim() },
                    { label: "본문", done: !!bodyEn.trim() },
                    { label: "Insight", done: insightTranslated },
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
                allTopics={allTopics}
                allTags={allTags}
                topicEffectiveStyleMap={topicEffectiveStyleMap}
              />
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
      <PlaceDetailSheet
        placeId={detailPlaceId}
        open={!!detailPlaceId}
        onOpenChange={(open) => { if (!open) setDetailPlaceId(null); }}
      />
    </div>
  );
}
