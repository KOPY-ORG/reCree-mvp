"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import type { PlaceStatus, TagGroup } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  PlaceSearchInput,
  type PlaceSelectResult,
} from "@/components/maps/PlaceSearchInput";
import { MapPreview } from "@/components/maps/MapPreview";
import type { PlaceFormData } from "../actions";

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export type TagForForm = {
  id: string;
  nameKo: string;
  group: TagGroup;
  colorHex: string | null;
};

export type TopicForForm = {
  id: string;
  nameKo: string;
  level: number;
  parentId: string | null;
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

const TAG_GROUP_LABELS: Record<TagGroup, string> = {
  FOOD: "음식",
  SPOT: "스팟",
  EXPERIENCE: "체험",
  ITEM: "아이템",
  BEAUTY: "뷰티",
};

const STATUS_LABELS: Record<PlaceStatus, string> = {
  OPEN: "영업중",
  CLOSED_TEMP: "임시휴업",
  CLOSED_PERMANENT: "폐업",
};

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

  // 폼 상태
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
  const [topicSearch, setTopicSearch] = useState("");

  // Google Maps 장소 선택 핸들러
  const handlePlaceSelect = (place: PlaceSelectResult) => {
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
  };

  // 태그 토글
  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId);
      else next.add(tagId);
      return next;
    });
  };

  // 토픽 토글
  const toggleTopic = (topicId: string) => {
    setSelectedTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  // 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
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
      phone: phone.trim(),
      operatingHours: operatingHours.length ? operatingHours : null,
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
          initialData ? "장소가 수정되었습니다." : "장소가 등록되었습니다.",
        );
        router.push("/admin/places");
      }
    });
  };

  // 태그 그룹별 분류
  const tagsByGroup = allTags.reduce<Partial<Record<TagGroup, TagForForm[]>>>(
    (acc, tag) => {
      if (!acc[tag.group]) acc[tag.group] = [];
      acc[tag.group]!.push(tag);
      return acc;
    },
    {},
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 섹션 A: 위치 검색 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          위치 검색
        </h2>
        <div className="rounded-lg border p-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Google Maps 검색</Label>
            <PlaceSearchInput
              onSelect={handlePlaceSelect}
              defaultValue={initialData?.nameKo ?? ""}
              placeholder="장소명, 주소로 검색..."
            />
            <p className="text-xs text-muted-foreground">
              장소를 선택하면 <strong>한국어명/주소, 영어명/주소</strong>, 좌표가 자동으로 입력됩니다.
            </p>
          </div>

          {latitude !== null && longitude !== null && (
            <MapPreview
              key={`${latitude}-${longitude}`}
              lat={latitude}
              lng={longitude}
              height={200}
            />
          )}
        </div>
      </section>

      {/* 섹션 B: 기본 정보 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          기본 정보
        </h2>
        <div className="rounded-lg border p-4 grid grid-cols-2 gap-4">
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
              placeholder="Google Maps 검색 시 자동 입력"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addressKo">한국어 주소</Label>
            <Input
              id="addressKo"
              value={addressKo}
              onChange={(e) => setAddressKo(e.target.value)}
              placeholder="예: 서울특별시 강남구 ..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addressEn">영어 주소</Label>
            <Input
              id="addressEn"
              value={addressEn}
              onChange={(e) => setAddressEn(e.target.value)}
              placeholder="Google Maps 검색 시 자동 입력"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">전화번호</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="구글 맵스 검색 시 자동 입력"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="googleMapsUrl">Google Maps 링크</Label>
            <Input
              id="googleMapsUrl"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="구글 맵스 검색 시 자동 입력"
            />
          </div>
          {operatingHours.length > 0 && (
            <div className="col-span-2 space-y-1.5">
              <Label>영업시간</Label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 space-y-0.5">
                {operatingHours.map((line, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {line}
                  </p>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                구글 맵스에서 자동 가져옴. 수정이 필요하면 장소를 다시 검색하세요.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 섹션 C: 위치 정보 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          위치 정보
        </h2>
        <div className="rounded-lg border p-4 grid grid-cols-2 gap-4">
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
          <div className="space-y-1.5">
            <Label htmlFor="latitude">위도 (Latitude)</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={latitude ?? ""}
              onChange={(e) =>
                setLatitude(e.target.value ? Number(e.target.value) : null)
              }
              placeholder="Google Maps 검색 시 자동 입력"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="longitude">경도 (Longitude)</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={longitude ?? ""}
              onChange={(e) =>
                setLongitude(e.target.value ? Number(e.target.value) : null)
              }
              placeholder="Google Maps 검색 시 자동 입력"
            />
          </div>
        </div>
      </section>

      {/* 섹션 D-1: 태그 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          태그
        </h2>
        <div className="rounded-lg border p-4 space-y-4">
          {Object.keys(tagsByGroup).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 태그가 없습니다.
            </p>
          ) : (
            (Object.keys(tagsByGroup) as TagGroup[]).map((group) => (
              <div key={group} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {TAG_GROUP_LABELS[group] ?? group}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tagsByGroup[group]!.map((tag) => {
                    const checked = selectedTagIds.has(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
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
            ))
          )}
        </div>
      </section>

      {/* 섹션 D-2: 토픽 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          토픽
        </h2>
        <div className="rounded-lg border p-4 space-y-3">
          {allTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              등록된 토픽이 없습니다.
            </p>
          ) : (
            <>
              <Input
                placeholder="토픽 검색..."
                value={topicSearch}
                onChange={(e) => setTopicSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="max-h-72 overflow-y-auto flex flex-col">
                {(topicSearch
                  ? allTopics.filter((t) =>
                      t.nameKo.includes(topicSearch),
                    )
                  : allTopics
                ).map((topic) => {
                  const checked = selectedTopicIds.has(topic.id);
                  return (
                    <label
                      key={topic.id}
                      className={`flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-muted/50 transition-colors ${
                        topic.level === 0
                          ? "bg-muted/30 font-medium text-sm"
                          : "text-sm"
                      }`}
                      style={
                        !topicSearch && topic.level > 0
                          ? { paddingLeft: `${8 + topic.level * 16}px` }
                          : undefined
                      }
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTopic(topic.id)}
                        className="rounded border-input shrink-0"
                      />
                      <span>{topic.nameKo}</span>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 섹션 E: 상태 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          상태
        </h2>
        <div className="rounded-lg border p-4 flex items-center gap-8">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="status">영업 상태</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as PlaceStatus)}
            >
              <SelectTrigger id="status" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as PlaceStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
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
      </section>

      {/* 하단 액션 */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="ghost" asChild>
          <Link href="/admin/places">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            목록으로
          </Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
