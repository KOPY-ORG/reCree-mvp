import Link from "next/link";
import { Map as MapIcon } from "lucide-react";

interface Props {
  placeId: string;
}

// 모바일 전용 — 하단 내비게이션 알약 바로 위 가운데에 뜬다 (bottom = --bottom-nav-space, 내비와 12px 띄움).
// 같은 높이 줄의 오른쪽 끝에는 맨 위로 버튼(40)이 오지만, 이 알약은 가운데라 겹치지 않는다.
// lg 는 하단 내비가 없고 두 열이라 가운데 떠 있는 버튼이 본문을 가린다 — 위치 카드 안 버튼으로 대신한다
export function ViewOnMapButton({ placeId }: Props) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center lg:hidden"
      style={{ bottom: "var(--bottom-nav-space)" }}
    >
      <Link
        href={`/discover?place=${placeId}`}
        className="press-scale pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      >
        <MapIcon className="size-4" strokeWidth={2} aria-hidden="true" />
        View on Map
      </Link>
    </div>
  );
}
