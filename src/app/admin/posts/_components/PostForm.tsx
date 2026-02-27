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
  Loader2,
  X,
  Upload,
  Plus,
  Trash2,
  Eye,
  MapPin,
  Phone,
  ExternalLink,
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
import {
  checkPostSlug,
  type PostFormData,
  type PostSourceInput,
  type SpotInsightData,
} from "../_actions/post-actions";
import { PlacePickerSheet } from "./PlacePickerSheet";
import { PlaceDetailSheet } from "./PlaceDetailSheet";

// 마크다운 에디터: SSR 불가 → 동적 임포트
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
// MapPreview: SSR 불가 → 동적 임포트
const MapPreview = dynamic(
  () => import("@/components/maps/MapPreview").then((m) => m.MapPreview),
  { ssr: false, loading: () => <div className="h-40 rounded-lg border bg-muted/50" /> },
);

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export type TagForForm = {
  id: string;
  nameKo: string;
  group: string;
  colorHex: string | null;
};

export type TopicForForm = {
  id: string;
  nameKo: string;
  level: number;
  parentId: string | null;
  colorHex: string | null;
  textColorHex: string | null;
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
  postTopics: { topicId: string }[];
  postTags: { tagId: string }[];
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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getDescendants(
  topicId: string,
  allTopics: TopicForForm[],
): TopicForForm[] {
  const children = allTopics.filter((t) => t.parentId === topicId);
  if (children.length === 0) return [];
  return [
    ...children,
    ...children.flatMap((c) => getDescendants(c.id, allTopics)),
  ];
}

// ─── TopicChip ─────────────────────────────────────────────────────────────────

function TopicChip({
  topic,
  selected,
  onToggle,
  showX = false,
}: {
  topic: TopicForForm;
  selected: boolean;
  onToggle: (id: string) => void;
  showX?: boolean;
}) {
  const style: React.CSSProperties =
    selected && topic.colorHex
      ? { backgroundColor: topic.colorHex, color: topic.textColorHex ?? "#fff" }
      : selected
        ? {
            backgroundColor: "hsl(var(--foreground))",
            color: "hsl(var(--background))",
          }
        : {};

  return (
    <button
      type="button"
      onClick={() => onToggle(topic.id)}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
        selected
          ? "border-transparent"
          : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      }`}
      style={style}
    >
      {topic.nameKo}
      {showX && <X className="h-3 w-3 opacity-70" />}
    </button>
  );
}

// ─── PostForm 컴포넌트 ──────────────────────────────────────────────────────────

export function PostForm({
  mode,
  postId,
  initialData,
  allTags,
  allTopics,
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

  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(initialData?.postTags.map((pt) => pt.tagId) ?? []),
  );
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(
    new Set(initialData?.postTopics.map((pt) => pt.topicId) ?? []),
  );

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
  const [topicSearch, setTopicSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  // ── 파생값 ─────────────────────────────────────────────────────────────────
  const rootTopics = useMemo(
    () => allTopics.filter((t) => t.level === 0),
    [allTopics],
  );
  const selectedTopics = useMemo(
    () => allTopics.filter((t) => selectedTopicIds.has(t.id)),
    [allTopics, selectedTopicIds],
  );
  const level1Sections = useMemo(() => {
    if (!selectedCategoryId) return [];
    return allTopics.filter((t) => t.parentId === selectedCategoryId);
  }, [allTopics, selectedCategoryId]);
  const topicSearchResults = useMemo(() => {
    if (!topicSearch.trim()) return [];
    return allTopics.filter((t) => t.nameKo.includes(topicSearch) && t.level >= 2);
  }, [allTopics, topicSearch]);
  const tagsByGroup = useMemo(
    () =>
      allTags.reduce<Record<string, TagForForm[]>>((acc, tag) => {
        if (!acc[tag.group]) acc[tag.group] = [];
        acc[tag.group].push(tag);
        return acc;
      }, {}),
    [allTags],
  );
  const groupsWithTags = useMemo(
    () => Object.keys(tagsByGroup).filter((g) => (tagsByGroup[g]?.length ?? 0) > 0),
    [tagsByGroup],
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
  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
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
      if (selectedTopicIds.size === 0) missing.push("토픽 1개 이상");
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
      topicIds: Array.from(selectedTopicIds),
      tagIds: Array.from(selectedTagIds),
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

            {isEdit && postId && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/admin/posts/${postId}/preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  미리보기
                </a>
              </Button>
            )}

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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    제목
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

                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="titleEn">
                        영어 제목 <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="titleEn"
                        value={titleEn}
                        onChange={(e) => setTitleEn(e.target.value)}
                        placeholder="예: Jungkook's Favorite Café in Hongdae"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="subtitleKo">한국어 부제목</Label>
                      <Input
                        id="subtitleKo"
                        value={subtitleKo}
                        onChange={(e) => setSubtitleKo(e.target.value)}
                        placeholder="짧은 소개 문구"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="subtitleEn">영어 부제목</Label>
                      <Input
                        id="subtitleEn"
                        value={subtitleEn}
                        onChange={(e) => setSubtitleEn(e.target.value)}
                        placeholder="Short description"
                      />
                    </div>
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
                </CardContent>
              </Card>

              {/* ── 섹션 2: Spot Insight (항상 표시) ──────────────────────── */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Spot Insight
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedPlace && (
                    <p className="text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
                      오른쪽에서 장소를 연결하면 장소와 함께 저장됩니다. 장소 없이도 인사이트 내용을 미리 입력할 수 있습니다.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="contextEn">Context (English)</Label>
                      <Textarea
                        id="contextEn"
                        value={contextEn}
                        onChange={(e) => setContextEn(e.target.value)}
                        rows={3}
                        placeholder="Introduction about this place (English)"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                      <Label htmlFor="mustTryEn">Must-try (English)</Label>
                      <Textarea
                        id="mustTryEn"
                        value={mustTryEn}
                        onChange={(e) => setMustTryEn(e.target.value)}
                        rows={2}
                        placeholder="What you must try here"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                    <div className="space-y-1.5">
                      <Label htmlFor="tipEn">Tip (English)</Label>
                      <Textarea
                        id="tipEn"
                        value={tipEn}
                        onChange={(e) => setTipEn(e.target.value)}
                        rows={2}
                        placeholder="Visiting tips"
                      />
                    </div>
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


                </CardContent>
              </Card>

              {/* ── 섹션 3: Story (본문) ────────────────────────────────────── */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Story
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4" data-color-mode="light">
                    <div className="space-y-1.5">
                      <Label>본문 (한국어)</Label>
                      <MDEditor
                        value={bodyKo}
                        onChange={(v) => setBodyKo(v ?? "")}
                        height={400}
                        preview="edit"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>본문 (English)</Label>
                      <MDEditor
                        value={bodyEn}
                        onChange={(v) => setBodyEn(v ?? "")}
                        height={400}
                        preview="edit"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── 섹션 4: 출처 ───────────────────────────────────────────── */}
              <Card>
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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

              {/* ── 장소 카드 ──────────────────────────────────────────────── */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
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

              {/* ── 태그 카드 ──────────────────────────────────────────────── */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      태그
                    </CardTitle>
                    {selectedTagIds.size > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {selectedTagIds.size}개 선택
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {groupsWithTags.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      등록된 태그가 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {groupsWithTags.map((group) => (
                        <div key={group}>
                          <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                            {group}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {tagsByGroup[group]!.map((tag) => {
                              const checked = selectedTagIds.has(tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => toggleTag(tag.id)}
                                  className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-all ${
                                    checked
                                      ? "border-transparent"
                                      : "border-border bg-background text-muted-foreground hover:border-foreground/30"
                                  }`}
                                  style={
                                    checked && tag.colorHex
                                      ? {
                                          backgroundColor: tag.colorHex,
                                          color: "#fff",
                                          borderColor: tag.colorHex,
                                        }
                                      : checked
                                        ? {
                                            backgroundColor: "hsl(var(--foreground))",
                                            color: "hsl(var(--background))",
                                          }
                                        : {}
                                  }
                                >
                                  {tag.nameKo}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── 토픽 카드 ──────────────────────────────────────────────── */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      토픽
                    </CardTitle>
                    {selectedTopicIds.size > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {selectedTopicIds.size}개 선택
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {allTopics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      등록된 토픽이 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedTopics.length > 0 && (
                        <>
                          <div className="flex flex-wrap gap-1">
                            {selectedTopics.map((t) => (
                              <TopicChip
                                key={t.id}
                                topic={t}
                                selected
                                onToggle={toggleTopic}
                                showX
                              />
                            ))}
                          </div>
                          <Separator />
                        </>
                      )}

                      <Input
                        placeholder="토픽 검색..."
                        value={topicSearch}
                        onChange={(e) => {
                          setTopicSearch(e.target.value);
                          if (e.target.value) setSelectedCategoryId(null);
                        }}
                        className="h-8 text-sm"
                      />

                      {topicSearch ? (
                        topicSearchResults.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            검색 결과가 없습니다.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {topicSearchResults.map((t) => (
                              <TopicChip
                                key={t.id}
                                topic={t}
                                selected={selectedTopicIds.has(t.id)}
                                onToggle={toggleTopic}
                              />
                            ))}
                          </div>
                        )
                      ) : (
                        <>
                          {rootTopics.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {rootTopics.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedCategoryId((prev) =>
                                      prev === cat.id ? null : cat.id,
                                    )
                                  }
                                  className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-all ${
                                    selectedCategoryId === cat.id
                                      ? "border-transparent bg-foreground text-background"
                                      : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                                  }`}
                                >
                                  {cat.nameKo}
                                </button>
                              ))}
                            </div>
                          )}
                          {selectedCategoryId ? (
                            level1Sections.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                하위 토픽이 없습니다.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {level1Sections.map((l1) => {
                                  const descendants = getDescendants(
                                    l1.id,
                                    allTopics,
                                  );
                                  return (
                                    <div key={l1.id} className="space-y-1">
                                      <span className="text-xs font-medium text-muted-foreground">
                                        {l1.nameKo}
                                      </span>
                                      {descendants.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pl-3">
                                          {descendants.map((t) => (
                                            <TopicChip
                                              key={t.id}
                                              topic={t}
                                              selected={selectedTopicIds.has(t.id)}
                                              onToggle={toggleTopic}
                                            />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              카테고리를 선택하거나 검색해서 토픽을 추가하세요.
                            </p>
                          )}
                        </>
                      )}
                    </div>
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
    </div>
  );
}
