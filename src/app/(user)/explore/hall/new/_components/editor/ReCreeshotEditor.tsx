"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { loadImage } from "@/lib/canvas-utils";
import { getReCreeshotPresignedUrl } from "@/lib/actions/upload-actions";
import { exportStageToBlob } from "./canvas-export";
import { getTemplateConfig } from "./template-config";
import type { TemplateId } from "./editor-types";

const KonvaStage = dynamic(() => import("./KonvaStage"), { ssr: false });

interface Props {
  templateId: TemplateId;
  referencePreviewUrl: string | null;
  shotPreviewUrl: string;
  onNext: (compositeUrl: string) => void;
  onError: (msg: string) => void;
}

export function ReCreeshotEditor({
  templateId,
  referencePreviewUrl,
  shotPreviewUrl,
  onNext,
  onError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState(0);
  const [stageInstance, setStageInstance] = useState<Konva.Stage | null>(null);
  const [referenceImg, setReferenceImg] = useState<HTMLImageElement | null>(null);
  const [shotImg, setShotImg] = useState<HTMLImageElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const templateConfig = getTemplateConfig(templateId);
  const stageH = stageW > 0 ? Math.round(stageW * (templateConfig.canvasHeight / templateConfig.canvasWidth)) : 0;

  // 컨테이너 너비 측정
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setStageW(Math.round(w));
    });
    ro.observe(el);
    setStageW(Math.round(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  // 이미지 로드
  useEffect(() => {
    if (!referencePreviewUrl) { setReferenceImg(null); return; }
    loadImage(referencePreviewUrl).then(setReferenceImg).catch(() => setReferenceImg(null));
  }, [referencePreviewUrl]);

  useEffect(() => {
    loadImage(shotPreviewUrl).then(setShotImg).catch(() => setShotImg(null));
  }, [shotPreviewUrl]);

  const handleStageReady = useCallback((stage: Konva.Stage) => {
    setStageInstance(stage);
  }, []);

  async function handleContinue() {
    if (!stageInstance || isExporting) return;
    setIsExporting(true);
    try {
      const blob = await exportStageToBlob(stageInstance, templateConfig.canvasWidth, stageW);
      const file = new File([blob], "recreeshot.jpg", { type: "image/jpeg" });
      const presigned = await getReCreeshotPresignedUrl(file.name, file.type);
      if ("error" in presigned) throw new Error(presigned.error);
      await fetch(presigned.presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "image/jpeg" },
      });
      onNext(presigned.cdnUrl);
    } catch (e) {
      console.error(e);
      onError("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 overflow-y-auto">
        {/* Konva 캔버스 컨테이너 */}
        <div className="px-4 py-6">
          <div
            ref={containerRef}
            className="w-full"
            style={{ boxShadow: "0 4px 28px rgba(0,0,0,0.18)" }}
          >
            {stageW > 0 && (
              <KonvaStage
                stageW={stageW}
                stageH={stageH}
                templateConfig={templateConfig}
                referenceImg={referenceImg}
                shotImg={shotImg}
                frameColorHex="#ffffff"
                referenceLabel={null}
                shotLabel={null}
                onStageReady={handleStageReady}
              />
            )}
          </div>
        </div>

        {/* 데코레이션 툴바 placeholder */}
        <div className="px-4 pt-3 pb-2">
          <div className="rounded-2xl border border-dashed border-border p-4 space-y-1 text-center">
            <p className="text-sm font-semibold">Decoration tools</p>
            <p className="text-xs text-muted-foreground">Frame color · Text · Stickers — coming in next update</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={handleContinue}
          disabled={isExporting || !stageInstance || !shotImg}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isExporting ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
