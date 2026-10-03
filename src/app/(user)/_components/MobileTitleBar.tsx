/**
 * 모바일 · 태블릿 화면 제목 바 — 왼쪽 굵은 제목, 오른쪽에 행동 하나(있으면).
 * lg 는 상단 바(DesktopHeader)가 있어 숨는다. 뒤로가기가 있는 바(following · policy 등)나 가운데 제목 바는 모양이 달라 따로 둔다.
 * action 을 넘기면(null 이어도) 양끝 정렬, 안 넘기면 제목만 있는 바다
 */
export function MobileTitleBar({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="app-header lg:hidden">
      <div className={`h-12 flex items-center px-4 ${action === undefined ? "gap-1" : "justify-between"}`}>
        <span className="font-bold text-base tracking-tight">{title}</span>
        {action}
      </div>
    </header>
  );
}
