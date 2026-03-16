"use client";

import React, { useCallback, useTransition, useState, useRef } from "react";
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
  Plus,
  Trash2,
  Upload,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { PlaceStatus } from "@prisma/client";
import { STATUS_LABELS } from "../_constants";
import { createClient } from "@/lib/supabase/client";
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
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  addPlaceImage,
  deletePlaceImage,
  setPlaceImageThumbnail,
  updatePlaceImageCaption,
} from "../actions";

// ─── 타입 ──────────────────────────────────────────────────────────────────────

export type PlaceImageData = {
  id: string;
  url: string;
  isThumbnail: boolean;
  sortOrder: number;
  caption: string | null;
};

// create 모드에서 임시 보관하는 이미지 항목
type PendingImage = {
  key: string;
  type: "file" | "url";
  file?: File;
  previewUrl: string;
  caption: string;
};

export type PlaceInitialData = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  addressKo: string | null;
  addressEn: string | null;
  areaId: string | null;
  placeTypes: string[];
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  googleMapsUrl: string | null;
  naverMapsUrl: string | null;
  kakaoMapsUrl: string | null;
  phone: string | null;
  operatingHours: string[] | null;
  gettingThere: string | null;
  status: PlaceStatus;
  isVerified: boolean;
};

export type PlaceTypeOption = {
  id: string;
  name: string;
  nameKo: string;
};

export type AreaOption = {
  id: string;
  nameKo: string;
  level: number;
  parentId: string | null;
};

interface PlaceFormProps {
  initialData?: PlaceInitialData;
  initialPlaceImages?: PlaceImageData[];
  allPlaceTypes?: PlaceTypeOption[];
  allAreas?: AreaOption[];
  onSubmit: (data: PlaceFormData) => Promise<{ error?: string; id?: string }>;
  submitLabel: string;
}

// ─── 상수 / 업로드 유틸 ────────────────────────────────────────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES = 5;

async function uploadPlaceImage(
  file: File,
  placeId: string,
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: `${file.name}: jpg, png, webp 형식만 지원합니다.` };
  }
  if (file.size > MAX_SIZE) {
    return { error: `${file.name}: 파일 크기가 5MB를 초과합니다.` };
  }
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${placeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("place-images").upload(path, file);
  if (error) return { error: `업로드 실패: ${error.message}` };
  const { data } = supabase.storage.from("place-images").getPublicUrl(path);
  return { url: data.publicUrl };
}

// ─── 상수 ──────────────────────────────────────────────────────────────────────


// ─── 컴포넌트 ──────────────────────────────────────────────────────────────────

export function PlaceForm({
  initialData,
  initialPlaceImages = [],
  allPlaceTypes = [],
  allAreas = [],
  onSubmit,
  submitLabel,
}: PlaceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isImagePending, startImageTransition] = useTransition();

  const isEdit = !!initialData;
  const pageTitle = isEdit ? "장소 수정" : "새 장소 등록";

  // ── 폼 상태 ────────────────────────────────────────────────────────────────
  const [nameKo, setNameKo] = useState(initialData?.nameKo ?? "");
  const [nameEn, setNameEn] = useState(initialData?.nameEn ?? "");
  const [addressKo, setAddressKo] = useState(initialData?.addressKo ?? "");
  const [addressEn, setAddressEn] = useState(initialData?.addressEn ?? "");

  const [areaId, setAreaId] = useState<string | null>(initialData?.areaId ?? null);
  const [selectedPlaceTypes, setSelectedPlaceTypes] = useState<string[]>(
    initialData?.placeTypes ?? [],
  );
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
  const [gettingThere, setGettingThere] = useState(
    initialData?.gettingThere ?? "",
  );
  const [status, setStatus] = useState<PlaceStatus>(
    initialData?.status ?? "OPEN",
  );
  const [isVerified, setIsVerified] = useState(
    initialData?.isVerified ?? false,
  );

  // ── 이미지 상태 ────────────────────────────────────────────────────────────
  const [placeImages, setPlaceImages] = useState<PlaceImageData[]>(initialPlaceImages);
  // create 모드 전용: 저장 전 대기 이미지
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── UI 상태 ────────────────────────────────────────────────────────────────
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);

  // ── 파생값 ─────────────────────────────────────────────────────────────────
  const hasLocation =
    !!addressKo || (latitude !== null && longitude !== null);

  const currentImageCount = isEdit ? placeImages.length : pendingImages.length;
  const isImageLimitReached = currentImageCount >= MAX_IMAGES;

  // area select 옵션: 도시 + 구역 혼합 (그룹화 없이 flat)
  const cities = allAreas.filter((a) => a.level === 0);
  const districts = allAreas.filter((a) => a.level === 1);

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

  function togglePlaceType(name: string) {
    setSelectedPlaceTypes((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  }

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
    if (!areaId) {
      toast.error("지역을 선택해주세요.");
      return;
    }
    if (selectedPlaceTypes.length === 0) {
      toast.error("장소 유형을 1개 이상 선택해주세요.");
      return;
    }
    const data: PlaceFormData = {
      nameKo: nameKo.trim(),
      nameEn: nameEn.trim(),
      addressKo: addressKo.trim(),
      addressEn: addressEn.trim(),
      areaId: areaId || null,
      placeTypes: selectedPlaceTypes,
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
      gettingThere: gettingThere.trim() || null,
      status,
      isVerified,
    };

    startTransition(async () => {
      // create 모드: 장소 생성 전에 이미지 먼저 업로드
      let uploadedImageUrls: { url: string; caption: string }[] = [];
      if (!isEdit && pendingImages.length > 0) {
        setIsUploading(true);
        const tempId = crypto.randomUUID();
        try {
          const results = await Promise.all(
            pendingImages.map(async (pending) => {
              if (pending.type === "file" && pending.file) {
                const uploaded = await uploadPlaceImage(pending.file, tempId);
                if ("error" in uploaded) return { error: uploaded.error };
                return { url: uploaded.url, caption: pending.caption };
              }
              return { url: pending.previewUrl, caption: pending.caption };
            }),
          );

          const failed = results.filter((r) => "error" in r);
          if (failed.length > 0) {
            failed.forEach((r) => "error" in r && toast.error(r.error));
            setIsUploading(false);
            return; // 업로드 실패 시 장소 등록 중단
          }

          uploadedImageUrls = results as { url: string; caption: string }[];
        } finally {
          setIsUploading(false);
        }
      }

      const result = await onSubmit(data);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      // 이미지 DB 연결
      if (!isEdit && result.id && uploadedImageUrls.length > 0) {
        await Promise.all(
          uploadedImageUrls.map((img) =>
            addPlaceImage(result.id!, {
              url: img.url,
              caption: img.caption || undefined,
            }),
          ),
        );
      }

      toast.success(isEdit ? "장소가 수정되었습니다." : "장소가 등록되었습니다.");
      router.push("/admin/places");
    });
  };

  // ── 이미지 핸들러 ──────────────────────────────────────────────────────────

  async function processFiles(files: File[]) {
    if (files.length === 0) return;

    if (!isEdit) {
      // create 모드: pending에 추가 (유효성만 체크)
      const newPending: PendingImage[] = [];
      for (const file of files) {
        if (pendingImages.length + newPending.length >= MAX_IMAGES) {
          toast.error(`최대 ${MAX_IMAGES}장까지만 추가할 수 있습니다.`);
          break;
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
          toast.error(`${file.name}: jpg, png, webp 형식만 지원합니다.`);
          continue;
        }
        if (file.size > MAX_SIZE) {
          toast.error(`${file.name}: 파일 크기가 5MB를 초과합니다.`);
          continue;
        }
        newPending.push({
          key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: "file",
          file,
          previewUrl: URL.createObjectURL(file),
          caption: "",
        });
      }
      setPendingImages((prev) => [...prev, ...newPending]);
      return;
    }

    // edit 모드: 즉시 업로드
    if (!initialData) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        if (placeImages.length >= MAX_IMAGES) {
          toast.error(`최대 ${MAX_IMAGES}장까지만 추가할 수 있습니다.`);
          break;
        }
        const uploaded = await uploadPlaceImage(file, initialData.id);
        if ("error" in uploaded) {
          toast.error(uploaded.error);
          continue;
        }
        const result = await addPlaceImage(initialData.id, { url: uploaded.url });
        if (result.error) {
          toast.error(result.error);
        } else {
          setPlaceImages((prev) => [
            ...prev,
            {
              id: result.id!,
              url: uploaded.url,
              isThumbnail: prev.length === 0,
              sortOrder: prev.length,
              caption: null,
            },
          ]);
        }
      }
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    processFiles(files);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ALLOWED_TYPES.includes(f.type),
    );
    processFiles(files);
  }

  function handleAddUrlImage() {
    if (!newImageUrl.trim()) return;

    if (!isEdit) {
      if (pendingImages.length >= MAX_IMAGES) {
        toast.error(`최대 ${MAX_IMAGES}장까지만 추가할 수 있습니다.`);
        return;
      }
      // create 모드: pending에 추가
      setPendingImages((prev) => [
        ...prev,
        {
          key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: "url",
          previewUrl: newImageUrl.trim(),
          caption: "",
        },
      ]);
      setNewImageUrl("");
      return;
    }

    if (!initialData) return;
    if (placeImages.length >= MAX_IMAGES) {
      toast.error(`최대 ${MAX_IMAGES}장까지만 추가할 수 있습니다.`);
      return;
    }
    startImageTransition(async () => {
      const result = await addPlaceImage(initialData.id, { url: newImageUrl.trim() });
      if (result.error) {
        toast.error(result.error);
      } else {
        setPlaceImages((prev) => [
          ...prev,
          {
            id: result.id!,
            url: newImageUrl.trim(),
            isThumbnail: prev.length === 0,
            sortOrder: prev.length,
            caption: null,
          },
        ]);
        setNewImageUrl("");
      }
    });
  }

  function handleDeleteImage(imageId: string) {
    if (!isEdit || !initialData) return;
    startImageTransition(async () => {
      const result = await deletePlaceImage(imageId, initialData.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPlaceImages((prev) => {
          const filtered = prev.filter((img) => img.id !== imageId);
          // 썸네일 재지정
          const wasThumb = prev.find((img) => img.id === imageId)?.isThumbnail;
          if (wasThumb && filtered.length > 0) {
            return filtered.map((img, i) => ({ ...img, isThumbnail: i === 0 }));
          }
          return filtered;
        });
      }
    });
  }

  function handleSetThumbnail(imageId: string) {
    if (!isEdit || !initialData) return;
    startImageTransition(async () => {
      const result = await setPlaceImageThumbnail(initialData.id, imageId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPlaceImages((prev) =>
          prev.map((img) => ({ ...img, isThumbnail: img.id === imageId })),
        );
      }
    });
  }

  function handleCaptionBlur(imageId: string, caption: string) {
    if (!isEdit || !initialData) return;
    startImageTransition(async () => {
      await updatePlaceImageCaption(imageId, initialData.id, caption);
    });
  }

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
              <Button type="submit" size="sm" disabled={isPending || isUploading}>
                {(isPending || isUploading) && (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                )}
                {isUploading ? "업로드 중…" : submitLabel}
              </Button>
            </div>
          </div>
        </div>

        {/* ── 바디 ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 px-6 py-6">
          <div className="mx-auto max-w-[1400px]">
            <div className="grid grid-cols-[1fr_320px] gap-6 items-start">

              {/* ── 왼쪽: 메인 ────────────────────────────────────────────── */}
              <div className="min-w-0 space-y-3">

                {/* STEP 1: 장소 검색 */}
                <Card className="gap-3 py-4 border-0">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      장소 검색
                    </CardTitle>
                    {hasLocation && (
                      <CardAction>
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
                      </CardAction>
                    )}
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
                <Card className="gap-3 py-4 border-0">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      기본 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                    {/* 주소 */}
                    <div className="space-y-2.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="addressKo" className="text-xs text-muted-foreground">
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
                        <Label htmlFor="addressEn" className="text-xs text-muted-foreground">
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
                          <Label htmlFor="latitude" className="text-xs text-muted-foreground">
                            위도 (Latitude)
                          </Label>
                          <Input
                            id="latitude"
                            type="number"
                            step="any"
                            value={latitude ?? ""}
                            onChange={(e) =>
                              setLatitude(e.target.value ? Number(e.target.value) : null)
                            }
                            placeholder="37.5665"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="longitude" className="text-xs text-muted-foreground">
                            경도 (Longitude)
                          </Label>
                          <Input
                            id="longitude"
                            type="number"
                            step="any"
                            value={longitude ?? ""}
                            onChange={(e) =>
                              setLongitude(e.target.value ? Number(e.target.value) : null)
                            }
                            placeholder="126.9780"
                          />
                        </div>
                      </div>
                    </div>

                  </CardContent>
                </Card>

                {/* STEP 3: 운영 정보 */}
                <Card className="gap-3 py-4 border-0">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      운영 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                    {/* 교통편 안내 */}
                    <div className="space-y-1.5">
                      <Label htmlFor="gettingThere">교통편 안내</Label>
                      <Textarea
                        id="gettingThere"
                        value={gettingThere}
                        onChange={(e) => setGettingThere(e.target.value)}
                        rows={3}
                        className="text-sm resize-none"
                        placeholder="예: 지하철 2호선 홍대입구역 9번 출구에서 도보 5분"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* STEP 4: 장소 사진 */}
                <Card className="gap-3 py-4 border-0">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      장소 사진
                    </CardTitle>
                    <CardAction>
                      <span className={`text-xs font-medium tabular-nums ${isImageLimitReached ? "text-destructive" : "text-muted-foreground"}`}>
                        {currentImageCount} / {MAX_IMAGES}
                      </span>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    {/* 파일 업로드 존 */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {isImageLimitReached ? (
                      <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 text-sm text-muted-foreground">
                        최대 {MAX_IMAGES}장을 모두 추가했습니다.
                      </div>
                    ) : (
                      <div
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed py-10 cursor-pointer transition-colors select-none ${
                          isDragOver
                            ? "border-foreground bg-muted/40"
                            : "border-border hover:border-foreground/40 hover:bg-muted/20"
                        } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">업로드 중…</p>
                          </>
                        ) : (
                          <>
                            <Upload className="h-7 w-7 text-muted-foreground/60" />
                            <div className="text-center">
                              <p className="text-sm font-medium">클릭하거나 파일을 드래그하세요</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                JPG, PNG, WebP · 최대 5MB · 최대 {MAX_IMAGES}장
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* URL 직접 입력 (보조) */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); handleAddUrlImage(); }
                          }}
                          placeholder="또는 이미지 URL 직접 입력"
                          className="text-sm pl-8"
                          disabled={isImageLimitReached}
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isImagePending || isUploading || !newImageUrl.trim() || isImageLimitReached}
                        onClick={handleAddUrlImage}
                        className="shrink-0 gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        추가
                      </Button>
                    </div>

                    {/* create 모드: pending 이미지 미리보기 */}
                    {!isEdit && pendingImages.length > 0 && (
                      <div className="space-y-2">
                        {pendingImages.map((pending, idx) => (
                          <div
                            key={pending.key}
                            className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3"
                          >
                            <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                              <Image
                                src={pending.previewUrl}
                                alt=""
                                fill
                                unoptimized
                                className="object-cover"
                                sizes="80px"
                              />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <p className="text-xs text-muted-foreground truncate">
                                {pending.type === "file" ? pending.file?.name : pending.previewUrl}
                              </p>
                              <Input
                                value={pending.caption}
                                onChange={(e) =>
                                  setPendingImages((prev) =>
                                    prev.map((p, i) =>
                                      i === idx ? { ...p, caption: e.target.value } : p,
                                    ),
                                  )
                                }
                                placeholder="캡션 (선택)"
                                className="text-xs h-7"
                              />
                              {idx === 0 && (
                                <span className="text-xs text-muted-foreground">대표 사진 (첫 번째 자동 설정)</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingImages((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* edit 모드: 저장된 이미지 목록 */}
                    {isEdit && placeImages.length > 0 && (
                      <div className="space-y-2">
                        {placeImages.map((img) => (
                          <div
                            key={img.id}
                            className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3"
                          >
                            <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-muted">
                              <Image
                                src={img.url}
                                alt=""
                                fill
                                unoptimized
                                className="object-cover"
                                sizes="80px"
                              />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <p className="text-xs text-muted-foreground truncate">{img.url}</p>
                              <Input
                                defaultValue={img.caption ?? ""}
                                placeholder="캡션 (선택)"
                                className="text-xs h-7"
                                onBlur={(e) => handleCaptionBlur(img.id, e.target.value)}
                              />
                              <label className="flex items-center gap-1.5 cursor-pointer w-fit">
                                <input
                                  type="radio"
                                  name="thumbnail"
                                  checked={img.isThumbnail}
                                  onChange={() => handleSetThumbnail(img.id)}
                                  className="accent-foreground"
                                />
                                <span className="text-xs">대표 사진</span>
                              </label>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteImage(img.id)}
                              disabled={isImagePending || isUploading}
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>

              {/* ── 오른쪽: 사이드바 ──────────────────────────────────────── */}
              <div className="w-[320px] sticky top-14 space-y-3">

                {/* 상태 카드 */}
                <Card className="gap-3 py-4 border-0">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">상태</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="status" className="text-xs">영업 상태</Label>
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isVerified" className="text-sm cursor-pointer">
                        검증된 장소
                      </Label>
                      <Switch
                        id="isVerified"
                        checked={isVerified}
                        onCheckedChange={setIsVerified}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 지역 카드 */}
                {allAreas.length > 0 && (
                  <Card className="gap-3 py-4 border-0">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">지역 <span className="text-destructive">*</span></CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={areaId ?? "none"}
                        onValueChange={(v) => setAreaId(v === "none" ? null : v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="지역 선택 (선택)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">없음</SelectItem>
                          {cities.map((city) => {
                            const cityDistricts = districts.filter(
                              (d) => d.parentId === city.id,
                            );
                            return (
                              <React.Fragment key={city.id}>
                                <SelectItem value={city.id}>
                                  {city.nameKo}
                                </SelectItem>
                                {cityDistricts.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    &nbsp;&nbsp;{d.nameKo}
                                  </SelectItem>
                                ))}
                              </React.Fragment>
                            );
                          })}
                          {districts
                            .filter((d) => !cities.some((c) => c.id === d.parentId))
                            .map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.nameKo}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                )}

                {/* 장소 유형 카드 */}
                {allPlaceTypes.length > 0 && (
                  <Card className="gap-3 py-4 border-0">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">장소 유형 <span className="text-destructive">*</span></CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {allPlaceTypes.map((pt) => {
                          const isSelected = selectedPlaceTypes.includes(pt.name);
                          return (
                            <button
                              key={pt.id}
                              type="button"
                              onClick={() => togglePlaceType(pt.name)}
                              className={`h-7 px-2.5 rounded-md text-xs font-medium border transition-colors ${
                                isSelected
                                  ? "bg-foreground text-background border-foreground"
                                  : "bg-background text-muted-foreground border-border hover:border-foreground hover:text-foreground"
                              }`}
                            >
                              {pt.nameKo}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 지도 미리보기 카드 */}
                {latitude !== null && longitude !== null && (
                  <Card className="gap-3 py-4 border-0">
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold">지도</CardTitle>
                      <CardAction>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setMapDialogOpen(true)}
                        >
                          <Map className="h-3 w-3" />
                          크게 보기
                        </button>
                      </CardAction>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-hidden rounded-lg border">
                        <MapPreview
                          key={`map-preview-${latitude}-${longitude}`}
                          lat={latitude}
                          lng={longitude}
                          zoom={15}
                          height={200}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 지도 링크 카드 */}
                <Card className="gap-3 py-4 border-0">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">지도 링크</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-1.5">
                      <Input
                        value={googleMapsUrl}
                        onChange={(e) => setGoogleMapsUrl(e.target.value)}
                        placeholder="Google Maps URL"
                        className="text-xs"
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
                        className="text-xs"
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
                        className="text-xs"
                      />
                      {kakaoMapsUrl && (
                        <a href={kakaoMapsUrl} target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
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
