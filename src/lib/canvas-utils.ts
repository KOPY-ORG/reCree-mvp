/** 캔버스에 이미지를 object-cover 방식으로 그리기 위한 소스 rect 계산 */
export function coverRect(natW: number, natH: number, canvasW: number, canvasH: number) {
  const imgAspect = natW / natH;
  const canvasAspect = canvasW / canvasH;
  let sx = 0, sy = 0, sw = natW, sh = natH;
  if (imgAspect > canvasAspect) {
    sw = Math.round(natH * canvasAspect);
    sx = Math.round((natW - sw) / 2);
  } else {
    sh = Math.round(natW / canvasAspect);
    sy = Math.round((natH - sh) / 2);
  }
  return { sx, sy, sw, sh };
}

/** URL에서 이미지를 비동기 로드 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
