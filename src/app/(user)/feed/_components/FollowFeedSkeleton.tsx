import { Skeleton } from "@/components/ui/skeleton";

/**
 * FollowFeedSection 의 자리를 먼저 잡아 둔다.
 *
 * 바깥 상자는 HScrollSection(components/curation/HScrollSection.tsx)의 구조와
 * 여백을 그대로 베낀다. 카드도 PostCard 의 carousel 치수(w-[160px] md:w-[200px],
 * aspect-[4/3])를 그대로 쓴다 — PostCard 는 이미지 한 장이 전부라 그 비율이 곧 높이다.
 * 한 값이라도 어긋나면 데이터가 도착하는 순간 아래 섹션이 통째로 밀린다.
 *
 * 제목도 같이 그린다. 제목만 먼저 뜨고 카드가 나중에 뜨면 화면이 두 번 움직인다.
 *
 * 색과 애니메이션은 공용 Skeleton 이 정한다. 모양만 여기서 조립한다.
 */
const CARD_COUNT = 3;

export function FollowFeedSkeleton() {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3 px-4">
        {/* h2.font-bold.text-lg 한 줄과 같은 높이(28px) · 실제 제목 글자 폭(201px) */}
        <Skeleton className="h-7 w-[201px] rounded-md" />
      </div>
      <div className="overflow-x-auto scrollbar-hide pb-2">
        <div className="flex gap-3 pl-4 pb-1">
          {Array.from({ length: CARD_COUNT }, (_, i) => (
            <Skeleton key={i} className="shrink-0 w-[160px] md:w-[200px] aspect-[4/3] rounded-lg" />
          ))}
          <div className="shrink-0 w-1" />
        </div>
      </div>
    </section>
  );
}
