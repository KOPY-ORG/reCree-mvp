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

/** 리크리샷 캔버스에 매치 배지를 그립니다 */
export function drawReCreeshotBadge(
  ctx: CanvasRenderingContext2D,
  W: number,
  matchScore: number,
  padY = 10,
) {
  const badgeText = `${Math.round(matchScore)}% Match`;
  const fontSize = 32;
  const badgePadX = 28;
  ctx.font = `700 ${fontSize}px -apple-system, Helvetica Neue, sans-serif`;
  const badgeW = ctx.measureText(badgeText).width + badgePadX * 2;
  const badgeH = fontSize + padY * 2;
  const badgeX = W - badgeW - W * 0.03;
  const badgeY = W * 0.03;
  const grad = ctx.createLinearGradient(badgeX, 0, badgeX + badgeW * 1.5, 0);
  grad.addColorStop(0, "#C8FF09");
  grad.addColorStop(1, "#ffffff");
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.15)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.font = `700 ${fontSize}px -apple-system, Helvetica Neue, sans-serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(badgeText, badgeX + badgePadX, badgeY + padY + fontSize * 0.82);
  ctx.restore();
}

/** 리크리샷 캔버스에 워터마크를 그립니다 */
export function drawReCreeshotWatermark(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
) {
  ctx.save();
  ctx.font = `600 28px 'Noto Sans', sans-serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 2;
  ctx.fillText("reCree", W - ctx.measureText("reCree").width - W * 0.03, H - W * 0.03);
  ctx.restore();
}
