/**
 * PC(lg+) 페이지 제목 — h1 · 부제 · 오른쪽 행동.
 *
 * 모바일은 렌더하지 않는다. 모바일에서는 각 화면의 제목 바(.app-header)가 이 역할을 하고,
 * lg 에서는 그 바를 숨긴 자리를 이 부품이 맡는다 (이중 헤더 정리, desktop-redesign-plan.md §3.5).
 * 상단 바 메뉴에 이름이 있는 화면(recreeshots · Shop 등)은 쓰지 않는다 — 바가 이미 어디인지 말한다.
 *
 * 폭과 좌우 여백은 놓이는 자리가 정한다. 본문과 같은 래퍼 안에 두면 본문 좌우선에 맞는다.
 */
export function PageTitle({
  title,
  subtitle,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`hidden lg:flex items-end justify-between gap-4 pt-[var(--space-page-top)] pb-6 ${className}`}>
      <div className="min-w-0">
        <h1 className="truncate text-[28px] font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-none items-center gap-2">{action}</div>}
    </div>
  );
}
