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
 * 조회 조건 말고는 페이지에서 props 를 받지 않고 스스로 조회한다
 * (FollowFeedSection 과 같은 패턴).
 * 다만 사용자와 무관한 공용 목록이고 단순 orderBy 라 <Suspense> 를 쓰지 않는다.
 */
export async function PopularReCreeshotSection({
  topicId,
  title = TITLE,
}: {
  /** 있으면 이 토픽이 붙은 리크리샷만. 없으면 전체 */
  topicId?: string;
  title?: string;
} = {}) {
  const shots = await prisma.reCreeshot.findMany({
    where: {
      ...PUBLIC_RECREESHOT_WHERE,
      ...(topicId ? { reCreeshotTopics: { some: { topicId } } } : {}),
    },
    orderBy: [{ likeCount: "desc" }, { id: "desc" }],
    take: TAKE,
    select: { id: true, imageUrl: true },
  });

  // 토픽 탭은 그 토픽에 리크리샷이 없으면 섹션째로 내린다. 권유도 내지 않는다 —
  // "이 토픽에 뭐가 있나"를 보는 자리에 토픽과 무관한 권유가 끼어들 이유가 없다.
  // 한두 장뿐이어도 그 토픽의 전부이므로 줄로 보여준다. 아래 MIN_FOR_CAROUSEL 은
  // "전체 중 인기"라는 말이 성립하는지를 묻는 조건이라 토픽 탭에는 해당하지 않는다
  if (topicId) {
    if (shots.length === 0) return null;
  } else if (shots.length < MIN_FOR_CAROUSEL) {
    return (
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3 px-4">
          <h2 className="font-bold text-lg">{title}</h2>
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
    // 토픽 탭에서는 More 를 걸지 않는다. /recreeshot 이 토픽으로 좁히는 길을
    // 갖고 있지 않아, 눌러 보면 전체 목록이 나온다 — 없는 편이 낫다
    <HScrollSection title={title} moreHref={topicId ? undefined : MORE_HREF}>
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
