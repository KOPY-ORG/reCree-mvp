import { prisma } from "@/lib/prisma";

export type FollowWithTopic = {
  id: string;
  topic: {
    id: string;
    slug: string;
    nameEn: string;
    nameKo: string;
    level: number;
    colorHex: string | null;
    colorHex2: string | null;
    textColorHex: string | null;
  };
  createdAt: Date;
};

export async function getMyFollows(userId: string): Promise<FollowWithTopic[]> {
  return prisma.topicFollow.findMany({
    where: { userId },
    include: {
      topic: {
        select: {
          id: true,
          slug: true,
          nameEn: true,
          nameKo: true,
          level: true,
          colorHex: true,
          colorHex2: true,
          textColorHex: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function isUserFollowing(
  userId: string,
  topicId: string
): Promise<boolean> {
  const follow = await prisma.topicFollow.findUnique({
    where: { userId_topicId: { userId, topicId } },
    select: { id: true },
  });
  return follow !== null;
}

export async function getFollowedTopicIds(
  userId: string,
  topicIds: string[]
): Promise<string[]> {
  if (topicIds.length === 0) return [];
  const follows = await prisma.topicFollow.findMany({
    where: { userId, topicId: { in: topicIds } },
    select: { topicId: true },
  });
  return follows.map((f) => f.topicId);
}

export async function countTopicFollowers(topicId: string): Promise<number> {
  return prisma.topicFollow.count({ where: { topicId } });
}
