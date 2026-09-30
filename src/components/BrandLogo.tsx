import Link from "next/link";
import { Nunito } from "next/font/google";
import { BRAND } from "@/lib/brand";

/** 워드마크 글자색. 전역 브랜드 색을 따른다 */
const LOGO_COLOR = "var(--palette-brand)";

/** 워드마크 전용 글꼴. 전역 글꼴과 무관하게 이 컴포넌트에만 쓴다 */
const logoFont = Nunito({
  subsets: ["latin"],
  weight: "800",
  display: "swap",
});

/**
 * 서비스 로고. 홈으로 가는 링크를 겸한다.
 *
 * 지금은 텍스트 워드마크다 — SVG 로고가 나오면 이 컴포넌트 안만 바꾼다.
 * 크기·배치는 부르는 쪽이 className 으로 정한다.
 */
export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={BRAND.name}
      className={`inline-flex items-center rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 ${className}`}
    >
      <span
        className={`${logoFont.className} text-[26px] leading-none tracking-[-0.02em]`}
        style={{ color: LOGO_COLOR }}
      >
        {BRAND.name}
      </span>
    </Link>
  );
}
