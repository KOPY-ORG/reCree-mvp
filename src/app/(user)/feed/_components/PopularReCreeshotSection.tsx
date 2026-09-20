import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PUBLIC_RECREESHOT_WHERE } from "@/lib/visibility";
import { HScrollSection } from "@/components/curation/HScrollSection";
import { ReCreeshotImage } from "@/components/recreeshot-image";

const TITLE = "Fans recreating the scene";
const TAKE = 10;

/** 더보기가 가는 곳 — 리크리샷 전체 목록 */
const MORE_HREF = "/recreeshot";

/**
 * 캐러셀로 보여 줄 최소 개수. 이보다 적으면 "몇 개 중 상위"라는 말이 성립하지 않아
 * 줄 세우는 대신 만들라고 권한다.
 */
const MIN_FOR_CAROUSEL = 3;

/**
 * 좋아요가 많은 리크리샷 (명세 3.2 4행).
 *
 * 기간 조건이 없다. lib/popular-queries 의 getPopularIds 는 최근 7일 저장 수가 기준이라
 * 여기 쓰지 않는다 — 그쪽은 discover 용으로 남는다.
 *
 * 집계 칼럼 ReCreeshot.likeCount 로 정렬한다 (schema.prisma:430, @@index 있음).
 * 2차 키로 id 를 둬 동점일 때 순서가 매 요청 흔들리지 않게 한다 —
 * dev 만 해도 likeCount 2 가 3건, 4 가 2건이라 동점이 흔하다.
 *
 * 페이지에서 props 를 받지 않고 스스로 조회한다 (FollowFeedSection 과 같은 패턴).
 * 다만 사용자와 무관한 공용 목록이고 단순 orderBy 라 <Suspense> 를 쓰지 않는다.
 */
export async function PopularReCreeshotSection() {
  const shots = await prisma.reCreeshot.findMany({
    where: { ...PUBLIC_RECREESHOT_WHERE },
    orderBy: [{ likeCount: "desc" }, { id: "desc" }],
    take: TAKE,
    select: { id: true, imageUrl: true },
  });

  // 볼 게 모자라면 섹션을 숨기지 않고 통째로 권유로 바꾼다 (명세 5.2).
  // 숨기면 "여기에 이런 게 생긴다"는 사실조차 전해지지 않는다
  if (shots.length < MIN_FOR_CAROUSEL) {
    return (
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3 px-4">
          <h2 className="font-bold text-lg">{TITLE}</h2>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 text-center py-10 px-4">
          <p className="text-sm text-muted-foreground">
            Recreate a scene at a real spot and show how it turned out.
          </p>
          <Link
            href="/recreeshot/new"
            className="px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold"
          >
            Recreate your K-moment
          </Link>
        </div>
      </section>
    );
  }

  return (
    <HScrollSection title={TITLE} moreHref={MORE_HREF}>
      {shots.map((shot) => (
        <Link key={shot.id} href={`/recreeshot/${shot.id}`} className="shrink-0 w-[120px] block">
          <ReCreeshotImage
            shotUrl={shot.imageUrl}
            variant="thumb-sm"
            className="aspect-[4/5] [filter:drop-shadow(0_3px_5px_rgba(0,0,0,0.18))]"
            sizes="120px"
          />
        </Link>
      ))}
    </HScrollSection>
  );
}
