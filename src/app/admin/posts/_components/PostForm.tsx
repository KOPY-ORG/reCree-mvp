"use client";

import {
  useCallback,
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
  Search,
  X,
  Upload,
  Plus,
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
import { createClient } from "@/lib/supabase/client";
import {
  checkPostSlug,
  searchPlaces,
  type PostFormData,
  type SpotInsightData,
} from "../_actions/post-actions";

// 마크다운 에디터: SSR 불가 → 동적 임포트
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

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
  source: string | null;
  postTopics: { topicId: string }[];
  postTags: { tagId: string }[];
  postPlaces: {
    placeId: string;
    placeNameKo?: string;
    context: string | null;
    vibe: string[];
    mustTry: string | null;
    tip: string | null;
    reference: string | null;
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

  // ── 초기값 ─────────────────────────────────────────────────────────────────
  const initPlace =
    initialData?.postPlaces?.[0] ?? null;

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
  const [source, setSource] = useState(initialData?.source ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(initialData?.postTags.map((pt) => pt.tagId) ?? []),
  );
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(
    new Set(initialData?.postTopics.map((pt) => pt.topicId) ?? []),
  );

  // ── Spot Insight 상태 ───────────────────────────────────────────────────────
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(
    initPlace?.placeId ?? "",
  );
  const [selectedPlaceName, setSelectedPlaceName] = useState<string>(
    initPlace?.placeNameKo ?? "",
  );
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
  const [reference, setReference] = useState(initPlace?.reference ?? "");

  // ── UI 상태 ─────────────────────────────────────────────────────────────────
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "ok" | "error"
  >("idle");
  const [slugManual, setSlugManual] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState<PlaceForForm[]>([]);
  const [placeSearching, setPlaceSearching] = useState(false);
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
    return allTopics.filter((t) => t.nameKo.includes(topicSearch));
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

  // ── 장소 검색 ──────────────────────────────────────────────────────────────
  const placeSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePlaceSearch = useCallback((keyword: string) => {
    setPlaceSearch(keyword);
    if (!keyword.trim()) {
      setPlaceResults([]);
      return;
    }
    if (placeSearchTimerRef.current) clearTimeout(placeSearchTimerRef.current);
    setPlaceSearching(true);
    placeSearchTimerRef.current = setTimeout(async () => {
      const results = await searchPlaces(keyword);
      setPlaceResults(results);
      setPlaceSearching(false);
    }, 300);
  }, []);

  const handlePlaceSelect = useCallback((place: PlaceForForm) => {
    setSelectedPlaceId(place.id);
    setSelectedPlaceName(place.nameKo);
    setPlaceSearch("");
    setPlaceResults([]);
  }, []);

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
        console.error("업로드 에러:", error);
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

  // ── 제출 ───────────────────────────────────────────────────────────────────
  const isImportedState = status === "IMPORTED" || status === "AI_DRAFTED";

  const handleSubmit = (targetStatus?: PostStatus) => {
    const finalStatus = targetStatus ?? status;

    // IMPORTED / AI_DRAFTED 상태가 아닐 때만 필수 검증
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

    // 발행 시 추가 필수 항목 클라이언트 체크
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

    const spotInsight: SpotInsightData | null = selectedPlaceId
      ? {
          placeId: selectedPlaceId,
          contextKo,
          contextEn,
          vibe,
          mustTryKo,
          mustTryEn,
          tipKo,
          tipEn,
          reference,
        }
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
      source: source.trim(),
      topicIds: Array.from(selectedTopicIds),
      tagIds: Array.from(selectedTagIds),
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
            {/* IMPORTED / AI_DRAFTED 상태 배지 */}
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

            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/posts">취소</Link>
            </Button>

            {/* AI_DRAFTED: DRAFT로 변환 버튼 */}
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

            {/* IMPORTED / AI_DRAFTED에서는 발행 버튼 비활성 */}
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
        <div className="mx-auto max-w-[1400px] space-y-6">

          {/* ── 섹션 1: 제목 ──────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                제목
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

          {/* ── 섹션 2: Spot Insight ─────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Spot Insight
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 장소 검색 */}
              <div className="space-y-1.5">
                <Label>연결 장소</Label>
                {selectedPlaceId ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {selectedPlaceName || "장소 선택됨"}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => {
                        setSelectedPlaceId("");
                        setSelectedPlaceName("");
                      }}
                    >
                      <X className="h-3 w-3 mr-1" />
                      변경
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          value={placeSearch}
                          onChange={(e) => handlePlaceSearch(e.target.value)}
                          placeholder="장소명으로 검색..."
                          className="pl-9"
                        />
                      </div>
                      {placeSearching && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground self-center shrink-0" />
                      )}
                    </div>
                    {placeResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-md">
                        {placeResults.map((place) => (
                          <button
                            key={place.id}
                            type="button"
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                            onClick={() => handlePlaceSelect(place)}
                          >
                            <div className="font-medium">{place.nameKo}</div>
                            {place.addressKo && (
                              <div className="text-xs text-muted-foreground">
                                {place.addressKo}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedPlaceId && (
                <>
                  <Separator />

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

                  {/* Reference */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reference">레퍼런스 출처</Label>
                    <Input
                      id="reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="예: 무한도전 2023.03.15 방송"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* ── 섹션 3: 본문 ─────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                본문
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

          {/* ── 섹션 4: 메타데이터 ───────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                메타데이터
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 cursor-pointer hover:bg-muted/30 transition-colors">
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

              {/* 태그 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>태그</Label>
                  {selectedTagIds.size > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedTagIds.size}개 선택
                    </span>
                  )}
                </div>
                {groupsWithTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    등록된 태그가 없습니다.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {groupsWithTags.map((group, i) => {
                      const isLastOdd =
                        groupsWithTags.length % 2 === 1 &&
                        i === groupsWithTags.length - 1;
                      return (
                        <div
                          key={group}
                          className={`rounded-lg border p-3 ${isLastOdd ? "col-span-2" : ""}`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground">
                              {group}
                            </p>
                            {(() => {
                              const count =
                                tagsByGroup[group]?.filter((t) =>
                                  selectedTagIds.has(t.id),
                                ).length ?? 0;
                              return count > 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  {count}
                                </span>
                              ) : null;
                            })()}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {tagsByGroup[group]!.map((tag) => {
                              const checked = selectedTagIds.has(tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => toggleTag(tag.id)}
                                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
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
                                            backgroundColor:
                                              "hsl(var(--foreground))",
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
                      );
                    })}
                  </div>
                )}
              </div>

              <Separator />

              {/* 토픽 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>토픽</Label>
                  {selectedTopicIds.size > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {selectedTopicIds.size}개 선택
                    </span>
                  )}
                </div>
                {allTopics.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    등록된 토픽이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedTopics.length > 0 && (
                      <>
                        <div className="flex flex-wrap gap-1.5">
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
                        <div className="flex flex-wrap gap-1.5">
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
                          <div className="flex flex-wrap gap-1.5">
                            {rootTopics.map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() =>
                                  setSelectedCategoryId((prev) =>
                                    prev === cat.id ? null : cat.id,
                                  )
                                }
                                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
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
                            <div className="space-y-3">
                              {level1Sections.map((l1) => {
                                const descendants = getDescendants(
                                  l1.id,
                                  allTopics,
                                );
                                return (
                                  <div key={l1.id} className="space-y-1.5">
                                    <TopicChip
                                      topic={l1}
                                      selected={selectedTopicIds.has(l1.id)}
                                      onToggle={toggleTopic}
                                    />
                                    {descendants.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 pl-3">
                                        {descendants.map((t) => (
                                          <TopicChip
                                            key={t.id}
                                            topic={t}
                                            selected={selectedTopicIds.has(
                                              t.id,
                                            )}
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
                          <p className="text-sm text-muted-foreground">
                            카테고리를 선택하거나 검색해서 토픽을 추가하세요.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* 출처 */}
              <div className="space-y-1.5">
                <Label htmlFor="source">출처 (Source)</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="예: 유튜브, 인스타그램, 방송명..."
                  className="max-w-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
