// Topic 계층 쿼리 — 서버 전용
import { prisma } from "@/lib/prisma";

export async function getLevel0Topics() {
  return prisma.topic.findMany({
    where: { level: 0, isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

/** 임의 Topic의 자식(+손자) 조회 — 카테고리 드릴다운용 */
export async function getTopicChildren(parentId: string) {
  const level1Topics = await prisma.topic.findMany({
    where: { parentId, isActive: true },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
  return { level1Topics };
}

/** 단일 Topic + parent 조회 (카테고리 back 링크용) */
export async function getTopicWithParent(topicId: string) {
  return prisma.topic.findUnique({
    where: { id: topicId },
    include: { parent: true },
  });
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

/** Level 0 → Level 1 → Level 2 → Level 3 전체 계층 (Explore 바텀시트용) */
export async function getLevel0TopicsDeep() {
  return prisma.topic.findMany({
    where: { level: 0, isActive: true },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            include: {
              children: {
                where: { isActive: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
    orderBy: { sortOrder: "asc" },
  });
}

export type Level0TopicDeep = Awaited<ReturnType<typeof getLevel0TopicsDeep>>[number];

/** 주어진 topicId의 자신 + 모든 하위 토픽 ID 반환 (재귀) */
export async function getDescendantTopicIds(topicId: string): Promise<string[]> {
  const allTopics = await prisma.topic.findMany({
    where: { isActive: true },
    select: { id: true, parentId: true },
  });

  const result = new Set<string>([topicId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const topic of allTopics) {
      if (topic.parentId && result.has(topic.parentId) && !result.has(topic.id)) {
        result.add(topic.id);
        changed = true;
      }
    }
  }
  return Array.from(result);
}
