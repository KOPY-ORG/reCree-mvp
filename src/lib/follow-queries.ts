import { prisma } from "@/lib/prisma";

export async function getMyFollows(userId: string) {
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
          gradientDir: true,
          gradientStop: true,
          textColorHex: true,
          parent: {
            select: {
              colorHex: true,
              colorHex2: true,
              gradientDir: true,
              gradientStop: true,
              textColorHex: true,
              parent: {
                select: {
                  colorHex: true,
                  colorHex2: true,
                  gradientDir: true,
                  gradientStop: true,
                  textColorHex: true,
                  parent: {
                    select: {
                      colorHex: true,
                      colorHex2: true,
                      gradientDir: true,
                      gradientStop: true,
                      textColorHex: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    // sortOrder 는 사용자가 정한 순서, createdAt 은 그 안에서의 tiebreak.
    // 초기값이 전부 0 인 사용자도 예전과 같은 순서(최신 팔로우 먼저)로 보인다.
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export type FollowWithTopic = Awaited<ReturnType<typeof getMyFollows>>[number];

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
