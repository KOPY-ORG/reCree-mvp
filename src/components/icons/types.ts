import type { SVGProps } from "react";

/**
 * 아이콘 공통 인터페이스. lucide-react 와 같은 모양이라 교체가 한 줄이다.
 *   <UserRound className="size-[22px]" />  →  <UserIcon className="size-[22px]" />
 *
 * 색은 SVG 안에서 currentColor 라 CSS 의 color 를 따라간다.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
  /** 한 변 (px). viewBox 는 5개 모두 0 0 24 24 로 같다 */
  size?: number | string;
}
