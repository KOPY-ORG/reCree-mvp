"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, MapPin, Upload, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PlacePickerSheet } from "@/app/admin/posts/_components/PlacePickerSheet";
import type { PlaceForForm } from "@/app/admin/posts/_components/PostForm";
import { isExternalImage } from "@/lib/image";
import { getEventImagePresignedUrl } from "@/lib/actions/upload-actions";
import type { EventCategory, EventEntryType, EventStatus } from "@prisma/client";
import {
  EVENT_STATUS_LABELS,
  EVENT_CATEGORY_LABELS,
} from "../_constants";
import {
  createEvent,
  updateEvent,
  type EventFormData,
  type TranslationField,
} from "../_actions/event-actions";

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const ENTRY_TYPE_LABELS: Record<EventEntryType, string> = {
  WALK_IN: "현장 입장",
  RESERVATION: "예약 필요",
  TICKET: "티켓 필요",
};

const TABS = [
  { id: "info", label: "기본 정보" },
  { id: "translations", label: "번역" },
  { id: "perks", label: "혜택" },
  { id: "body", label: "본문" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const LOCALES = [
  { key: "ko", label: "한국어", required: true },
  { key: "en", label: "English", required: true },
  { key: "zh-CN", label: "中文(简)", required: false },
  { key: "zh-TW", label: "中文(繁)", required: false },
  { key: "es", label: "Español", required: false },
  { key: "ja", label: "日本語", required: false },
] as const;

type EventLocale = (typeof LOCALES)[number]["key"];

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export type EventInitialData = {
  id: string;
  placeId: string;
  place: PlaceForForm | null;
  eventCollection: string;
  category: EventCategory;
  startDate: string;
  endDate: string;
  openTime: string;
  closeTime: string;
  entryType: EventEntryType;
  reservationUrl: string;
  officialUrl: string;
  snsUrl: string;
  bannerImageUrl: string | null;
  status: EventStatus;
  showOnHome: boolean;
  sortOrder: number;
  translations?: Partial<Record<string, TranslationField>>;
};

interface EventFormProps {
  mode: "create" | "edit";
  eventId?: string;
  initialData?: EventInitialData;
}

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────────

const emptyTranslation = (): TranslationField => ({
  name: "",
  eventContent: "",
  contentDetail: "",
  description: "",
  hoursNote: "",
});

function initTranslations(initial?: Partial<Record<string, TranslationField>>): Record<string, TranslationField> {
  const t: Record<string, TranslationField> = {};
  for (const loc of LOCALES) {
    t[loc.key] = initial?.[loc.key]
      ? { ...emptyTranslation(), ...initial[loc.key] }
      : emptyTranslation();
  }
  return t;
}

// ─── 배너 이미지 업로드 ────────────────────────────────────────────────────────

async function uploadBannerImage(file: File): Promise<{ url: string } | { error: string }> {
  const result = await getEventImagePresignedUrl(file.name, file.type, "banner");
  if ("error" in result) return result;
  const res = await fetch(result.presignedUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) return { error: `업로드 실패 (${res.status})` };
  return { url: result.cdnUrl };
}

// ─── EventForm ────────────────────────────────────────────────────────────────

export function EventForm({ mode, eventId, initialData }: EventFormProps) {
  const isEdit = mode === "edit";
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [activeLang, setActiveLang] = useState<EventLocale>("ko");
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 폼 state ────────────────────────────────────────────────────────────────
  const [selectedPlace, setSelectedPlace] = useState<PlaceForForm | null>(
    initialData?.place ?? null,
  );
  const [eventCollection, setEventCollection] = useState(initialData?.eventCollection ?? "");
  const [category, setCategory] = useState<EventCategory>(
    initialData?.category ?? "CONCERT",
  );
  const [startDate, setStartDate] = useState(initialData?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialData?.endDate ?? "");
  const [openTime, setOpenTime] = useState(initialData?.openTime ?? "");
  const [closeTime, setCloseTime] = useState(initialData?.closeTime ?? "");
  const [entryType, setEntryType] = useState<EventEntryType>(
    initialData?.entryType ?? "WALK_IN",
  );
  const [reservationUrl, setReservationUrl] = useState(initialData?.reservationUrl ?? "");
  const [officialUrl, setOfficialUrl] = useState(initialData?.officialUrl ?? "");
  const [snsUrl, setSnsUrl] = useState(initialData?.snsUrl ?? "");
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(
    initialData?.bannerImageUrl ?? null,
  );
  const [status, setStatus] = useState<EventStatus>(initialData?.status ?? "DRAFT");
  const [showOnHome, setShowOnHome] = useState(initialData?.showOnHome ?? false);
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder ?? 0);
  const [translations, setTranslations] = useState<Record<string, TranslationField>>(
    () => initTranslations(initialData?.translations),
  );

  // ── 번역 업데이트 ─────────────────────────────────────────────────────────────
  const updateTranslation = (locale: string, field: keyof TranslationField, value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [locale]: { ...prev[locale], [field]: value },
    }));
  };

  // ── 이미지 업로드 핸들러 ─────────────────────────────────────────────────────
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadBannerImage(file);
    setUploading(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      setBannerImageUrl(result.url);
      toast.success("배너 이미지가 업로드되었습니다.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── 제출 ───────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!selectedPlace) { toast.error("장소를 선택해주세요."); return; }
    if (!eventCollection.trim()) { toast.error("이벤트 컬렉션을 입력해주세요."); return; }
    if (!startDate || !endDate) { toast.error("기간을 입력해주세요."); return; }
    if (!translations.ko.name.trim()) { toast.error("한국어 이벤트명을 입력해주세요."); return; }
    if (!translations.en.name.trim()) { toast.error("영어 이벤트명을 입력해주세요."); return; }

    const data: EventFormData = {
      placeId: selectedPlace.id,
      eventCollection,
      category,
      startDate,
      endDate,
      openTime,
      closeTime,
      entryType,
      reservationUrl,
      officialUrl,
      snsUrl,
      bannerImageUrl,
      status,
      showOnHome,
      sortOrder,
      translations,
    };

    startTransition(async () => {
      const result = isEdit && eventId
        ? await updateEvent(eventId, data)
        : await createEvent(data);

      if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  // ── 렌더 ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-full flex-col">
      {/* Sticky 액션바 */}
      <div className="sticky top-0 z-40 shrink-0 border-b bg-background">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/events"
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-base font-semibold">
              {isEdit ? "이벤트 수정" : "이벤트 작성"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/events">취소</Link>
            </Button>
            <Button size="sm" disabled={isPending} onClick={handleSubmit}>
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              저장
            </Button>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 px-6 py-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-[1fr_320px] gap-6 items-start">

            {/* 왼쪽: 탭 카드 */}
            <div className="min-w-0">
              <Card className="gap-0 pb-0">
                {/* 탭 헤더 */}
                <div className="flex border-b px-2 pt-2">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        activeTab === tab.id
                          ? "border-foreground text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <CardContent className="p-6">
                  {/* 기본 정보 탭 */}
                  {activeTab === "info" && (
                    <div className="space-y-5">
                      {/* 이벤트 컬렉션 */}
                      <div className="space-y-1.5">
                        <Label>
                          이벤트 컬렉션 <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={eventCollection}
                          onChange={(e) => setEventCollection(e.target.value)}
                          placeholder="예: ARIRANG_BUSAN"
                        />
                        <p className="text-xs text-muted-foreground">
                          같은 행사를 묶는 식별자. 예: ARIRANG_BUSAN, ARIRANG_SEOUL
                        </p>
                      </div>

                      {/* 카테고리 */}
                      <div className="space-y-1.5">
                        <Label>
                          카테고리 <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={category}
                          onValueChange={(v) => setCategory(v as EventCategory)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(EVENT_CATEGORY_LABELS) as EventCategory[]).map((key) => (
                              <SelectItem key={key} value={key}>
                                {EVENT_CATEGORY_LABELS[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 기간 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>
                            시작일 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>
                            종료일 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* 운영 시간 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label>오픈 시간</Label>
                          <Input
                            type="time"
                            value={openTime}
                            onChange={(e) => setOpenTime(e.target.value)}
                            placeholder="13:00"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>마감 시간</Label>
                          <Input
                            type="time"
                            value={closeTime}
                            onChange={(e) => setCloseTime(e.target.value)}
                            placeholder="21:00"
                          />
                        </div>
                      </div>

                      {/* 참여 방법 */}
                      <div className="space-y-1.5">
                        <Label>참여 방법</Label>
                        <Select
                          value={entryType}
                          onValueChange={(v) => setEntryType(v as EventEntryType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(ENTRY_TYPE_LABELS) as EventEntryType[]).map((key) => (
                              <SelectItem key={key} value={key}>
                                {ENTRY_TYPE_LABELS[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 링크 */}
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label>예약 링크</Label>
                          <Input
                            value={reservationUrl}
                            onChange={(e) => setReservationUrl(e.target.value)}
                            placeholder="https://"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>공식 사이트</Label>
                          <Input
                            value={officialUrl}
                            onChange={(e) => setOfficialUrl(e.target.value)}
                            placeholder="https://"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>SNS 링크</Label>
                          <Input
                            value={snsUrl}
                            onChange={(e) => setSnsUrl(e.target.value)}
                            placeholder="https://"
                          />
                        </div>
                      </div>

                      {/* 배너 이미지 */}
                      <div className="space-y-1.5">
                        <Label>배너 이미지</Label>
                        {bannerImageUrl ? (
                          <div className="relative">
                            <div className="relative h-48 w-full overflow-hidden rounded-md border bg-muted">
                              <Image
                                src={bannerImageUrl}
                                alt="배너 이미지"
                                fill
                                unoptimized={isExternalImage(bannerImageUrl)}
                                className="object-cover"
                              />
                            </div>
                            <div className="mt-2 flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                              >
                                {uploading
                                  ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  : <Upload className="h-3 w-3 mr-1" />}
                                변경
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs text-destructive hover:text-destructive"
                                onClick={() => setBannerImageUrl(null)}
                              >
                                <X className="h-3 w-3 mr-1" />
                                제거
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="flex h-32 w-full items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
                          >
                            {uploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                클릭하여 업로드
                              </>
                            )}
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleBannerUpload}
                        />
                      </div>
                    </div>
                  )}

                  {/* 번역 탭 */}
                  {activeTab === "translations" && (
                    <div className="space-y-5">
                      {/* 언어 탭 */}
                      <div className="flex flex-wrap gap-1 border-b pb-0">
                        {LOCALES.map((loc) => (
                          <button
                            key={loc.key}
                            type="button"
                            onClick={() => setActiveLang(loc.key)}
                            className={`px-3 py-1.5 text-sm rounded-t-md border-b-2 -mb-px transition-colors ${
                              activeLang === loc.key
                                ? "border-foreground text-foreground font-medium"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {loc.label}
                            {loc.required && (
                              <span className="ml-0.5 text-red-500 text-xs">*</span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* 현재 언어 입력 필드 */}
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label>
                            이벤트명
                            {(activeLang === "ko" || activeLang === "en") && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </Label>
                          <Input
                            value={translations[activeLang]?.name ?? ""}
                            onChange={(e) => updateTranslation(activeLang, "name", e.target.value)}
                            placeholder="이벤트 이름"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>이벤트 내용</Label>
                          <Textarea
                            value={translations[activeLang]?.eventContent ?? ""}
                            onChange={(e) => updateTranslation(activeLang, "eventContent", e.target.value)}
                            placeholder="이벤트 주요 내용"
                            rows={3}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>상세 내용</Label>
                          <Textarea
                            value={translations[activeLang]?.contentDetail ?? ""}
                            onChange={(e) => updateTranslation(activeLang, "contentDetail", e.target.value)}
                            placeholder="상세 설명"
                            rows={3}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>설명</Label>
                          <Textarea
                            value={translations[activeLang]?.description ?? ""}
                            onChange={(e) => updateTranslation(activeLang, "description", e.target.value)}
                            placeholder="짧은 설명"
                            rows={2}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label>운영 시간 안내</Label>
                          <Input
                            value={translations[activeLang]?.hoursNote ?? ""}
                            onChange={(e) => updateTranslation(activeLang, "hoursNote", e.target.value)}
                            placeholder="예: 매일 13:00–21:00"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 준비 중 탭들 */}
                  {(activeTab === "perks" || activeTab === "body") && (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      {TABS.find((t) => t.id === activeTab)?.label} — 다음 단계에서 구현 예정
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 오른쪽: 사이드바 */}
            <div className="space-y-4">
              {/* 장소 */}
              <Card className="gap-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    장소 <span className="text-red-500 text-sm font-normal">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPlace ? (
                    <div className="space-y-2">
                      {selectedPlace.imageUrl && (
                        <div className="relative h-28 w-full overflow-hidden rounded-md border">
                          <Image
                            src={selectedPlace.imageUrl}
                            alt={selectedPlace.nameKo}
                            fill
                            unoptimized={isExternalImage(selectedPlace.imageUrl)}
                            className="object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{selectedPlace.nameKo}</p>
                        {selectedPlace.nameEn && (
                          <p className="text-xs text-muted-foreground">{selectedPlace.nameEn}</p>
                        )}
                        {selectedPlace.addressKo && (
                          <p className="flex items-start gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                            {selectedPlace.addressKo}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => setPlacePickerOpen(true)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        변경
                      </Button>
                    </div>
                  ) : (
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

              {/* 상태 / 메타 */}
              <Card className="gap-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">상태 / 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>상태</Label>
                    <Select
                      value={status}
                      onValueChange={(v) => setStatus(v as EventStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map((key) => (
                          <SelectItem key={key} value={key}>
                            {EVENT_STATUS_LABELS[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-on-home" className="cursor-pointer">
                      홈 노출
                    </Label>
                    <Switch
                      id="show-on-home"
                      checked={showOnHome}
                      onCheckedChange={setShowOnHome}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>정렬 순서</Label>
                    <Input
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(Number(e.target.value))}
                      min={0}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* 장소 피커 */}
      <PlacePickerSheet
        open={placePickerOpen}
        onOpenChange={setPlacePickerOpen}
        onSelect={(place) => {
          setSelectedPlace(place);
          setPlacePickerOpen(false);
        }}
      />
    </div>
  );
}
