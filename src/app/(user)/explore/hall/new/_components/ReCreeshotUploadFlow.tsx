"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createReCreeshot,
  previewMatchScore,
} from "@/app/(user)/_actions/recreeshot-actions";
import { UploadStep1 } from "./UploadStep1";
import { UploadStep2 } from "./UploadStep2";
import { UploadStep3 } from "./UploadStep3";
import { ImageCropOverlay } from "./ImageCropOverlay";

interface TagItem {
  id: string;
  name: string;
  group: string;
  colorHex: string | null;
  colorHex2: string | null;
  textColorHex: string | null;
}

interface TagGroup {
  group: string;
  nameEn: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
  tags: TagItem[];
}

interface Topic {
  id: string;
  nameEn: string;
  colorHex: string | null;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string | null;
  level: number;
  parentId: string | null;
}

interface PlacePrefill {
  id: string;
  nameEn: string | null;
  nameKo: string | null;
  addressEn: string | null;
  imageUrl: string | null;
}

interface Props {
  tagGroups: TagGroup[];
  topics: Topic[];
  userId: string;
  prefillPostId?: string;
  prefillReferenceUrl?: string;
  prefillPlace?: PlacePrefill;
  prefillTagIds?: string[];
  prefillTopicIds?: string[];
}

type State = {
  step: 1 | 2 | 3;
  referenceFile: File | null;
  referencePreviewUrl: string | null;
  shotFile: File | null;
  shotPreviewUrl: string | null;
  // 업로드된 URL (공개 접근용)
  uploadedReferenceUrl: string | null;
  uploadedShotUrl: string | null;
  // 업로드된 스토리지 경로 (삭제용)
  uploadedShotPath: string | null;
  uploadedReferencePath: string | null;
  previewScore: number | null;
  isScoringPreview: boolean;
  scoringDone: boolean;
  createdId: string | null;
  matchScore: number | null;
  showBadge: boolean;
  isUploading: boolean;
  isSubmitting: boolean;
  error: string | null;
  showLeaveDialog: boolean;
};

export function ReCreeshotUploadFlow({ tagGroups, topics, userId, prefillPostId, prefillReferenceUrl, prefillPlace, prefillTagIds = [], prefillTopicIds = [] }: Props) {
  const router = useRouter();
  const [pendingCrop, setPendingCrop] = useState<{ file: File; type: "shot" | "reference" } | null>(null);
  const [state, setState] = useState<State>({
    step: 1,
    referenceFile: null,
    referencePreviewUrl: prefillReferenceUrl ?? null,
    shotFile: null,
    shotPreviewUrl: null,
    uploadedReferenceUrl: prefillReferenceUrl ?? null,
    uploadedShotUrl: null,
    uploadedShotPath: null,
    uploadedReferencePath: null,
    previewScore: null,
    isScoringPreview: false,
    scoringDone: false,
    createdId: null,
    matchScore: null,
    showBadge: true,
    isUploading: false,
    isSubmitting: false,
    error: null,
    showLeaveDialog: false,
  });

  // 이미지가 업로드됐지만 DB에 저장되지 않은 상태 = 이탈 시 고아 파일 발생
  const hasUnsavedUpload = !!state.uploadedShotUrl && !state.createdId;

  // 브라우저 탭 닫기 / 새로고침 차단
  useEffect(() => {
    if (!hasUnsavedUpload) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedUpload]);

  function handleReferenceChange(file: File) {
    setPendingCrop({ file, type: "reference" });
  }

  function handleShotChange(file: File) {
    setPendingCrop({ file, type: "shot" });
  }

  function handleCropConfirm(croppedFile: File) {
    if (!pendingCrop) return;
    const url = URL.createObjectURL(croppedFile);
    if (pendingCrop.type === "shot") {
      setState((s) => ({ ...s, shotFile: croppedFile, shotPreviewUrl: url, previewScore: null, scoringDone: false }));
    } else {
      setState((s) => ({ ...s, referenceFile: croppedFile, referencePreviewUrl: url, previewScore: null, scoringDone: false }));
    }
    setPendingCrop(null);
  }

  function handleReferenceRemove() {
    setState((s) => ({
      ...s,
      referenceFile: null,
      referencePreviewUrl: null,
      previewScore: null,
      scoringDone: false,
    }));
  }

  function handleShotRemove() {
    setState((s) => ({
      ...s,
      shotFile: null,
      shotPreviewUrl: null,
      previewScore: null,
      scoringDone: false,
    }));
  }

  async function uploadToSupabase(file: File): Promise<{ url: string; path: string }> {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("recreeshot-images")
      .upload(path, file, { upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from("recreeshot-images").getPublicUrl(path);
    return { url: data.publicUrl, path };
  }

  async function deleteOrphanedFiles() {
    const paths: string[] = [];
    if (state.uploadedShotPath) paths.push(state.uploadedShotPath);
    if (state.uploadedReferencePath) paths.push(state.uploadedReferencePath);
    if (paths.length === 0) return;

    const supabase = createClient();
    await supabase.storage.from("recreeshot-images").remove(paths);
  }

  // 이탈 확인 → 고아 파일 정리 후 이동
  async function confirmLeave() {
    await deleteOrphanedFiles();
    router.push("/explore?tab=hall");
  }

  function handleBack() {
    if (state.step === 3) {
      // Step3는 이미 DB 저장 완료 → 바로 이동
      router.push("/explore?tab=hall");
      return;
    }
    if (state.step === 2) {
      // Step2에서 뒤로 → Step1으로 (업로드는 유지)
      setState((s) => ({ ...s, step: 1 }));
      return;
    }
    // Step1: 업로드된 파일 있으면 확인 다이얼로그, 없으면 바로 이동
    if (hasUnsavedUpload) {
      setState((s) => ({ ...s, showLeaveDialog: true }));
    } else {
      router.push("/explore?tab=hall");
    }
  }

  // original + shot 있을 때 → 업로드 후 Gemini 채점
  async function handleCheckScore() {
    if (!state.shotFile) return;
    if (!state.referenceFile && !state.uploadedReferenceUrl) return;

    setState((s) => ({ ...s, isScoringPreview: true, error: null }));

    try {
      // shot은 항상 업로드, reference는 이미 URL 있으면 재사용
      const [shot, refUpload] = await Promise.all([
        uploadToSupabase(state.shotFile),
        state.referenceFile ? uploadToSupabase(state.referenceFile) : Promise.resolve(null),
      ]);

      const refUrl = refUpload?.url ?? state.uploadedReferenceUrl!;
      const refPath = refUpload?.path ?? state.uploadedReferencePath;

      const result = await previewMatchScore(refUrl, shot.url);

      if ("error" in result) {
        setState((s) => ({
          ...s,
          isScoringPreview: false,
          uploadedShotUrl: shot.url,
          uploadedShotPath: shot.path,
          uploadedReferenceUrl: refUrl,
          uploadedReferencePath: refPath,
          scoringDone: true,
          previewScore: null,
          matchScore: null,
        }));
        return;
      }

      setState((s) => ({
        ...s,
        isScoringPreview: false,
        uploadedShotUrl: shot.url,
        uploadedShotPath: shot.path,
        uploadedReferenceUrl: refUrl,
        uploadedReferencePath: refPath,
        previewScore: result.score,
        matchScore: result.score,
        scoringDone: true,
      }));
    } catch (e) {
      console.error(e);
      setState((s) => ({ ...s, isScoringPreview: false, error: "업로드 실패. 다시 시도해주세요." }));
    }
  }

  // original 없을 때 → 업로드만 하고 Step2
  async function handleNext() {
    if (!state.shotFile) return;

    setState((s) => ({ ...s, isUploading: true, error: null }));

    try {
      const shot = await uploadToSupabase(state.shotFile);

      setState((s) => ({
        ...s,
        uploadedShotUrl: shot.url,
        uploadedShotPath: shot.path,
        isUploading: false,
        step: 2,
      }));
    } catch (e) {
      console.error(e);
      setState((s) => ({ ...s, isUploading: false, error: "업로드 실패. 다시 시도해주세요." }));
    }
  }

  // scoringDone 후 Step2로 이동
  function handleGoToStep2() {
    setState((s) => ({ ...s, step: 2 }));
  }

  async function handleShare(data: {
    locationName: string;
    story: string;
    tips: string;
    tagIds: string[];
    topicIds: string[];
    placeId?: string;
    linkedPostId?: string;
    showBadge: boolean;
  }) {
    if (!state.uploadedShotUrl) return;

    setState((s) => ({ ...s, isSubmitting: true, error: null }));

    const result = await createReCreeshot({
      imageUrl: state.uploadedShotUrl,
      referencePhotoUrl: state.uploadedReferenceUrl ?? undefined,
      matchScore: state.matchScore ?? undefined,
      showBadge: data.showBadge,
      placeId: data.placeId,
      linkedPostId: data.linkedPostId,
      locationName: data.locationName || undefined,
      story: data.story || undefined,
      tips: data.tips || undefined,
      tagIds: data.tagIds,
      topicIds: data.topicIds,
    });

    if ("error" in result) {
      setState((s) => ({ ...s, isSubmitting: false, error: result.error }));
      return;
    }

    setState((s) => ({
      ...s,
      isSubmitting: false,
      createdId: result.id,
      step: 3,
    }));
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="app-header">
        <div className="relative h-12 flex items-center px-2">
          {state.step !== 3 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center size-8"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <span className="absolute left-1/2 -translate-x-1/2 font-bold text-base tracking-tight">
            reCree
          </span>
        </div>
      </header>

      {state.step === 1 && (
        <>
          <UploadStep1
            referencePreviewUrl={state.referencePreviewUrl}
            shotPreviewUrl={state.shotPreviewUrl}
            onReferenceChange={handleReferenceChange}
            onShotChange={handleShotChange}
            onReferenceRemove={handleReferenceRemove}
            onShotRemove={handleShotRemove}
            previewScore={state.previewScore}
            isScoringPreview={state.isScoringPreview}
            scoringDone={state.scoringDone}
            onCheckScore={handleCheckScore}
            onNext={(state.referenceFile || state.uploadedReferenceUrl) ? handleGoToStep2 : handleNext}
            isUploading={state.isUploading}
            prefillReferenceUrl={prefillReferenceUrl}
            onRestoreReference={prefillReferenceUrl ? () => {
              setState((s) => ({ ...s, referencePreviewUrl: prefillReferenceUrl, uploadedReferenceUrl: prefillReferenceUrl, referenceFile: null, previewScore: null, scoringDone: false }));
            } : undefined}
          />
          {state.error && (
            <p className="text-red-500 text-sm text-center py-2">{state.error}</p>
          )}
        </>
      )}

      {state.step === 2 && state.shotPreviewUrl && state.uploadedShotUrl && (
        <>
          <UploadStep2
            referencePreviewUrl={state.referencePreviewUrl}
            shotPreviewUrl={state.shotPreviewUrl}
            tagGroups={tagGroups}
            topics={topics}
            previewScore={state.previewScore}
            showBadge={state.showBadge}
            onShowBadgeChange={(val) => setState((s) => ({ ...s, showBadge: val }))}
            onBack={() => setState((s) => ({ ...s, step: 1 }))}
            onShare={handleShare}
            isSubmitting={state.isSubmitting}
            prefillPostId={prefillPostId}
            prefillPlace={prefillPlace}
            prefillTagIds={prefillTagIds}
            prefillTopicIds={prefillTopicIds}
          />
          {state.error && (
            <p className="text-red-500 text-sm text-center py-2">{state.error}</p>
          )}
        </>
      )}

      {state.step === 3 && state.shotPreviewUrl && state.createdId && (
        <UploadStep3
          shotPreviewUrl={state.shotPreviewUrl}
          referencePreviewUrl={state.referencePreviewUrl}
          matchScore={state.matchScore}
          showBadge={state.showBadge}
          createdId={state.createdId}
          userId={userId}
          uploadedShotPath={state.uploadedShotPath}
        />
      )}

      {/* 크롭 오버레이 */}
      {pendingCrop && (
        <ImageCropOverlay
          file={pendingCrop.file}
          onConfirm={handleCropConfirm}
          onClose={() => setPendingCrop(null)}
        />
      )}

      {/* 이탈 확인 다이얼로그 */}
      {state.showLeaveDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-8">
          <div className="w-full max-w-sm bg-background rounded-2xl overflow-hidden">
            <div className="px-5 pt-6 pb-4 text-center space-y-1.5">
              <p className="font-bold text-base">Leave this page?</p>
              <p className="text-sm text-muted-foreground">
                Your uploaded images will be deleted<br />and your progress won&apos;t be saved.
              </p>
            </div>
            <div className="border-t border-border/50">
              <button
                type="button"
                onClick={confirmLeave}
                className="w-full py-3.5 text-sm font-semibold text-red-500 border-b border-border/50"
              >
                Leave
              </button>
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, showLeaveDialog: false }))}
                className="w-full py-3.5 text-sm font-semibold"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
