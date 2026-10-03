import { Route } from "lucide-react";
import type { IconProps } from "./types";
import { GUIDE_STROKE } from "./OutlinePath";

/**
 * Journeys 아이콘. 가이드 SVG 에 없어 lucide Route 를 쓴다 — discover 의 "Create a journey here" 카드와 같은 모양.
 * lucide 도 24 그리드 · 선 2.0 이라 가이드 아이콘과 같은 weight 로 굵기를 맞춘다.
 */
export function RouteIcon({ size = 24, weight = GUIDE_STROKE, ...props }: IconProps) {
  return <Route size={size} strokeWidth={weight} aria-hidden {...props} />;
}
