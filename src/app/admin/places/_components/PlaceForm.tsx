"use client";

import { useCallback, useMemo, useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ExternalLink,
  Loader2,
  Map,
  MapPin,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import type { PlaceStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlaceSearchDialog,
  type PlaceSelectResult,
} from "@/components/maps/PlaceSearchDialog";
import { MapPreview } from "@/components/maps/MapPreview";
import type { PlaceFormData } from "../actions";

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

export type PlaceInitialData = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  addressKo: string | null;
  addressEn: string | null;
  country: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  naverMapsUrl: string | null;
  kakaoMapsUrl: string | null;
  phone: string | null;
  operatingHours: string[] | null;
  status: PlaceStatus;
  isVerified: boolean;
  placeTags: { tagId: string }[];
  placeTopics: { topicId: string }[];
};

interface PlaceFormProps {
  initialData?: PlaceInitialData;
  allTags: TagForForm[];
  allTopics: TopicForForm[];
  onSubmit: (data: PlaceFormData) => Promise<{ error?: string }>;
  submitLabel: string;
}

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "KR", label: "한국" },
  { code: "JP", label: "일본" },
  { code: "US", label: "미국" },
  { code: "TW", label: "대만" },
  { code: "CN", label: "중국" },
  { code: "HK", label: "홍콩" },
  { code: "SG", label: "싱가포르" },
  { code: "TH", label: "태국" },
  { code: "FR", label: "프랑스" },
  { code: "GB", label: "영국" },
];


const STATUS_LABELS: Record<PlaceStatus, string> = {
  OPEN: "영업중",
  CLOSED_TEMP: "임시휴업",
  CLOSED_PERMANENT: "폐업",
};

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

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

// ─── 토픽 칩 ───────────────────────────────────────────────────────────────────

interface TopicChipProps {
  topic: TopicForForm;
  selected: boolean;
  onToggle: (id: string) => void;
  showX?: boolean;
}

function TopicChip({
  topic,
  selected,
  onToggle,
  showX = false,
}: TopicChipProps) {
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

// ─── 컴포넌트 ──────────────────────────────────────────────────────────────────

export function PlaceForm({
  initialData,
  allTags,
  allTopics,
  onSubmit,
  submitLabel,
}: PlaceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEdit = !!initialData;
  const pageTitle = isEdit ? "장소 수정" : "새 장소 등록";

  // ── 폼 상태 ────────────────────────────────────────────────────────────────
  const [nameKo, setNameKo] = useState(initialData?.nameKo ?? "");
  const [nameEn, setNameEn] = useState(initialData?.nameEn ?? "");
  const [addressKo, setAddressKo] = useState(initialData?.addressKo ?? "");
  const [addressEn, setAddressEn] = useState(initialData?.addressEn ?? "");
  const [country, setCountry] = useState(initialData?.country ?? "KR");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [latitude, setLatitude] = useState<number | null>(
    initialData?.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialData?.longitude ?? null,
  );
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(
    initialData?.googlePlaceId ?? null,
  );
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    initialData?.googleMapsUrl ?? "",
  );
  const [naverMapsUrl, setNaverMapsUrl] = useState(
    initialData?.naverMapsUrl ?? "",
  );
  const [kakaoMapsUrl, setKakaoMapsUrl] = useState(
    initialData?.kakaoMapsUrl ?? "",
  );
  const [googleSearchDone, setGoogleSearchDone] = useState(
    !!initialData?.googlePlaceId,
  );
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [operatingHours, setOperatingHours] = useState<string[]>(
    initialData?.operatingHours ?? [],
  );
  const [status, setStatus] = useState<PlaceStatus>(
    initialData?.status ?? "OPEN",
  );
  const [isVerified, setIsVerified] = useState(
    initialData?.isVerified ?? false,
  );
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(initialData?.placeTags.map((pt) => pt.tagId) ?? []),
  );
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(
    new Set(initialData?.placeTopics.map((pt) => pt.topicId) ?? []),
  );

  // ── UI 상태 ────────────────────────────────────────────────────────────────
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [topicSearch, setTopicSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  // ── 파생값 ─────────────────────────────────────────────────────────────────
  const hasLocation =
    !!addressKo || (latitude !== null && longitude !== null);

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

  const searchResults = useMemo(() => {
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

  // ── 핸들러 ─────────────────────────────────────────────────────────────────

  const handlePlaceSelect = useCallback((place: PlaceSelectResult) => {
    setNameKo(place.name);
    setAddressKo(place.address);
    if (place.nameEn) setNameEn(place.nameEn);
    if (place.addressEn) setAddressEn(place.addressEn);
    if (place.phone) setPhone(place.phone);
    if (place.operatingHours.length) setOperatingHours(place.operatingHours);
    setGoogleMapsUrl(place.googleMapsUrl);
    setLatitude(place.lat);
    setLongitude(place.lng);
    setGooglePlaceId(place.googlePlaceId);
    if (place.status) setStatus(place.status);
    setGoogleSearchDone(true);
  }, []);

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

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryId((prev) =>
      prev === categoryId ? null : categoryId,
    );
  };

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();

    if (!nameKo.trim()) {
      toast.error("한국어 장소명을 입력해주세요.");
      return;
    }
    if (!nameEn.trim()) {
      toast.error("영어 장소명을 입력해주세요.");
      return;
    }
    if (!country) {
      toast.error("나라를 선택해주세요.");
      return;
    }

    const data: PlaceFormData = {
      nameKo: nameKo.trim(),
      nameEn: nameEn.trim(),
      addressKo: addressKo.trim(),
      addressEn: addressEn.trim(),
      country,
      city: city.trim(),
      latitude,
      longitude,
      googlePlaceId,
      googleMapsUrl: googleMapsUrl.trim() || null,
      naverMapsUrl: naverMapsUrl.trim() || null,
      kakaoMapsUrl: kakaoMapsUrl.trim() || null,
      phone: phone.trim(),
      operatingHours: operatingHours.filter((l) => l.trim()).length
        ? operatingHours.filter((l) => l.trim())
        : null,
      status,
      isVerified,
      tagIds: Array.from(selectedTagIds),
      topicIds: Array.from(selectedTopicIds),
    };

    startTransition(async () => {
      const result = await onSubmit(data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          isEdit ? "장소가 수정되었습니다." : "장소가 등록되었습니다.",
        );
        router.push("/admin/places");
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
        {/* ── 상단 sticky 액션바 ─────────────────────────────────────────────── */}
        <div className="sticky top-0 z-40 shrink-0 border-b bg-background">
          <div className="flex h-14 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/places"
                className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-base font-semibold">{pageTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/places">취소</Link>
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                {submitLabel}
              </Button>
            </div>
          </div>
        </div>

        {/* ── 2컬럼 바디 ─────────────────────────────────────────────────────── */}
        <div className="flex-1 px-6 py-6">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid grid-cols-[1fr_400px] gap-6 items-start">

              {/* ── 왼쪽: 장소 정보 ─────────────────────────────────────────── */}
              <div className="space-y-5">

                {/* STEP 1: 장소 검색 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        장소 검색
                      </CardTitle>
                      {hasLocation && (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => setSearchDialogOpen(true)}
                          >
                            <RotateCcw className="h-3 w-3" />
                            재검색
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => setMapDialogOpen(true)}
                          >
                            <Map className="h-3 w-3" />
                            지도 보기
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!hasLocation ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-10">
                        <p className="text-sm text-muted-foreground">
                          구글 맵스에서 장소를 검색하면 이름·주소·전화번호·영업시간이 자동으로 채워집니다.
                        </p>
                        <Button
                          type="button"
                          onClick={() => setSearchDialogOpen(true)}
                          className="gap-2"
                        >
                          <Search className="h-4 w-4" />
                          구글 맵스에서 검색
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1.5">
                        {addressKo && (
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <p className="text-sm font-medium">{addressKo}</p>
                          </div>
                        )}
                        {addressEn && (
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">
                              {addressEn}
                            </p>
                          </div>
                        )}
                        {latitude !== null && longitude !== null && (
                          <p className="pl-5 text-xs text-muted-foreground/60">
                            {latitude.toFixed(6)}, {longitude.toFixed(6)}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* STEP 2: 기본 정보 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      기본 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* 장소명 한/영 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="nameKo">
                          한국어 장소명 <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="nameKo"
                          value={nameKo}
                          onChange={(e) => setNameKo(e.target.value)}
                          placeholder="예: 방탄소년단 방문 카페"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="nameEn">
                          영어 장소명 <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="nameEn"
                          value={nameEn}
                          onChange={(e) => setNameEn(e.target.value)}
                          placeholder="위치 검색 시 자동 입력"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* 주소 */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">주소</Label>
                      <div className="space-y-2.5">
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="addressKo"
                            className="text-xs text-muted-foreground"
                          >
                            한국어 주소
                          </Label>
                          <Input
                            id="addressKo"
                            value={addressKo}
                            onChange={(e) => setAddressKo(e.target.value)}
                            placeholder="위치 검색 시 자동 입력"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="addressEn"
                            className="text-xs text-muted-foreground"
                          >
                            영문 주소
                          </Label>
                          <Input
                            id="addressEn"
                            value={addressEn}
                            onChange={(e) => setAddressEn(e.target.value)}
                            placeholder="위치 검색 시 자동 입력"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="latitude"
                              className="text-xs text-muted-foreground"
                            >
                              위도 (Latitude)
                            </Label>
                            <Input
                              id="latitude"
                              type="number"
                              step="any"
                              value={latitude ?? ""}
                              onChange={(e) =>
                                setLatitude(
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                )
                              }
                              placeholder="37.5665"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label
                              htmlFor="longitude"
                              className="text-xs text-muted-foreground"
                            >
                              경도 (Longitude)
                            </Label>
                            <Input
                              id="longitude"
                              type="number"
                              step="any"
                              value={longitude ?? ""}
                              onChange={(e) =>
                                setLongitude(
                                  e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                )
                              }
                              placeholder="126.9780"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* 나라 / 도시 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="country">
                          나라 <span className="text-destructive">*</span>
                        </Label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger id="country">
                            <SelectValue placeholder="나라 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.label} ({c.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="city">도시</Label>
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="예: 서울, 부산"
                        />
                      </div>
                    </div>

                    {/* 전화번호 */}
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">전화번호</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="예: 02-1234-5678"
                      />
                      {googleSearchDone && !phone && (
                        <p className="text-xs text-muted-foreground">
                          구글 맵스에 등록된 전화번호 없음
                        </p>
                      )}
                    </div>

                    {/* 지도 링크 */}
                    <div className="space-y-2">
                      <Label>지도 링크</Label>
                      <div className="space-y-2">
                        <div className="flex gap-1.5">
                          <Input
                            value={googleMapsUrl}
                            onChange={(e) => setGoogleMapsUrl(e.target.value)}
                            placeholder="Google Maps URL"
                          />
                          {googleMapsUrl && (
                            <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <Input
                            value={naverMapsUrl}
                            onChange={(e) => setNaverMapsUrl(e.target.value)}
                            placeholder="네이버 지도 URL"
                          />
                          {naverMapsUrl && (
                            <a href={naverMapsUrl} target="_blank" rel="noopener noreferrer">
                              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                        <div className="flex gap-1.5">
                          <Input
                            value={kakaoMapsUrl}
                            onChange={(e) => setKakaoMapsUrl(e.target.value)}
                            placeholder="카카오 지도 URL"
                          />
                          {kakaoMapsUrl && (
                            <a href={kakaoMapsUrl} target="_blank" rel="noopener noreferrer">
                              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* STEP 3: 운영 정보 */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      운영 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-8">
                      <div className="w-48 space-y-1.5">
                        <Label htmlFor="status">영업 상태</Label>
                        <Select
                          value={status}
                          onValueChange={(v) => setStatus(v as PlaceStatus)}
                        >
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(STATUS_LABELS) as PlaceStatus[]).map(
                              (s) => (
                                <SelectItem key={s} value={s}>
                                  {STATUS_LABELS[s]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <Switch
                          id="isVerified"
                          checked={isVerified}
                          onCheckedChange={setIsVerified}
                        />
                        <Label htmlFor="isVerified" className="cursor-pointer">
                          검증된 장소
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>영업시간</Label>
                      <Textarea
                        value={operatingHours.join("\n")}
                        onChange={(e) =>
                          setOperatingHours(e.target.value.split("\n"))
                        }
                        rows={7}
                        className="text-sm font-mono resize-none"
                        placeholder="한 줄에 하나씩 입력&#10;예) 월요일: 09:00 - 22:00"
                      />
                      {googleSearchDone && operatingHours.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          구글 맵스에 등록된 영업시간 없음
                        </p>
                      )}
                      {operatingHours.length > 0 && googleSearchDone && (
                        <p className="text-xs text-muted-foreground">
                          구글 맵스에서 자동으로 가져왔습니다.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* ── 오른쪽: 태그 · 토픽 (sticky) ──────────────────────────── */}
              <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto space-y-5 pb-6">

                {/* 태그 */}
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
                  <CardContent>
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
                              {/* 그룹 헤더 */}
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-semibold text-muted-foreground">
                                  {group}
                                </p>
                                {(() => {
                                  const count = tagsByGroup[group]?.filter(
                                    (t) => selectedTagIds.has(t.id),
                                  ).length ?? 0;
                                  return count > 0 ? (
                                    <span className="text-xs text-muted-foreground">
                                      {count}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                              {/* 태그 칩 */}
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
                  </CardContent>
                </Card>

                {/* 토픽 */}
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
                      <>
                        {/* 선택된 토픽 */}
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

                        {/* 검색 */}
                        <Input
                          placeholder="토픽 검색..."
                          value={topicSearch}
                          onChange={(e) => {
                            setTopicSearch(e.target.value);
                            if (e.target.value) setSelectedCategoryId(null);
                          }}
                          className="h-8 text-sm"
                        />

                        {/* 검색 결과 */}
                        {topicSearch ? (
                          <div>
                            {searchResults.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                검색 결과가 없습니다.
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {searchResults.map((t) => (
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
                        ) : (
                          <>
                            {/* 카테고리 필터 (level-0) */}
                            {rootTopics.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {rootTopics.map((cat) => (
                                  <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleCategory(cat.id)}
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

                            {/* 카테고리 하위 토픽 */}
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
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 위치 검색 Dialog */}
      <PlaceSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSelect={handlePlaceSelect}
      />

      {/* 지도 보기 Dialog */}
      {latitude !== null && longitude !== null && (
        <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
          <DialogContent className="max-w-2xl p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-4">
              <DialogTitle>{addressKo || "지도 보기"}</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6">
              <MapPreview
                key={`map-${latitude}-${longitude}`}
                lat={latitude}
                lng={longitude}
                height={420}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
