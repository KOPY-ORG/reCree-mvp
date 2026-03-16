"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createReCreeshot } from "@/app/(user)/_actions/recreeshot-actions";
import { UploadStep1 } from "./UploadStep1";
import { UploadStep2 } from "./UploadStep2";
import { UploadStep3 } from "./UploadStep3";

interface Tag {
  id: string;
  name: string;
  group: string;
  colorHex: string | null;
  textColorHex: string | null;
}

interface Topic {
  id: string;
  nameEn: string;
  colorHex: string | null;
  textColorHex: string | null;
}

interface Props {
  tags: Tag[];
  topics: Topic[];
  userId: string;
}

type State = {
  step: 1 | 2 | 3;
  referenceFile: File | null;
  referencePreviewUrl: string | null;
  shotFile: File | null;
  shotPreviewUrl: string | null;
  uploadedReferenceUrl: string | null;
  uploadedShotUrl: string | null;
  createdId: string | null;
  isUploading: boolean;
  isSubmitting: boolean;
  error: string | null;
};

export function ReCreeshotUploadFlow({ tags, topics, userId }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>({
    step: 1,
    referenceFile: null,
    referencePreviewUrl: null,
    shotFile: null,
    shotPreviewUrl: null,
    uploadedReferenceUrl: null,
    uploadedShotUrl: null,
    createdId: null,
    isUploading: false,
    isSubmitting: false,
    error: null,
  });

  function handleReferenceChange(file: File) {
    setState((s) => ({
      ...s,
      referenceFile: file,
      referencePreviewUrl: URL.createObjectURL(file),
    }));
  }

  function handleShotChange(file: File) {
    setState((s) => ({
      ...s,
      shotFile: file,
      shotPreviewUrl: URL.createObjectURL(file),
    }));
  }

  async function uploadToSupabase(file: File, folder: string): Promise<string> {
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("recreeshot-images")
      .upload(path, file, { upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from("recreeshot-images").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleNext() {
    if (!state.shotFile) return;

    setState((s) => ({ ...s, isUploading: true, error: null }));

    try {
      const [shotUrl, refUrl] = await Promise.all([
        uploadToSupabase(state.shotFile, "shots"),
        state.referenceFile ? uploadToSupabase(state.referenceFile, "refs") : Promise.resolve(null),
      ]);

      setState((s) => ({
        ...s,
        uploadedShotUrl: shotUrl,
        uploadedReferenceUrl: refUrl,
        isUploading: false,
        step: 2,
      }));
    } catch (e) {
      console.error(e);
      setState((s) => ({ ...s, isUploading: false, error: "업로드 실패. 다시 시도해주세요." }));
    }
  }

  async function handleShare(data: {
    locationName: string;
    story: string;
    tips: string;
    tagIds: string[];
    topicIds: string[];
  }) {
    if (!state.uploadedShotUrl) return;

    setState((s) => ({ ...s, isSubmitting: true, error: null }));

    const result = await createReCreeshot({
      imageUrl: state.uploadedShotUrl,
      referencePhotoUrl: state.uploadedReferenceUrl ?? undefined,
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

    // 원본 사진이 있어야 AI 스코어링 가능 → 없으면 Step3 건너뜀
    if (state.uploadedReferenceUrl) {
      setState((s) => ({ ...s, isSubmitting: false, createdId: result.id, step: 3 }));
    } else {
      router.push(`/explore/hall/${result.id}`);
    }
  }

  if (state.step === 1) {
    return (
      <>
        <UploadStep1
          referencePreviewUrl={state.referencePreviewUrl}
          shotPreviewUrl={state.shotPreviewUrl}
          onReferenceChange={handleReferenceChange}
          onShotChange={handleShotChange}
          onNext={handleNext}
          isUploading={state.isUploading}
        />
        {state.error && (
          <p className="text-red-500 text-sm text-center py-2">{state.error}</p>
        )}
      </>
    );
  }

  if (state.step === 2 && state.shotPreviewUrl) {
    return (
      <>
        <UploadStep2
          referencePreviewUrl={state.referencePreviewUrl}
          shotPreviewUrl={state.shotPreviewUrl}
          tags={tags}
          topics={topics}
          onBack={() => setState((s) => ({ ...s, step: 1 }))}
          onShare={handleShare}
          isSubmitting={state.isSubmitting}
        />
        {state.error && (
          <p className="text-red-500 text-sm text-center py-2">{state.error}</p>
        )}
      </>
    );
  }

  if (state.step === 3 && state.shotPreviewUrl && state.createdId) {
    return (
      <UploadStep3
        shotPreviewUrl={state.shotPreviewUrl}
        createdId={state.createdId}
      />
    );
  }

  return null;
}
