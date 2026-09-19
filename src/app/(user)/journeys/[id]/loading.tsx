import { MAP_BG, SKELETON_1, SKELETON_2, SKELETON_3 } from "../_constants";

// 상세 화면(page.tsx)의 블록 높이·여백을 그대로 맞춘다 — 배너 222 / 스탯 / Day 탭 / 지도 172 / 아이템 행.
// 색은 시안(post detail :770)의 단계별 회색.
export default function CourseDetailLoading() {
  return (
    <div className="animate-pulse">
      {/* 배너 */}
      <div className="h-[222px]" style={{ background: SKELETON_1 }} />

      {/* 스탯 2칸 */}
      <div className="flex gap-2 px-[18px] pt-4">
        <div className="h-[60px] flex-1 rounded-[14px]" style={{ background: SKELETON_2 }} />
        <div className="h-[60px] flex-1 rounded-[14px]" style={{ background: SKELETON_2 }} />
      </div>

      {/* Day 탭 */}
      <div className="flex gap-[7px] px-[18px] pt-[18px]">
        <div className="h-[34px] w-[74px] rounded-[18px]" style={{ background: SKELETON_2 }} />
        <div className="h-[34px] w-[74px] rounded-[18px]" style={{ background: SKELETON_3 }} />
      </div>

      {/* 미니맵 */}
      <div className="mx-[18px] mt-4 h-[172px] rounded-2xl" style={{ background: MAP_BG }} />

      {/* Day 헤딩 + 아이템 행 */}
      <div className="px-[18px] pt-[22px]">
        <div className="h-4 w-28 rounded" style={{ background: SKELETON_1 }} />
        {[SKELETON_2, SKELETON_2, SKELETON_3].map((tone, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="size-6 flex-none rounded-full" style={{ background: tone }} />
            <div className="size-14 flex-none rounded-xl" style={{ background: tone }} />
            <div className="min-w-0 flex-1 space-y-[5px]">
              <div className="h-[13px] w-2/3 rounded" style={{ background: tone }} />
              <div className="h-[11px] w-2/5 rounded" style={{ background: SKELETON_3 }} />
            </div>
            <div className="h-[19px] w-[68px] flex-none rounded-[5px]" style={{ background: tone }} />
          </div>
        ))}
      </div>
    </div>
  );
}
