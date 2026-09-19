import { SKELETON_1, SKELETON_2, SKELETON_3 } from "./_constants";

// 헤더가 page.tsx 안에 있어 로딩 중에는 없다 — 제목은 정적이라 그대로 그려 전환이 튀지 않게 한다.
// New 버튼은 로그인 여부에 달려 있어 자리표시를 두지 않는다 (비로그인엔 아예 없는 버튼이다).
//
// 카드 뼈대는 CourseCard 의 실제 형태를 따른다 — aspect-[4/3] 커버 + 제목/작성자/메타 3줄.
// 색은 시안(journey list :486)의 단계별 회색.
const CARD_TONES = [SKELETON_1, SKELETON_2, SKELETON_3, SKELETON_3];

function CardSkeleton({ tone }: { tone: string }) {
  return (
    <div>
      <div className="aspect-[4/3] rounded-lg animate-pulse" style={{ background: tone }} />
      <div className="pt-2 space-y-1">
        <div className="h-3.5 w-3/4 rounded animate-pulse" style={{ background: tone }} />
        <div className="h-3 w-1/2 rounded animate-pulse" style={{ background: tone }} />
        <div className="h-3 w-2/3 rounded animate-pulse" style={{ background: tone }} />
      </div>
    </div>
  );
}

export default function JourneysLoading() {
  return (
    <div className="pb-8">
      <header className="app-header">
        <div className="h-12 flex items-center px-4">
          <span className="font-bold text-base tracking-tight">Journeys</span>
        </div>
      </header>

      <section className="pt-4">
        <div
          className="mx-4 mb-3 h-[18px] w-32 rounded animate-pulse"
          style={{ background: SKELETON_1 }}
        />
        <div className="grid grid-cols-2 gap-3 px-4">
          {CARD_TONES.map((tone, i) => (
            <CardSkeleton key={i} tone={tone} />
          ))}
        </div>
      </section>
    </div>
  );
}
