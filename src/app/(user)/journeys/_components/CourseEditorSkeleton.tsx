import { SKELETON_1, SKELETON_2, SKELETON_3 } from "../_constants";

// 이 스켈레톤이 없으면 /journeys/new 는 목록 스켈레톤을, /journeys/[id]/edit 은
// 상세 스켈레톤을 물려받아 전혀 다른 모양이 잠깐 스친다.
//
// CourseEditor 의 블록 높이·여백을 그대로 맞춘다 — 헤더 56 / 제목 입력 / 메타 / 토글 카드.
// 헤더 제목은 정적이라 그대로 그려 전환이 튀지 않게 한다 (journeys/loading.tsx 와 같은 판단).
export function CourseEditorSkeleton({ title }: { title: string }) {
  return (
    <div>
      <header className="app-header">
        <div className="flex h-14 items-center gap-1 px-1.5">
          <div className="size-11 flex-none" />
          <span className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">
            {title}
          </span>
          <div
            className="h-11 w-[86px] flex-none rounded-full animate-pulse"
            style={{ background: SKELETON_1 }}
          />
        </div>
      </header>

      <div className="animate-pulse px-[18px] pt-5">
        {/* 제목 입력 */}
        <div className="h-[27px] w-3/5 rounded" style={{ background: SKELETON_1 }} />
        <div className="mt-3 h-0.5 w-full" style={{ background: SKELETON_2 }} />

        {/* 메타 */}
        <div className="mt-3.5 h-3 w-20 rounded" style={{ background: SKELETON_2 }} />

        {/* 공개 여부 카드 */}
        <div className="mt-[18px] h-[62px] rounded-[14px]" style={{ background: SKELETON_2 }} />

        {/* Day 블록 */}
        <div className="mt-6 h-[15px] w-24 rounded" style={{ background: SKELETON_1 }} />
        {[SKELETON_2, SKELETON_3].map((tone, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="size-6 flex-none rounded-full" style={{ background: tone }} />
            <div className="size-14 flex-none rounded-xl" style={{ background: tone }} />
            <div className="min-w-0 flex-1 space-y-[5px]">
              <div className="h-[13px] w-2/3 rounded" style={{ background: tone }} />
              <div className="h-[11px] w-2/5 rounded" style={{ background: SKELETON_3 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
