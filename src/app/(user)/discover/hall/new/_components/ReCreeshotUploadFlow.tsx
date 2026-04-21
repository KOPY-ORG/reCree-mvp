"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  createReCreeshot,
  getPostsByPlace,
} from "@/app/(user)/_actions/recreeshot-actions";
import {
  getReCreeshotPresignedUrl,
  deleteReCreeshotImages,
} from "@/lib/actions/upload-actions";
import { UploadStep2 } from "./UploadStep2";
import { TemplateSelector } from "./editor/TemplateSelector";
import { PhotoPlacer } from "./editor/PhotoPlacer";
import { ReCreeshotEditor } from "./editor/ReCreeshotEditor";
import { DoneStep } from "./editor/DoneStep";
import { DEFAULT_TEMPLATE_ID } from "./editor/template-config";
import type { TemplateId } from "./editor/editor-types";
import type { PlaceResult, TagGroup as EditorTagGroup, TopicItem } from "./editor/StickerPanel";
import { resolveBadgeOptions } from "./editor/StickerPanel";

interface PostResult {
  id: string;
  titleEn: string | null;
  titleKo: string | null;
  thumbnailUrl: string | null;
  topicIds: string[];
  tagIds: string[];
}

interface PlacePrefill {
  id: string;
  nameEn: string | null;
  nameKo: string | null;
  addressEn: string | null;
  imageUrl: string | null;
}

interface Props {
  tagGroups: EditorTagGroup[];
  topics: TopicItem[];
  userId: string;
  prefillPostId?: string;
  prefillReferenceUrl?: string;
  prefillPlace?: PlacePrefill;
  prefillTagIds?: string[];
  prefillTopicIds?: string[];
}

type Step = 1 | 2 | 3 | 4 | 5;

type State = {
  step: Step;
  selectedTemplateId: TemplateId;
  // 사진
  referenceFile: File | null;
  referencePreviewUrl: string | null;
  shotFile: File | null;
  shotPreviewUrl: string | null;
  // R2 업로드 결과
  uploadedReferenceUrl: string | null;
  uploadedShotUrl: string | null;
  uploadedShotPath: string | null;
  uploadedReferencePath: string | null;
  // Step 3에서 선택한 장소·태그
  selectedPlace: PlaceResult | null;
  selectedTagIds: string[];
  selectedTopicIds: string[];
  linkedPosts: PostResult[];
  linkedPostId: string | undefined;
  // DB 저장 결과
  createdId: string | null;
  // 에디터에서 export된 합성 이미지 URL
  compositeUrl: string | null;
  // UI
  isUploading: boolean;
  isSubmitting: boolean;
  error: string | null;
  showLeaveDialog: boolean;
};


export function ReCreeshotUploadFlow({
  tagGroups,
  topics,
  prefillPostId,
  prefillReferenceUrl,
  prefillPlace,
  prefillTagIds = [],
  prefillTopicIds = [],
}: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>({
    step: 1,
    selectedTemplateId: DEFAULT_TEMPLATE_ID,
    referenceFile: null,
    referencePreviewUrl: prefillReferenceUrl ?? null,
    shotFile: null,
    shotPreviewUrl: null,
    uploadedReferenceUrl: prefillReferenceUrl ?? null,
    uploadedShotUrl: null,
    uploadedShotPath: null,
    uploadedReferencePath: null,
    selectedPlace: prefillPlace
      ? { id: prefillPlace.id, nameEn: prefillPlace.nameEn, nameKo: prefillPlace.nameKo, addressEn: prefillPlace.addressEn, city: null, imageUrl: prefillPlace.imageUrl }
      : null,
    selectedTagIds: prefillTagIds ?? [],
    selectedTopicIds: prefillTopicIds ?? [],
    linkedPosts: [],
    linkedPostId: prefillPostId,
    createdId: null,
    compositeUrl: null,
    isUploading: false,
    isSubmitting: false,
    error: null,
    showLeaveDialog: false,
  });

  // 장소 변경 시 연결 포스트 로드
  useEffect(() => {
    if (!state.selectedPlace) { setState((s) => ({ ...s, linkedPosts: [], linkedPostId: undefined })); return; }
    getPostsByPlace(state.selectedPlace.id).then((posts) => setState((s) => ({ ...s, linkedPosts: posts })));
  }, [state.selectedPlace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 업로드됐지만 DB 저장 전 이탈 시 고아 파일 방지
  const hasUnsavedUpload = !!state.uploadedShotUrl && !state.createdId;

  useEffect(() => {
    if (!hasUnsavedUpload) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedUpload]);

  // ── 이미지 URL 관리 ──────────────────────────────────────────────────────────

  function setReferencePhoto(file: File) {
    const url = URL.createObjectURL(file);
    setState((s) => {
      if (s.referencePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(s.referencePreviewUrl);
      return { ...s, referenceFile: file, referencePreviewUrl: url, uploadedReferenceUrl: null, uploadedReferencePath: null };
    });
  }

  function setShotPhoto(file: File) {
    const url = URL.createObjectURL(file);
    setState((s) => {
      if (s.shotPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(s.shotPreviewUrl);
      return { ...s, shotFile: file, shotPreviewUrl: url, uploadedShotUrl: null, uploadedShotPath: null };
    });
  }

  function removeReferencePhoto() {
    setState((s) => {
      if (s.referencePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(s.referencePreviewUrl);
      return { ...s, referenceFile: null, referencePreviewUrl: null, uploadedReferenceUrl: null, uploadedReferencePath: null };
    });
  }

  function removeShotPhoto() {
    setState((s) => {
      if (s.shotPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(s.shotPreviewUrl);
      return { ...s, shotFile: null, shotPreviewUrl: null, uploadedShotUrl: null, uploadedShotPath: null };
    });
  }

  // ── R2 업로드 ────────────────────────────────────────────────────────────────

  async function uploadToR2(file: File): Promise<{ url: string; path: string }> {
    const result = await getReCreeshotPresignedUrl(file.name, file.type);
    if ("error" in result) throw new Error(result.error);
    const res = await fetch(result.presignedUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    return { url: result.cdnUrl, path: result.path };
  }

  async function deleteOrphanedFiles() {
    const paths: string[] = [];
    if (state.uploadedShotPath) paths.push(state.uploadedShotPath);
    if (state.uploadedReferencePath) paths.push(state.uploadedReferencePath);
    if (paths.length > 0) await deleteReCreeshotImages(paths);
  }

  // ── 네비게이션 ───────────────────────────────────────────────────────────────

  function handleBack() {
    if (state.step === 5) { router.push("/explore?tab=hall"); return; }
    if (state.step === 1) {
      if (hasUnsavedUpload) { setState((s) => ({ ...s, showLeaveDialog: true })); }
      else { router.back(); }
      return;
    }
    setState((s) => ({ ...s, step: (s.step - 1) as Step, error: null }));
  }

  async function confirmLeave() {
    await deleteOrphanedFiles();
    router.back();
  }

  // ── Step 2 → 3: 사진 업로드 ──────────────────────────────────────────────────

  async function handlePhotosNext() {
    if (!state.shotFile && !state.uploadedShotUrl) return;
    setState((s) => ({ ...s, isUploading: true, error: null }));

    try {
      const [shotResult, refResult] = await Promise.all([
        state.shotFile ? uploadToR2(state.shotFile) : Promise.resolve(null),
        state.referenceFile ? uploadToR2(state.referenceFile) : Promise.resolve(null),
      ]);

      setState((s) => ({
        ...s,
        isUploading: false,
        step: 3,
        uploadedShotUrl: shotResult?.url ?? s.uploadedShotUrl,
        uploadedShotPath: shotResult?.path ?? s.uploadedShotPath,
        uploadedReferenceUrl: refResult?.url ?? s.uploadedReferenceUrl,
        uploadedReferencePath: refResult?.path ?? s.uploadedReferencePath,
      }));
    } catch (e) {
      console.error(e);
      setState((s) => ({ ...s, isUploading: false, error: "Upload failed. Please try again." }));
    }
  }

  // ── Step 3 → 4: 에디터 export 완료 ──────────────────────────────────────────

  function handleEditorNext(compositeUrl: string) {
    setState((s) => ({ ...s, compositeUrl, step: 4 }));
  }

  // ── Step 4: Share (createReCreeshot) ─────────────────────────────────────────

  async function handleShare(data: {
    story: string;
    tips: string;
    showBadge: boolean;
  }) {
    const imageUrl = state.compositeUrl ?? state.uploadedShotUrl;
    if (!imageUrl) return;
    setState((s) => ({ ...s, isSubmitting: true, error: null }));

    const result = await createReCreeshot({
      imageUrl,
      referencePhotoUrl: state.uploadedReferenceUrl ?? undefined,
      placeId: state.selectedPlace?.id,
      linkedPostId: state.linkedPostId,
      locationName: state.selectedPlace?.nameEn ?? state.selectedPlace?.nameKo ?? undefined,
      story: data.story || undefined,
      tips: data.tips || undefined,
      tagIds: state.selectedTagIds,
      topicIds: state.selectedTopicIds,
      templateId: state.selectedTemplateId,
    });

    if ("error" in result) {
      setState((s) => ({ ...s, isSubmitting: false, error: result.error }));
      return;
    }

    setState((s) => ({ ...s, isSubmitting: false, createdId: result.id, step: 5 }));
  }

  // ── 렌더링 ───────────────────────────────────────────────────────────────────

  const STEP_TITLES: Record<Step, string> = {
    1: "Choose layout",
    2: "Add photos",
    3: "Decorate",
    4: "Share",
    5: "",
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 헤더 */}
      <header className="app-header">
        <div className="relative h-12 flex items-center px-2">
          {state.step !== 5 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center size-8"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <span className="absolute left-1/2 -translate-x-1/2 font-bold text-base tracking-tight">
            {state.step === 5 ? "reCree" : STEP_TITLES[state.step]}
          </span>
          {/* 단계 표시 (step 1~4) */}
          {state.step < 5 && (
            <span className="absolute right-4 text-xs text-muted-foreground">
              {state.step}/4
            </span>
          )}
        </div>
      </header>

      {/* Step 1: 템플릿 선택 */}
      {state.step === 1 && (
        <TemplateSelector
          selected={state.selectedTemplateId}
          onSelect={(id) => setState((s) => ({ ...s, selectedTemplateId: id }))}
          onNext={() => setState((s) => ({ ...s, step: 2 }))}
        />
      )}

      {/* Step 2: 사진 배치 */}
      {state.step === 2 && (
        <>
          <PhotoPlacer
            templateId={state.selectedTemplateId}
            referencePreviewUrl={state.referencePreviewUrl}
            shotPreviewUrl={state.shotPreviewUrl}
            onReferenceChange={setReferencePhoto}
            onShotChange={setShotPhoto}
            onReferenceRemove={removeReferencePhoto}
            onShotRemove={removeShotPhoto}
            onNext={handlePhotosNext}
            isUploading={state.isUploading}
          />
          {state.error && (
            <p className="text-red-500 text-sm text-center py-2">{state.error}</p>
          )}
        </>
      )}

      {/* Step 3: 꾸미기 */}
      {state.step === 3 && state.shotPreviewUrl && (
        <>
          <ReCreeshotEditor
            templateId={state.selectedTemplateId}
            referencePreviewUrl={state.referencePreviewUrl}
            shotPreviewUrl={state.shotPreviewUrl}
            uploadedReferenceUrl={state.uploadedReferenceUrl}
            uploadedShotUrl={state.uploadedShotUrl ?? ""}
            onNext={handleEditorNext}
            onError={(msg) => setState((s) => ({ ...s, error: msg }))}
            selectedPlace={state.selectedPlace}
            onPlaceChange={(place) => setState((s) => ({ ...s, selectedPlace: place }))}
            linkedPosts={state.linkedPosts}
            linkedPostId={state.linkedPostId}
            onLinkedPostChange={(id, tagIds, topicIds) => setState((s) => ({
              ...s,
              linkedPostId: id,
              ...(tagIds !== undefined && topicIds !== undefined ? { selectedTagIds: tagIds, selectedTopicIds: topicIds } : {}),
            }))}
            selectedTagIds={state.selectedTagIds}
            selectedTopicIds={state.selectedTopicIds}
            onTagsChange={(tagIds, topicIds) => setState((s) => ({ ...s, selectedTagIds: tagIds, selectedTopicIds: topicIds }))}
            tagGroups={tagGroups}
            topics={topics}
          />
          {state.error && (
            <p className="text-red-500 text-sm text-center py-2">{state.error}</p>
          )}
        </>
      )}

      {/* Step 4: 공유/메타데이터 (기존 UploadStep2 재사용) */}
      {state.step === 4 && state.shotPreviewUrl && (state.compositeUrl ?? state.uploadedShotUrl) && (
        <>
          <UploadStep2
            compositeUrl={state.compositeUrl}
            selectedPlace={state.selectedPlace}
            badgeOptions={resolveBadgeOptions(topics, tagGroups, state.selectedTopicIds, state.selectedTagIds)}
            onShare={handleShare}
            isSubmitting={state.isSubmitting}
          />
          {state.error && (
            <p className="text-red-500 text-sm text-center py-2">{state.error}</p>
          )}
        </>
      )}

      {/* Step 5: 완료 */}
      {state.step === 5 && state.shotPreviewUrl && state.createdId && (
        <DoneStep
          shotPreviewUrl={state.shotPreviewUrl}
          createdId={state.createdId}
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
