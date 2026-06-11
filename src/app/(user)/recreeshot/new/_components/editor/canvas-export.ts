import type Konva from "konva";

/**
 * Konva Stage를 JPEG Blob으로 export합니다.
 * pixelRatio = exportWidth / stageDisplayWidth 로 1080px 해상도 확보.
 */
export async function exportStageToBlob(
  stage: Konva.Stage,
  exportWidth: number,
  stageDisplayWidth: number,
): Promise<Blob> {
  const pixelRatio = exportWidth / stageDisplayWidth;
  const dataUrl = stage.toDataURL({ pixelRatio, mimeType: "image/jpeg", quality: 0.92 });
  const res = await fetch(dataUrl);
  return res.blob();
}
