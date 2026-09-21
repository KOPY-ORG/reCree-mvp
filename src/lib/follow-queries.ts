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
              // 조상 이름도 색과 같이 끝까지 받는다 — 토픽 탭 헤더가 쓰는 것은
              // 바로 위(Boy Group)가 아니라 맨 위 분류다 (BTS → K-POP).
              // 어느 단계가 맨 위인지는 토픽마다 다르므로 전부 받아 두고 고른다
              nameEn: true,
              colorHex: true,
              colorHex2: true,
              gradientDir: true,
              gradientStop: true,
              textColorHex: true,
              parent: {
                select: {
                  nameEn: true,
                  colorHex: true,
                  colorHex2: true,
                  gradientDir: true,
                  gradientStop: true,
                  textColorHex: true,
                  parent: {
                    select: {
                      nameEn: true,
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
