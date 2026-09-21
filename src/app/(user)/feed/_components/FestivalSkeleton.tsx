import { Skeleton } from "@/components/ui/skeleton";

/**
 * FestivalSection 의 자리를 먼저 잡아 둔다. FollowFeedSkeleton 과 같은 방식이다 —
 * 바깥 상자는 HScrollSection(components/curation/HScrollSection.tsx)의 구조와 여백을
 * 그대로 베끼고, 카드는 실제 카드의 치수를 그대로 쓴다.
 *
 * 축제 카드는 세로형이라 높이가 관광지 카드와 다르다. 실측 160×273 을 그대로 쌓는다 —
 * 사진 3/4(213) + mt-2(8) + 제목·기간 칸 h-[52px]. 한 값이라도 어긋나면 데이터가
 * 도착하는 순간 아래 섹션이 통째로 밀린다.
 *
 * 출처 표기 줄까지 그린다. 그 줄도 섹션 높이의 일부라 빼면 16px 이 어긋난다.
 * 글자를 그대로 쓰지 않는 것은 결과가 0건이면 이 섹션이 통째로 사라지기 때문이다 —
 * 사라질 자리에 출처를 미리 띄우지 않는다.
 */
const CARD_COUNT = 3;

export function FestivalSkeleton() {
  return (
    <div>
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3 px-4">
          {/* h2.font-bold.text-lg 한 줄과 같은 높이(28px) · 실제 제목 글자 폭(158px) */}
          <Skeleton className="h-7 w-[158px] rounded-md" />
        </div>
        <div className="overflow-x-auto scrollbar-hide pb-2">
          <div className="flex gap-3 pl-4 pb-1">
            {Array.from({ length: CARD_COUNT }, (_, i) => (
              <div key={i} className="shrink-0 w-[160px]">
                <Skeleton className="aspect-[3/4] w-full rounded-xl" />
                <div className="mt-2 h-[52px] space-y-1.5">
                  <Skeleton className="h-[13px] w-full rounded" />
                  <Skeleton className="h-[13px] w-3/5 rounded" />
                </div>
              </div>
            ))}
            <div className="shrink-0 w-1" />
          </div>
        </div>
      </section>

      {/* 실제 출처 줄과 같은 자리·같은 높이(16px)·같은 글자 폭(95px) */}
      <div className="-mt-4 mb-6 px-4">
        <Skeleton className="h-4 w-[95px] rounded" />
      </div>
    </div>
  );
}
