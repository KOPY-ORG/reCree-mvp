import { cn } from "@/lib/utils";

/**
 * 페이지 본문의 폭 래퍼. lg 이상에서만 값이 생긴다 — 모바일 · 태블릿은 className 그대로다.
 *
 *   wide     둘러보기 (홈 · 목록 · 프로필). 상단 바와 같은 좌우 끝선
 *   reading  읽기 (상세). 1200 에서 멈추고 가운데
 *   narrow   집중 (편집기 · 로그인). 좁은 기둥 안
 *
 * 값은 globals.css 의 --w-* · --page-gutter (docs/design/desktop-redesign-plan.md §3.1).
 */
const VARIANT = {
  wide: "lg:mx-auto lg:w-full lg:max-w-[calc(var(--w-wide)+2*var(--page-gutter))] lg:px-[var(--page-gutter)]",
  reading: "lg:mx-auto lg:w-full lg:max-w-[calc(var(--w-reading)+2*var(--page-gutter))] lg:px-[var(--page-gutter)]",
  narrow: "lg:mx-auto lg:w-full lg:max-w-[var(--w-narrow)]",
} as const;

export function PageContainer({
  variant,
  as: Tag = "div",
  className,
  children,
}: {
  variant: keyof typeof VARIANT;
  as?: "div" | "main" | "section" | "article";
  className?: string;
  children: React.ReactNode;
}) {
  return <Tag className={cn(className, VARIANT[variant])}>{children}</Tag>;
}
