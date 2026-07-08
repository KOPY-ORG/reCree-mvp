// 관리자 통계 대시보드 KPI 조회 — 서버 전용
import { prisma } from "@/lib/prisma";
import type { SaveTarget } from "@prisma/client";

export type KpiStats = {
  totalUsers: number;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  savesByTarget: Record<SaveTarget, number>;
};

/**
 * KPI 총계 6종을 병렬 조회. 비정규화 카운터(likeCount 등)를 신뢰하지 않고 실제 row count/합계 기준.
 */
export async function getKpiStats(): Promise<KpiStats> {
  const [
    totalUsers,
    totalPosts,
    totalLikes,
    totalComments,
    viewsAgg,
    savesGrouped,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.postLike.count(),
    prisma.comment.count(),
    prisma.post.aggregate({ _sum: { viewCount: true } }),
    prisma.save.groupBy({ by: ["targetType"], _count: { _all: true } }),
  ]);

  const totalViews = viewsAgg._sum.viewCount ?? 0;

  const savesByTarget: Record<SaveTarget, number> = {
    POST: 0,
    RECREESHOT: 0,
    EVENT: 0,
  };
  for (const row of savesGrouped) {
    savesByTarget[row.targetType] = row._count._all;
  }

  return { totalUsers, totalPosts, totalLikes, totalComments, totalViews, savesByTarget };
}
