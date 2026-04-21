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
import { TemplateModeSelector } from "./TemplateModeSelector";
import { LayoutSelector } from "./editor/LayoutSelector";
import { PhotoPlacer } from "./editor/PhotoPlacer";
import { ReCreeshotEditor } from "./editor/ReCreeshotEditor";
import { DoneStep } from "./editor/DoneStep";
import { DEFAULT_TEMPLATE_ID } from "./editor/template-config";
import type { TemplateId, TemplateModeId } from "./editor/editor-types";
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

// 플로우 단계 — 문자열 기반으로 관리하면 모드별 분기가 명확해짐
type FlowStep =
  | "choose-mode"     // Step 1: 모드 선택 (전체 공통)
  | "choose-layout"   // Step 2: 레이아웃 선택 (side-by-side 전용)
  | "add-photos"      // Step 3/2: 사진 추가
  | "decorate"        // Step 4/3: 꾸미기
  | "share"           // Step 5/4: 공유
  | "done";           // 완료

type State = {
  step: FlowStep;
  // ── 모드/레이아웃
  templateMode: TemplateModeId;
  selectedTemplateId: TemplateId;   // side-by-side 레이아웃 선택
  // ── 사진 (side-by-side)
  referenceFile: File | null;
  referencePreviewUrl: string | null;
  shotFile: File | null;
  shotPreviewUrl: string | null;
  // ── R2 업로드 결과 (side-by-side)
  uploadedReferenceUrl: string | null;
  uploadedShotUrl: string | null;
  uploadedShotPath: string | null;
  uploadedReferencePath: string | null;
  // ── 사진 (4-cuts) — 4개 슬롯
  cutFiles: [File | null, File | null, File | null, File | null];
  cutPreviewUrls: [string | null, string | null, string | null, string | null];
  uploadedCutUrls: [string | null, string | null, string | null, string | null];
  uploadedCutPaths: [string | null, string | null, string | null, string | null];
  // ── 사진 (solo) — 1개 슬롯
  soloFile: File | null;
  soloPreviewUrl: string | null;
  uploadedSoloUrl: string | null;
  uploadedSoloPath: string | null;
  // ── 공통 메타데이터
  selectedPlace: PlaceResult | null;
  selectedTagIds: string[];
  selectedTopicIds: string[];
  linkedPosts: PostResult[];
  linkedPostId: string | undefined;
  // ── 결과
  createdId: string | null;
  compositeUrl: string | null;
  // ── UI 상태
  isUploading: boolean;
  isSubmitting: boolean;
  error: string | null;
  showLeaveDialog: boolean;
};

// 헤더 제목 및 progress 계산 헬퍼
function getStepMeta(step: FlowStep, mode: TemplateModeId): { title: string; progress: string } {
  const TOTAL = mode === "side-by-side" ? 5 : 4;
  const NUM: Record<FlowStep, number> = {
    "choose-mode": 1,
    "choose-layout": 2,
    "add-photos": mode === "side-by-side" ? 3 : 2,
    "decorate": mode === "side-by-side" ? 4 : 3,
    "share": mode === "side-by-side" ? 5 : 4,
    "done": 0,
  };
  const TITLES: Record<FlowStep, string> = {
    "choose-mode": "Choose template",
    "choose-layout": "Choose layout",
    "add-photos": "Add photos",
    "decorate": "Decorate",
    "share": "Share",
    "done": "",
  };
  return { title: TITLES[step], progress: `${NUM[step]}/${TOTAL}` };
}

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
    step: "choose-mode",
    templateMode: "side-by-side",
    selectedTemplateId: DEFAULT_TEMPLATE_ID,
    referenceFile: null,
    referencePreviewUrl: prefillReferenceUrl ?? null,
    shotFile: null,
    shotPreviewUrl: null,
    uploadedReferenceUrl: prefillReferenceUrl ?? null,
    uploadedShotUrl: null,
    uploadedShotPath: null,
    uploadedReferencePath: null,
    cutFiles: [null, null, null, null],
    cutPreviewUrls: [null, null, null, null],
    uploadedCutUrls: [null, null, null, null],
    uploadedCutPaths: [null, null, null, null],
    soloFile: null,
    soloPreviewUrl: null,
    uploadedSoloUrl: null,
    uploadedSoloPath: null,
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
    if (!state.selectedPlace) {
      setState((s) => ({ ...s, linkedPosts: [], linkedPostId: undefined }));
      return;
    }
    getPostsByPlace(state.selectedPlace.id).then((posts) =>
      setState((s) => ({ ...s, linkedPosts: posts }))
    );
  }, [state.selectedPlace?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 업로드 후 DB 저장 전 이탈 방지
  const hasUnsavedUpload =
    (!!state.uploadedShotUrl || !!state.uploadedCutUrls[0] || !!state.uploadedSoloUrl) &&
    !state.createdId;

  useEffect(() => {
    if (!hasUnsavedUpload) return;
    function onBeforeUnload(e: BeforeUnloadEvent) { e.preventDefault(); }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedUpload]);

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
    if (state.uploadedSoloPath) paths.push(state.uploadedSoloPath);
    state.uploadedCutPaths.forEach((p) => { if (p) paths.push(p); });
    if (paths.length > 0) await deleteReCreeshotImages(paths);
  }

  // ── 사진 setter (side-by-side) ───────────────────────────────────────────────

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

  // ── 네비게이션 ───────────────────────────────────────────────────────────────

  function handleBack() {
    if (state.step === "done") { router.push("/explore?tab=hall"); return; }
    if (state.step === "choose-mode") {
      if (hasUnsavedUpload) { setState((s) => ({ ...s, showLeaveDialog: true })); }
      else { router.back(); }
      return;
    }
    // 단계 역방향
    const PREV_STEP: Partial<Record<FlowStep, FlowStep>> = {
      "choose-layout": "choose-mode",
      "add-photos": state.templateMode === "side-by-side" ? "choose-layout" : "choose-mode",
      "decorate": "add-photos",
      "share": "decorate",
    };
    const prev = PREV_STEP[state.step];
    if (prev) setState((s) => ({ ...s, step: prev, error: null }));
  }

  async function confirmLeave() {
    await deleteOrphanedFiles();
    router.back();
  }

  // ── Step 1: 모드 선택 → 다음 ────────────────────────────────────────────────

  function handleModeNext() {
    if (state.templateMode === "side-by-side") {
      setState((s) => ({ ...s, step: "choose-layout" }));
    } else {
      setState((s) => ({ ...s, step: "add-photos" }));
    }
  }

  // ── Step 2 (side-by-side): 레이아웃 선택 → 다음 ────────────────────────────

  function handleLayoutNext() {
    setState((s) => ({ ...s, step: "add-photos" }));
  }

  // ── Add photos → Decorate: R2 업로드 후 진행 ─────────────────────────────────

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
        step: "decorate",
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

  // ── Decorate → Share ─────────────────────────────────────────────────────────

  function handleEditorNext(compositeUrl: string) {
    setState((s) => ({ ...s, compositeUrl, step: "share" }));
  }

  // ── Share: DB 저장 ───────────────────────────────────────────────────────────

  async function handleShare(data: { story: string; tips: string; showBadge: boolean }) {
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
      templateId: state.templateMode === "side-by-side" ? state.selectedTemplateId : state.templateMode,
      templateMode: state.templateMode,
      cut1Url: state.uploadedCutUrls[0] ?? undefined,
      cut2Url: state.uploadedCutUrls[1] ?? undefined,
      cut3Url: state.uploadedCutUrls[2] ?? undefined,
      cut4Url: state.uploadedCutUrls[3] ?? undefined,
    });

    if ("error" in result) {
      setState((s) => ({ ...s, isSubmitting: false, error: result.error }));
      return;
    }
    setState((s) => ({ ...s, isSubmitting: false, createdId: result.id, step: "done" }));
  }

  // ── 렌더링 ───────────────────────────────────────────────────────────────────

  const { title, progress } = getStepMeta(state.step, state.templateMode);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 헤더 */}
      <header className="app-header">
        <div className="relative h-12 flex items-center px-2">
          {state.step !== "done" && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center size-8"
            >
              <ChevronLeft className="size-5" />
            </button>
          )}
          <span className="absolute left-1/2 -translate-x-1/2 font-bold text-base tracking-tight">
            {state.step === "done" ? "reCree" : title}
          </span>
          {state.step !== "done" && (
            <span className="absolute right-4 text-xs text-muted-foreground">
              {progress}
            </span>
          )}
        </div>
      </header>

      {/* Step 1: 모드 선택 */}
      {state.step === "choose-mode" && (
        <TemplateModeSelector
          selected={state.templateMode}
          onSelect={(mode) => setState((s) => ({ ...s, templateMode: mode }))}
          onNext={handleModeNext}
        />
      )}

      {/* Step 2 (side-by-side): 레이아웃 선택 */}
      {state.step === "choose-layout" && (
        <LayoutSelector
          selected={state.selectedTemplateId}
          onSelect={(id) => setState((s) => ({ ...s, selectedTemplateId: id }))}
          onNext={handleLayoutNext}
        />
      )}

      {/* Add photos (side-by-side) */}
      {state.step === "add-photos" && state.templateMode === "side-by-side" && (
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

      {/* Add photos (4-cuts) — TODO: 전용 컴포넌트 구현 예정 */}
      {state.step === "add-photos" && state.templateMode === "4-cuts" && (
        <div className="flex flex-col flex-1 items-center justify-center gap-4 px-4">
          <p className="text-muted-foreground text-sm text-center">
            4 cuts photo picker — coming next
          </p>
          <button
            type="button"
            onClick={() => setState((s) => ({ ...s, step: "decorate" }))}
            className="px-6 py-2 rounded-full bg-brand text-black text-sm font-semibold"
          >
            Next →
          </button>
        </div>
      )}

      {/* Add photos (solo) — TODO: 전용 컴포넌트 구현 예정 */}
      {state.step === "add-photos" && state.templateMode === "solo" && (
        <div className="flex flex-col flex-1 items-center justify-center gap-4 px-4">
          <p className="text-muted-foreground text-sm text-center">
            Solo photo picker — coming next
          </p>
          <button
            type="button"
            onClick={() => setState((s) => ({ ...s, step: "decorate" }))}
            className="px-6 py-2 rounded-full bg-brand text-black text-sm font-semibold"
          >
            Next →
          </button>
        </div>
      )}

      {/* Decorate (side-by-side) */}
      {state.step === "decorate" && state.templateMode === "side-by-side" && state.shotPreviewUrl && (
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
            onLinkedPostChange={(id, tagIds, topicIds) =>
              setState((s) => ({
                ...s,
                linkedPostId: id,
                ...(tagIds !== undefined && topicIds !== undefined
                  ? { selectedTagIds: tagIds, selectedTopicIds: topicIds }
                  : {}),
              }))
            }
            selectedTagIds={state.selectedTagIds}
            selectedTopicIds={state.selectedTopicIds}
            onTagsChange={(tagIds, topicIds) =>
              setState((s) => ({ ...s, selectedTagIds: tagIds, selectedTopicIds: topicIds }))
            }
            tagGroups={tagGroups}
            topics={topics}
          />
          {state.error && (
            <p className="text-red-500 text-sm text-center py-2">{state.error}</p>
          )}
        </>
      )}

      {/* Decorate (4-cuts) — TODO */}
      {state.step === "decorate" && state.templateMode === "4-cuts" && (
        <div className="flex flex-col flex-1 items-center justify-center gap-4 px-4">
          <p className="text-muted-foreground text-sm text-center">
            4 cuts decorator — coming next
          </p>
          <button
            type="button"
            onClick={() => handleEditorNext("")}
            className="px-6 py-2 rounded-full bg-brand text-black text-sm font-semibold"
          >
            Next →
          </button>
        </div>
      )}

      {/* Decorate (solo) — TODO */}
      {state.step === "decorate" && state.templateMode === "solo" && (
        <div className="flex flex-col flex-1 items-center justify-center gap-4 px-4">
          <p className="text-muted-foreground text-sm text-center">
            Solo decorator — coming next
          </p>
          <button
            type="button"
            onClick={() => handleEditorNext("")}
            className="px-6 py-2 rounded-full bg-brand text-black text-sm font-semibold"
          >
            Next →
          </button>
        </div>
      )}

      {/* Share */}
      {state.step === "share" && (state.compositeUrl ?? state.uploadedShotUrl) && (
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

      {/* Done */}
      {state.step === "done" && state.createdId && (
        <DoneStep
          shotPreviewUrl={
            state.compositeUrl ??
            state.shotPreviewUrl ??
            state.soloPreviewUrl ??
            state.cutPreviewUrls[0] ??
            ""
          }
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
