// 인기 정렬 — 최근 N일 저장 수, 모자라면 전체 기간으로 통째 교체. 서버 전용
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PUBLIC_PLACE_POST_WHERE, PUBLIC_RECREESHOT_WHERE } from "@/lib/visibility";

/** 최근 저장을 세는 창. 명세 5.1 의 "최근 7일" */
export const POPULAR_WINDOW_DAYS = 7;

/**
 * 최근 창의 결과를 쓰기 위한 최소 개수.
 * 이보다 적으면 최근 결과를 **버리고** 전체 기간으로 통째 바꾼다 — 섞지 않는다.
 * 둘을 섞으면 "최근 2건 + 전체 8건" 같은 목록이 나오는데, 그 목록의 정렬 기준을
 * 한 문장으로 설명할 수 없다. 화면 제목도 "Popular now" 와 "Popular" 중 하나여야 한다.
 */
export const POPULAR_MIN_RECENT = 4;

export type PopularTargetType = "POST" | "RECREESHOT";

/** recent = 최근 창 기준, allTime = 전체 기간 saveCount 기준 */
export type PopularPeriod = "recent" | "allTime";

export type PopularIds = {
  /** 순서가 곧 표시 순서다 */
  ids: string[];
  period: PopularPeriod;
};

/** 정렬에 필요한 최소 필드. 대상 두 종류가 같은 모양을 내야 한 벌로 정렬한다 */
type Candidate = { id: string; saveCount: number; createdAt: Date };

/**
 * 노출 조건을 통과한 대상만. ids 를 주면 그 안에서, 안 주면 전체에서
 * saveCount desc → createdAt desc 로 take 만큼.
 *
 * savedOnly 는 전체 기간 경로만 쓴다. 저장이 한 번도 없는 대상이 "Popular" 아래
 * 놓이지 않게 막는다 — 그 경우 섹션은 통째로 비고 명세 5.2 의 숨김/CTA 로 간다.
 * 최근 창 경로에는 걸지 않는다. 거기 들어온 대상은 이미 창 안에서 저장된 것들이다.
 */
async function listVisible(
  targetType: PopularTargetType,
  opts: { ids?: string[]; take?: number; savedOnly?: boolean },
): Promise<Candidate[]> {
  const idFilter = opts.ids ? { id: { in: opts.ids } } : {};
  const savedFilter = opts.savedOnly ? { saveCount: { gt: 0 } } : {};
  const select = { id: true, saveCount: true, createdAt: true } as const;
  // ids 로 좁힐 때는 정렬을 JS 가 맡는다 (최근 저장 수가 1순위라 DB 정렬이 소용없다)
  const orderBy = opts.ids
    ? undefined
    : ([{ saveCount: "desc" }, { createdAt: "desc" }] as const);

  if (targetType === "POST") {
    return prisma.post.findMany({
      where: { ...PUBLIC_PLACE_POST_WHERE, ...idFilter, ...savedFilter },
      select,
      ...(orderBy ? { orderBy: [...orderBy] } : {}),
      ...(opts.take ? { take: opts.take } : {}),
    });
  }
  return prisma.reCreeshot.findMany({
    where: { ...PUBLIC_RECREESHOT_WHERE, ...idFilter, ...savedFilter },
    select,
    ...(orderBy ? { orderBy: [...orderBy] } : {}),
    ...(opts.take ? { take: opts.take } : {}),
  });
}

/**
 * 캐시를 거치지 않는 본체. 화면은 아래 getPopularIds 를 쓴다 —
 * 이건 캐시가 결과를 가리면 안 되는 호출자(검증 스크립트 등)용 출구다.
 */
export async function computePopularIds(
  targetType: PopularTargetType,
  limit: number,
): Promise<PopularIds> {
  const since = new Date(Date.now() - POPULAR_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // 1) 최근 창에 **일어난** 저장을 대상별로 센다. 콘텐츠 생성일과는 무관하다
  const grouped = await prisma.save.groupBy({
    by: ["targetId"],
    where: { targetType, createdAt: { gte: since } },
    _count: { targetId: true },
  });

  if (grouped.length > 0) {
    const recentCount = new Map(grouped.map((g) => [g.targetId, g._count.targetId]));

    // 2) 노출 조건으로 거른다. 삭제된 대상·DRAFT·shop 은 여기서 사라진다
    //    (Save 는 다형 참조라 FK 가 없어 고아 행이 남을 수 있다)
    const visible = await listVisible(targetType, { ids: [...recentCount.keys()] });

    if (visible.length >= POPULAR_MIN_RECENT) {
      const sorted = visible.sort(
        (a, b) =>
          (recentCount.get(b.id) ?? 0) - (recentCount.get(a.id) ?? 0) ||
          b.saveCount - a.saveCount ||
          b.createdAt.getTime() - a.createdAt.getTime(),
      );
      return { ids: sorted.slice(0, limit).map((r) => r.id), period: "recent" };
    }
  }

  // 3) 폴백 — 최근 결과를 버리고 전체 기간으로 통째 교체한다.
  //    새로 집계하지 않고 비정규화된 saveCount 를 그대로 쓴다
  const allTime = await listVisible(targetType, { take: limit, savedOnly: true });
  return { ids: allTime.map((r) => r.id), period: "allTime" };
}

/**
 * 인기 대상의 id 목록. **사용자와 무관한 값만** 담는다 —
 * 내 저장 여부 같은 개인화 값을 넣으면 첫 방문자의 상태가 5분간 모두에게 나간다.
 * 호출자가 이 id 로 본문을 다시 조회하고, 개인화는 그때 얹는다.
 */
export const getPopularIds = unstable_cache(
  async (targetType: PopularTargetType, { limit }: { limit: number }): Promise<PopularIds> =>
    computePopularIds(targetType, limit),
  ["popular-ids"],
  { revalidate: 300, tags: ["popular-ids"] },
);
