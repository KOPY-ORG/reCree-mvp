import { prisma } from "@/lib/prisma";

export type PostComment = {
  id: string;
  body: string;
  createdAt: Date;
  user: {
    id: string;
    nickname: string | null;
    profileImageUrl: string | null;
  };
};

export async function getPostDetail(
  slug: string,
  opts: { userId?: string; isPreview?: boolean } = {}
) {
  const { userId, isPreview = false } = opts;

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      postTopics: {
        where: { isVisible: true },
        orderBy: [{ topic: { level: "asc" } }, { displayOrder: "asc" }],
        include: {
          topic: {
            select: {
              id: true,
              nameEn: true,
              slug: true,
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
      },
      postTags: {
        where: { isVisible: true },
        orderBy: { displayOrder: "asc" },
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              group: true,
              colorHex: true,
              colorHex2: true,
              textColorHex: true,
            },
          },
        },
      },
      postImages: {
        orderBy: { sortOrder: "asc" },
      },
      postSources: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          url: true,
          sourceType: true,
          platform: true,
          sourceDetail: true,
          isOriginalLink: true,
        },
      },
      postPlaces: {
        select: {
          context: true,
          vibe: true,
          mustTry: true,
          tip: true,
          insightEn: true,
          place: {
            select: {
              id: true,
              nameEn: true,
              nameKo: true,
              addressEn: true,
              latitude: true,
              longitude: true,
              googleMapsUrl: true,
              naverMapsUrl: true,
              streetViewUrl: true,
              phone: true,
              operatingHours: true,
              gettingThere: true,
            },
          },
        },
      },
    },
  });

  if (!post || (!isPreview && post.status !== "PUBLISHED")) return null;

  const [comments, savedRecord, likedRecord] = await Promise.all([
    prisma.comment.findMany({
      where: { postId: post.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        body: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    }),
    userId
      ? prisma.save.findUnique({
          where: {
            userId_targetType_targetId: {
              userId,
              targetType: "POST",
              targetId: post.id,
            },
          },
        })
      : null,
    userId
      ? prisma.postLike.findUnique({
          where: { userId_postId: { userId, postId: post.id } },
        })
      : null,
  ]);

  return {
    post,
    comments,
    isSaved: !!savedRecord,
    isLikedByMe: !!likedRecord,
  };
}
