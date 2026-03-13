// Topic 계층 쿼리 — 서버 전용
import { prisma } from "@/lib/prisma";

export async function getLevel0Topics() {
  return prisma.topic.findMany({
    where: { level: 0, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/** Level 0 Topic의 자식(Level 1) + 손자(Level 2) 조회 */
export async function getTopicChildren(parentId: string) {
  const level1Topics = await prisma.topic.findMany({
    where: { parentId, isActive: true },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  return { level1Topics };
}

/** Level 0 Topics + 각각의 Level 1 자식 (Explore 필터용) */
export async function getLevel0TopicsWithChildren() {
  return prisma.topic.findMany({
    where: { level: 0, isActive: true },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export type Level0TopicWithChildren = Awaited<
  ReturnType<typeof getLevel0TopicsWithChildren>
>[number];
