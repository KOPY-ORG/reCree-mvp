"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Loader2, MapPin, Plus, Trash2, Upload, X } from "lucide-react";
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
import type { EventBlockType, EventCategory, EventEntryType, EventStatus } from "@prisma/client";
import {
  EVENT_STATUS_LABELS,
  EVENT_CATEGORY_LABELS,
} from "../_constants";
import {
  checkEventSlug,
  createEvent,
  updateEvent,
  type EventFormData,
  type TranslationField,
  type PerkData,
  type BodyBlockData,
} from "../_actions/event-actions";

type CollectionInfo = { id: string; nameKo: string; slug: string };

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
  slug: string;
  places: PlaceForForm[];
  eventCollectionId: string;
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
  perks?: Array<{
    imageUrl: string | null;
    perkUrl: string;
    translations: Partial<Record<string, { badge: string; title: string; detail: string }>>;
  }>;
  bodyBlocks?: Array<{
    type: EventBlockType;
    imageUrl: string | null;
    caption: string | null;
    embedUrl: string | null;
    translations: Partial<Record<string, { text: string }>>;
  }>;
};

interface EventFormProps {
  mode: "create" | "edit";
  eventId?: string;
  initialData?: EventInitialData;
  collection: CollectionInfo;
}

// ─── Perk 타입 ────────────────────────────────────────────────────────────────

type PerkTranslationField = { badge: string; title: string; detail: string };

type PerkFormItem = {
  key: string;
  imageUrl: string | null;
  uploading: boolean;
  perkUrl: string;
  activeLang: EventLocale;
  translations: Record<EventLocale, PerkTranslationField>;
};

const emptyPerkTranslation = (): PerkTranslationField => ({
  badge: "",
  title: "",
  detail: "",
});

function initPerkItem(initial?: {
  imageUrl: string | null;
  perkUrl: string;
  translations?: Partial<Record<string, { badge: string; title: string; detail: string }>>;
}): PerkFormItem {
  const translations = {} as Record<EventLocale, PerkTranslationField>;
  for (const loc of LOCALES) {
    const t = initial?.translations?.[loc.key];
    translations[loc.key] = t
      ? { badge: t.badge ?? "", title: t.title ?? "", detail: t.detail ?? "" }
      : emptyPerkTranslation();
  }
  return {
    key: crypto.randomUUID(),
    imageUrl: initial?.imageUrl ?? null,
    uploading: false,
    perkUrl: initial?.perkUrl ?? "",
    activeLang: "ko",
    translations,
  };
}

// ─── PerkCard ────────────────────────────────────────────────────────────────

interface PerkCardProps {
  item: PerkFormItem;
  index: number;
  total: number;
  onChange: (updater: (item: PerkFormItem) => PerkFormItem) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function PerkCard({ item, index, total, onChange, onRemove, onMoveUp, onMoveDown }: PerkCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange((prev) => ({ ...prev, uploading: true }));
    const result = await getEventImagePresignedUrl(file.name, file.type, "events/perks");
    if ("error" in result) {
      toast.error(result.error);
      onChange((prev) => ({ ...prev, uploading: false }));
    } else {
      const res = await fetch(result.presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) {
        toast.error(`업로드 실패 (${res.status})`);
        onChange((prev) => ({ ...prev, uploading: false }));
      } else {
        onChange((prev) => ({ ...prev, imageUrl: result.cdnUrl, uploading: false }));
        toast.success("이미지가 업로드되었습니다.");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const updatePerkTranslation = (field: keyof PerkTranslationField, value: string) => {
    onChange((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [prev.activeLang]: {
          ...prev.translations[prev.activeLang],
          [field]: value,
        },
      },
    }));
  };

  return (
    <div className="rounded-lg border bg-muted/20 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
        <span className="text-sm font-medium text-muted-foreground">혜택 {index + 1}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={onMoveDown}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-destructive/10 text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="p-4 space-y-4">
        {/* 이미지 + 링크 */}
        <div className="flex gap-4">
          {/* 이미지 업로드 */}
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
            {item.imageUrl ? (
              <div>
                <div className="relative h-24 w-24 overflow-hidden rounded-md border bg-muted">
                  <Image
                    src={item.imageUrl}
                    alt="혜택 이미지"
                    fill
                    unoptimized={isExternalImage(item.imageUrl)}
                    className="object-cover"
                  />
                </div>
                <div className="mt-1.5 flex gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={item.uploading}
                    className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border bg-background text-xs transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {item.uploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, imageUrl: null }))}
                    className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border bg-background text-xs text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={item.uploading}
                className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
              >
                {item.uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    이미지
                  </>
                )}
              </button>
            )}
          </div>

          {/* 혜택 링크 */}
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium leading-none">혜택 링크</label>
            <input
              type="url"
              value={item.perkUrl}
              onChange={(e) => onChange((prev) => ({ ...prev, perkUrl: e.target.value }))}
              placeholder="https://"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* 번역 */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1 border-b">
            {LOCALES.map((loc) => (
              <button
                key={loc.key}
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, activeLang: loc.key }))}
                className={`px-3 py-1.5 text-xs rounded-t-md border-b-2 -mb-px transition-colors ${
                  item.activeLang === loc.key
                    ? "border-foreground text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {loc.label}
                {loc.required && (
                  <span className="ml-0.5 text-red-500">*</span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium leading-none">Badge</label>
              <input
                type="text"
                value={item.translations[item.activeLang]?.badge ?? ""}
                onChange={(e) => updatePerkTranslation("badge", e.target.value)}
                placeholder="예: FIRST 50, FREE, 선착순"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium leading-none">
                제목
                {(item.activeLang === "ko" || item.activeLang === "en") && (
                  <span className="ml-1 text-red-500">*</span>
                )}
              </label>
              <input
                type="text"
                value={item.translations[item.activeLang]?.title ?? ""}
                onChange={(e) => updatePerkTranslation("title", e.target.value)}
                placeholder="혜택 제목"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium leading-none">상세</label>
              <textarea
                value={item.translations[item.activeLang]?.detail ?? ""}
                onChange={(e) => updatePerkTranslation("detail", e.target.value)}
                placeholder="혜택 상세 설명"
                rows={2}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── BodyBlock 타입 ───────────────────────────────────────────────────────────

type BodyBlockFormItem = {
  key: string;
  type: EventBlockType;
  imageUrl: string | null;
  caption: string;
  embedUrl: string | null;
  uploading: boolean;
  activeLang: EventLocale;
  translations: Record<EventLocale, { text: string }>;
};

function initBodyBlockItem(initial?: {
  type?: EventBlockType;
  imageUrl?: string | null;
  caption?: string | null;
  embedUrl?: string | null;
  translations?: Partial<Record<string, { text: string }>>;
}): BodyBlockFormItem {
  const translations = {} as Record<EventLocale, { text: string }>;
  for (const loc of LOCALES) {
    // INSTAGRAM 블록은 translations가 비어있으므로 누락 locale을 {text:""}로 보장
    translations[loc.key] = { text: initial?.translations?.[loc.key]?.text ?? "" };
  }
  return {
    key: crypto.randomUUID(),
    type: initial?.type ?? "TEXT",
    imageUrl: initial?.imageUrl ?? null,
    caption: initial?.caption ?? "",
    embedUrl: initial?.embedUrl ?? null,
    uploading: false,
    activeLang: "ko",
    translations,
  };
}

// ─── BodyBlockCard ────────────────────────────────────────────────────────────

interface BodyBlockCardProps {
  item: BodyBlockFormItem;
  index: number;
  total: number;
  onChange: (updater: (item: BodyBlockFormItem) => BodyBlockFormItem) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function BodyBlockCard({ item, index, total, onChange, onRemove, onMoveUp, onMoveDown }: BodyBlockCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange((prev) => ({ ...prev, uploading: true }));
    const result = await getEventImagePresignedUrl(file.name, file.type, "events/body");
    if ("error" in result) {
      toast.error(result.error);
      onChange((prev) => ({ ...prev, uploading: false }));
    } else {
      const res = await fetch(result.presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) {
        toast.error(`업로드 실패 (${res.status})`);
        onChange((prev) => ({ ...prev, uploading: false }));
      } else {
        onChange((prev) => ({ ...prev, imageUrl: result.cdnUrl, uploading: false }));
        toast.success("이미지가 업로드되었습니다.");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="rounded-lg border bg-muted/20 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/40">
        <span className="text-sm font-medium text-muted-foreground">
          블록 {index + 1}
          <span className="ml-2 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal">
            {item.type === "TEXT" ? "텍스트" : item.type === "IMAGE" ? "이미지" : "인스타그램"}
          </span>
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={index === 0}
            onClick={onMoveUp}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={onMoveDown}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-destructive/10 text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 본문 */}
      <div className="p-4">
        {item.type === "TEXT" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1 border-b">
              {LOCALES.map((loc) => (
                <button
                  key={loc.key}
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, activeLang: loc.key }))}
                  className={`px-3 py-1.5 text-xs rounded-t-md border-b-2 -mb-px transition-colors ${
                    item.activeLang === loc.key
                      ? "border-foreground text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {loc.label}
                  {loc.required && <span className="ml-0.5 text-red-500">*</span>}
                </button>
              ))}
            </div>
            <textarea
              value={item.translations[item.activeLang]?.text ?? ""}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  translations: {
                    ...prev.translations,
                    [prev.activeLang]: { text: e.target.value },
                  },
                }))
              }
              placeholder="본문 내용을 입력하세요."
              rows={5}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          </div>
        ) : item.type === "IMAGE" ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageUpload}
            />
            {item.imageUrl ? (
              <div>
                <div className="relative w-full overflow-hidden rounded-md border bg-muted" style={{ aspectRatio: "16/9" }}>
                  <Image
                    src={item.imageUrl}
                    alt="본문 이미지"
                    fill
                    unoptimized={isExternalImage(item.imageUrl)}
                    className="object-cover"
                  />
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={item.uploading}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {item.uploading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    변경
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, imageUrl: null }))}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3" />
                    제거
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={item.uploading}
                className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
              >
                {item.uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    클릭하여 이미지 업로드
                  </>
                )}
              </button>
            )}
            <div className="mt-2 space-y-1">
              <label className="text-xs font-medium leading-none text-muted-foreground">
                캡션 (선택)
              </label>
              <input
                type="text"
                value={item.caption}
                onChange={(e) => onChange((prev) => ({ ...prev, caption: e.target.value }))}
                placeholder="이미지 설명 (표시 여부는 퍼블리시 설정에서)"
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-medium leading-none">
              인스타그램 포스트 URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={item.embedUrl ?? ""}
              onChange={(e) => onChange((prev) => ({ ...prev, embedUrl: e.target.value }))}
              placeholder="https://www.instagram.com/p/XXXX/"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">예: https://www.instagram.com/p/DY3aL9FJsVX</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────────

const emptyTranslation = (): TranslationField => ({
  name: "",
  description: "",
  hoursNote: "",
});

function initTranslations(
  initial?: Partial<Record<string, TranslationField>>,
): Record<string, TranslationField> {
  const t: Record<string, TranslationField> = {};
  for (const loc of LOCALES) {
    t[loc.key] = initial?.[loc.key]
      ? { ...emptyTranslation(), ...initial[loc.key] }
      : emptyTranslation();
  }
  return t;
}

// ─── 배너 이미지 업로드 ────────────────────────────────────────────────────────

async function uploadBannerImage(
  file: File,
): Promise<{ url: string } | { error: string }> {
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

export function EventForm({
  mode,
  eventId,
  initialData,
  collection,
}: EventFormProps) {
  const isEdit = mode === "edit";
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [activeLang, setActiveLang] = useState<EventLocale>("ko");
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 폼 state ────────────────────────────────────────────────────────────────
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "error" | "invalid">("idle");
  const slugCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedPlaces, setSelectedPlaces] = useState<PlaceForForm[]>(
    initialData?.places ?? [],
  );
  const [eventCollectionId] = useState(collection.id);
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
  const [reservationUrl, setReservationUrl] = useState(
    initialData?.reservationUrl ?? "",
  );
  const [officialUrl, setOfficialUrl] = useState(initialData?.officialUrl ?? "");
  const [snsUrl, setSnsUrl] = useState(initialData?.snsUrl ?? "");
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(
    initialData?.bannerImageUrl ?? null,
  );
  const [status, setStatus] = useState<EventStatus>(
    initialData?.status ?? "DRAFT",
  );
  const [showOnHome, setShowOnHome] = useState(initialData?.showOnHome ?? false);
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder ?? 0);
  const [translations, setTranslations] = useState<Record<string, TranslationField>>(
    () => initTranslations(initialData?.translations),
  );
  const [perks, setPerks] = useState<PerkFormItem[]>(() =>
    initialData?.perks ? initialData.perks.map((p) => initPerkItem(p)) : [],
  );
  const [bodyBlocks, setBodyBlocks] = useState<BodyBlockFormItem[]>(() =>
    initialData?.bodyBlocks ? initialData.bodyBlocks.map((b) => initBodyBlockItem(b)) : [],
  );

  // ── 장소 핸들러 ─────────────────────────────────────────────────────────────
  const addPlace = (place: PlaceForForm) => {
    setSelectedPlaces((prev) =>
      prev.some((p) => p.id === place.id) ? prev : [...prev, place],
    );
    setPlacePickerOpen(false);
  };

  const removePlace = (idx: number) => {
    setSelectedPlaces((prev) => prev.filter((_, i) => i !== idx));
  };

  const movePlace = (idx: number, direction: "up" | "down") => {
    setSelectedPlaces((prev) => {
      const next = [...prev];
      if (direction === "up" && idx > 0) {
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      } else if (direction === "down" && idx < next.length - 1) {
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      }
      return next;
    });
  };

  // ── Slug 중복 체크 ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!slug.trim()) {
      setSlugStatus("idle");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current);
    slugCheckTimerRef.current = setTimeout(async () => {
      const { available } = await checkEventSlug(slug, isEdit ? eventId : undefined);
      setSlugStatus(available ? "ok" : "error");
    }, 400);
    return () => {
      if (slugCheckTimerRef.current) clearTimeout(slugCheckTimerRef.current);
    };
  }, [slug, isEdit, eventId]);

  // ── 번역 업데이트 ─────────────────────────────────────────────────────────────
  const updateTranslation = (
    locale: string,
    field: keyof TranslationField,
    value: string,
  ) => {
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
    if (!slug.trim()) { toast.error("슬러그를 입력해주세요."); setActiveTab("info"); return; }
    if (slugStatus === "invalid") { toast.error("슬러그는 소문자·숫자·하이픈(-)만 사용할 수 있습니다."); setActiveTab("info"); return; }
    if (slugStatus === "checking") { toast.error("슬러그 확인 중입니다. 잠시 후 다시 시도해주세요."); return; }
    if (slugStatus === "error") { toast.error("슬러그가 이미 사용 중입니다."); setActiveTab("info"); return; }
    if (selectedPlaces.length === 0) { toast.error("장소를 1개 이상 선택해주세요."); return; }
    if (!eventCollectionId) { toast.error("컬렉션을 선택해주세요."); return; }
    if (!startDate || !endDate) { toast.error("기간을 입력해주세요."); return; }
    if (!translations.ko.name.trim()) { toast.error("한국어 이벤트명을 입력해주세요."); return; }
    if (!translations.en.name.trim()) { toast.error("영어 이벤트명을 입력해주세요."); return; }
    for (let i = 0; i < perks.length; i++) {
      if (!perks[i].translations.ko.title.trim()) {
        toast.error(`혜택 ${i + 1}번의 한국어 제목을 입력해주세요.`);
        setActiveTab("perks");
        return;
      }
      if (!perks[i].translations.en.title.trim()) {
        toast.error(`혜택 ${i + 1}번의 영어 제목을 입력해주세요.`);
        setActiveTab("perks");
        return;
      }
    }

    const INSTAGRAM_URL_RE = /^https?:\/\/(www\.)?instagram\.com\/(p|reel)\/[\w-]+/;
    for (let i = 0; i < bodyBlocks.length; i++) {
      const b = bodyBlocks[i];
      if (b.type === "TEXT") {
        if (!b.translations.ko.text.trim()) {
          toast.error(`본문 ${i + 1}번 블록의 한국어 내용을 입력해주세요.`);
          setActiveTab("body");
          return;
        }
        if (!b.translations.en.text.trim()) {
          toast.error(`본문 ${i + 1}번 블록의 영어 내용을 입력해주세요.`);
          setActiveTab("body");
          return;
        }
      } else if (b.type === "IMAGE") {
        if (!b.imageUrl) {
          toast.error(`본문 ${i + 1}번 이미지를 업로드해주세요.`);
          setActiveTab("body");
          return;
        }
      } else if (b.type === "INSTAGRAM") {
        if (!b.embedUrl?.trim()) {
          toast.error(`본문 ${i + 1}번 인스타그램 URL을 입력해주세요.`);
          setActiveTab("body");
          return;
        }
        if (!INSTAGRAM_URL_RE.test(b.embedUrl.trim())) {
          toast.error(`본문 ${i + 1}번: 올바른 인스타그램 포스트/릴 URL을 입력해주세요.`);
          setActiveTab("body");
          return;
        }
      }
    }

    const perksData: PerkData[] = perks.map((p, i) => ({
      imageUrl: p.imageUrl,
      perkUrl: p.perkUrl,
      sortOrder: i,
      translations: Object.fromEntries(
        LOCALES.map((loc) => [
          loc.key,
          {
            badge: p.translations[loc.key].badge,
            title: p.translations[loc.key].title,
            detail: p.translations[loc.key].detail,
          },
        ]),
      ),
    }));

    const bodyBlocksData: BodyBlockData[] = bodyBlocks.map((b, i) => ({
      type: b.type,
      imageUrl: b.imageUrl,
      caption: b.type === "IMAGE" ? (b.caption.trim() || null) : null,
      embedUrl: b.embedUrl ?? null,
      sortOrder: i,
      translations: b.type === "TEXT"
        ? Object.fromEntries(LOCALES.map((loc) => [loc.key, { text: b.translations[loc.key].text }]))
        : {},
    }));

    const data: EventFormData = {
      slug,
      places: selectedPlaces.map((p, idx) => ({ placeId: p.id, sortOrder: idx })),
      eventCollectionId,
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
      perks: perksData,
      bodyBlocks: bodyBlocksData,
    };

    startTransition(async () => {
      const result =
        isEdit && eventId
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
              href={`/admin/events/${collection.id}`}
              className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-semibold">
                {isEdit ? "이벤트 수정" : "이벤트 작성"}
              </h1>
              <p className="text-xs text-muted-foreground">{collection.nameKo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/events/${collection.id}`}>취소</Link>
            </Button>
            <Button size="sm" disabled={isPending || slugStatus === "checking" || slugStatus === "error" || slugStatus === "invalid"} onClick={handleSubmit}>
              {isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
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
                      {/* 컬렉션 (고정) */}
                      <div className="space-y-1.5">
                        <Label>컬렉션</Label>
                        <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm">
                          <span className="font-medium">{collection.nameKo}</span>
                          <span className="ml-2 text-xs text-muted-foreground font-mono">
                            {collection.slug}
                          </span>
                        </div>
                      </div>

                      {/* 슬러그 */}
                      <div className="space-y-1.5">
                        <Label>
                          슬러그 <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <input
                            value={slug}
                            onChange={(e) => {
                              const normalized = e.target.value
                                .toLowerCase()
                                .replace(/\s+/g, "-");
                              setSlug(normalized);
                            }}
                            placeholder="galaxy-experience-zone"
                            className={`w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring ${
                              slugStatus === "error" || slugStatus === "invalid"
                                ? "border-destructive"
                                : slugStatus === "ok"
                                  ? "border-green-500"
                                  : ""
                            }`}
                          />
                          {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                          {slugStatus === "ok" && <Check className="h-4 w-4 text-green-600 shrink-0" />}
                          {(slugStatus === "error" || slugStatus === "invalid") && <X className="h-4 w-4 text-destructive shrink-0" />}
                        </div>
                        {slugStatus === "invalid" && (
                          <p className="text-xs text-destructive">소문자, 숫자, 하이픈(-)만 사용할 수 있어요.</p>
                        )}
                        {slugStatus === "error" && (
                          <p className="text-xs text-destructive">이미 사용 중인 슬러그입니다.</p>
                        )}
                        {slugStatus === "idle" && (
                          <p className="text-xs text-muted-foreground">소문자·숫자·하이픈. URL에 사용됩니다. 예: galaxy-experience-zone</p>
                        )}
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
                            {(
                              Object.keys(
                                EVENT_CATEGORY_LABELS,
                              ) as EventCategory[]
                            ).map((key) => (
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
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>마감 시간</Label>
                          <Input
                            type="time"
                            value={closeTime}
                            onChange={(e) => setCloseTime(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* 참여 방법 */}
                      <div className="space-y-1.5">
                        <Label>참여 방법</Label>
                        <Select
                          value={entryType}
                          onValueChange={(v) =>
                            setEntryType(v as EventEntryType)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.keys(
                                ENTRY_TYPE_LABELS,
                              ) as EventEntryType[]
                            ).map((key) => (
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
                                {uploading ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Upload className="h-3 w-3 mr-1" />
                                )}
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
                              <span className="ml-0.5 text-red-500 text-xs">
                                *
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

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
                            onChange={(e) =>
                              updateTranslation(activeLang, "name", e.target.value)
                            }
                            placeholder="이벤트 이름"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>
                            한 줄 요약
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              — 제목 밑에 표시됩니다
                            </span>
                          </Label>
                          <Textarea
                            value={translations[activeLang]?.description ?? ""}
                            onChange={(e) =>
                              updateTranslation(
                                activeLang,
                                "description",
                                e.target.value,
                              )
                            }
                            placeholder="예: Experience the vibrant K-culture festival in Busan."
                            rows={2}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>운영 시간 안내</Label>
                          <Input
                            value={translations[activeLang]?.hoursNote ?? ""}
                            onChange={(e) =>
                              updateTranslation(
                                activeLang,
                                "hoursNote",
                                e.target.value,
                              )
                            }
                            placeholder="예: 매일 13:00–21:00"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 혜택 탭 */}
                  {activeTab === "perks" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {perks.length === 0
                            ? "혜택 항목을 추가하세요."
                            : `혜택 ${perks.length}개`}
                        </p>
                        <button
                          type="button"
                          onClick={() => setPerks((prev) => [...prev, initPerkItem()])}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          혜택 추가
                        </button>
                      </div>

                      {perks.length === 0 ? (
                        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                          혜택을 추가해보세요.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {perks.map((item, index) => (
                            <PerkCard
                              key={item.key}
                              item={item}
                              index={index}
                              total={perks.length}
                              onChange={(updater) =>
                                setPerks((prev) =>
                                  prev.map((p) => (p.key === item.key ? updater(p) : p)),
                                )
                              }
                              onRemove={() =>
                                setPerks((prev) => prev.filter((p) => p.key !== item.key))
                              }
                              onMoveUp={() =>
                                setPerks((prev) => {
                                  const next = [...prev];
                                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                  return next;
                                })
                              }
                              onMoveDown={() =>
                                setPerks((prev) => {
                                  const next = [...prev];
                                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                  return next;
                                })
                              }
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 본문 탭 */}
                  {activeTab === "body" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {bodyBlocks.length === 0
                            ? "본문 블록을 추가하세요."
                            : `블록 ${bodyBlocks.length}개`}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setBodyBlocks((prev) => [
                                ...prev,
                                initBodyBlockItem({ type: "TEXT" }),
                              ])
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            텍스트 블록
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setBodyBlocks((prev) => [
                                ...prev,
                                initBodyBlockItem({ type: "IMAGE" }),
                              ])
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            이미지 블록
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setBodyBlocks((prev) => [
                                ...prev,
                                initBodyBlockItem({ type: "INSTAGRAM" }),
                              ])
                            }
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            인스타그램 블록
                          </button>
                        </div>
                      </div>

                      {bodyBlocks.length === 0 ? (
                        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                          텍스트 또는 이미지 블록을 추가해보세요.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {bodyBlocks.map((item, index) => (
                            <BodyBlockCard
                              key={item.key}
                              item={item}
                              index={index}
                              total={bodyBlocks.length}
                              onChange={(updater) =>
                                setBodyBlocks((prev) =>
                                  prev.map((b) => (b.key === item.key ? updater(b) : b)),
                                )
                              }
                              onRemove={() =>
                                setBodyBlocks((prev) =>
                                  prev.filter((b) => b.key !== item.key),
                                )
                              }
                              onMoveUp={() =>
                                setBodyBlocks((prev) => {
                                  const next = [...prev];
                                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                  return next;
                                })
                              }
                              onMoveDown={() =>
                                setBodyBlocks((prev) => {
                                  const next = [...prev];
                                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                                  return next;
                                })
                              }
                            />
                          ))}
                        </div>
                      )}
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
                    장소{" "}
                    <span className="text-red-500 text-sm font-normal">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedPlaces.map((p, idx) => (
                    <div key={p.id} className="flex items-start gap-2 rounded-md border p-2.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug truncate">
                          {p.nameEn ?? p.nameKo}
                        </p>
                        {(p.addressEn || p.addressKo) && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {p.addressEn ?? p.addressKo}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === 0}
                          onClick={() => movePlace(idx, "up")}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === selectedPlaces.length - 1}
                          onClick={() => movePlace(idx, "down")}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removePlace(idx)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-8 text-xs"
                    onClick={() => setPlacePickerOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    장소 추가
                  </Button>
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
                        {(Object.keys(EVENT_STATUS_LABELS) as EventStatus[]).map(
                          (key) => (
                            <SelectItem key={key} value={key}>
                              {EVENT_STATUS_LABELS[key]}
                            </SelectItem>
                          ),
                        )}
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
        onSelect={addPlace}
      />
    </div>
  );
}
