import { useId } from "react";

/** 가이드 SVG 의 선 굵기. 원본 다섯 개가 모두 2.0 으로 그려져 있다 */
export const GUIDE_STROKE = 2;

/**
 * 가이드 아이콘의 외곽선 경로 하나.
 *
 * 다섯 중 넷(Camera · Map · Shop · User)은 굵기 2.0 의 선을 면(외곽선)으로 굳혀 둔 것이라
 * stroke-width 로 굵기를 못 바꾼다. weight 가 2 보다 작으면 같은 경로를 마스크로
 * 안쪽 (2 − weight) / 2 만큼 깎는다 — 선은 양쪽 가장자리에서 깎이므로 굵기가 weight 가 된다.
 *
 * 벡터 마스크라 화면 밀도(1x · 2x · 3x)와 상관없이 같은 굵기가 나온다.
 * 예전의 feMorphology 필터는 렌더된 픽셀을 깎아 밀도마다 굵기가 달랐다.
 */
export function OutlinePath({ d, weight = GUIDE_STROKE }: { d: string; weight?: number }) {
  // useId 의 특수문자는 url(#…) 참조를 깨뜨릴 수 있어 영숫자만 남긴다
  const id = `icon-mask-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  if (weight >= GUIDE_STROKE) return <path d={d} fill="currentColor" />;

  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <path d={d} fill="white" />
        <path d={d} fill="none" stroke="black" strokeWidth={GUIDE_STROKE - weight} />
      </mask>
      <path d={d} fill="currentColor" mask={`url(#${id})`} />
    </>
  );
}
