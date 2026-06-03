"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EventStatus } from "@prisma/client";
import { EVENT_STATUS_LABELS } from "../_constants";
import {
  createCollection,
  updateCollection,
  type CollectionFormData,
  type CollectionTranslationField,
} from "../_actions/collection-actions";

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const LOCALES = [
  { key: "ko", label: "한국어", required: true },
  { key: "en", label: "English", required: true },
  { key: "zh-CN", label: "中文(简)", required: false },
  { key: "zh-TW", label: "中文(繁)", required: false },
  { key: "es", label: "Español", required: false },
  { key: "ja", label: "日本語", required: false },
] as const;

type CollectionLocale = (typeof LOCALES)[number]["key"];

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export type CollectionInitialData = {
  id: string;
  slug: string;
  status: EventStatus;
  sortOrder: number;
  translations?: Partial<Record<string, CollectionTranslationField>>;
};

interface CollectionFormProps {
  mode: "create" | "edit";
  collectionId?: string;
  initialData?: CollectionInitialData;
}

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────────

function initTranslations(
  initial?: Partial<Record<string, CollectionTranslationField>>,
): Record<string, CollectionTranslationField> {
  const t: Record<string, CollectionTranslationField> = {};
  for (const loc of LOCALES) {
    t[loc.key] = initial?.[loc.key] ?? { name: "" };
  }
  return t;
}

// ─── CollectionForm ───────────────────────────────────────────────────────────

export function CollectionForm({
  mode,
  collectionId,
  initialData,
}: CollectionFormProps) {
  const isEdit = mode === "edit";
  const [isPending, startTransition] = useTransition();
  const [activeLang, setActiveLang] = useState<CollectionLocale>("ko");

  // ── 폼 state ────────────────────────────────────────────────────────────────
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [status, setStatus] = useState<EventStatus>(
    initialData?.status ?? "DRAFT",
  );
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder ?? 0);
  const [translations, setTranslations] = useState<
    Record<string, CollectionTranslationField>
  >(() => initTranslations(initialData?.translations));

  // ── 번역 업데이트 ─────────────────────────────────────────────────────────────
  const updateName = (locale: string, value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [locale]: { name: value },
    }));
  };

  // ── 제출 ───────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!slug.trim()) { toast.error("슬러그를 입력해주세요."); return; }
    if (!translations.ko.name.trim()) { toast.error("한국어 컬렉션명을 입력해주세요."); return; }
    if (!translations.en.name.trim()) { toast.error("영어 컬렉션명을 입력해주세요."); return; }

    const data: CollectionFormData = {
      slug,
      status,
      sortOrder,
      translations,
    };

    startTransition(async () => {
      const result =
        isEdit && collectionId
          ? await updateCollection(collectionId, data)
          : await createCollection(data);

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
              {isEdit ? "컬렉션 수정" : "컬렉션 생성"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/events">취소</Link>
            </Button>
            <Button size="sm" disabled={isPending} onClick={handleSubmit}>
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
        <div className="mx-auto max-w-2xl space-y-6">
          {/* 기본 설정 카드 */}
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1.5">
                <Label>
                  슬러그 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toUpperCase())}
                  placeholder="예: ARIRANG_BUSAN"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  대문자·숫자·밑줄(_) 권장. URL·필터 식별자로 사용됩니다.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-1.5">
                  <Label>정렬 순서</Label>
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    min={0}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 번역 카드 */}
          <Card className="gap-0 pb-0">
            {/* 언어 탭 헤더 */}
            <div className="flex flex-wrap gap-1 border-b px-2 pt-2">
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

            <CardContent className="p-6">
              <div className="space-y-1.5">
                <Label>
                  컬렉션 표시 이름
                  {(activeLang === "ko" || activeLang === "en") && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                <Input
                  value={translations[activeLang]?.name ?? ""}
                  onChange={(e) => updateName(activeLang, e.target.value)}
                  placeholder={
                    activeLang === "ko"
                      ? "예: 아리랑 부산"
                      : activeLang === "en"
                        ? "예: ARIRANG BUSAN"
                        : "표시 이름"
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
