import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      titleEn: true,
      subtitleEn: true,
      slug: true,
      thumbnailUrl: true,
      publishedAt: true,
      postTopics: {
        select: {
          topic: {
            select: {
              id: true,
              nameEn: true,
              colorHex: true,
              textColorHex: true,
            },
          },
        },
      },
      postTags: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
              colorHex: true,
            },
          },
        },
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-2 text-center px-4">
        <p className="text-lg font-semibold">reCree</p>
        <p className="text-sm text-muted-foreground">No posts yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {posts.map((post) => (
        <Link key={post.id} href={`/posts/${post.slug}`} className="block">
          <article className="border-b last:border-b-0">
            {/* 썸네일 */}
            {post.thumbnailUrl ? (
              <div className="relative w-full aspect-[16/9] bg-muted">
                <Image
                  src={post.thumbnailUrl}
                  alt={post.titleEn}
                  fill
                  className="object-cover"
                  sizes="430px"
                />
              </div>
            ) : (
              <div className="w-full aspect-[16/9] bg-muted" />
            )}

            {/* 텍스트 */}
            <div className="px-4 py-3 space-y-2">
              <h2 className="font-semibold text-base leading-snug line-clamp-2">
                {post.titleEn}
              </h2>
              {post.subtitleEn && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {post.subtitleEn}
                </p>
              )}

              {/* 뱃지 */}
              {(post.postTopics.length > 0 || post.postTags.length > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {post.postTopics.slice(0, 2).map(({ topic }) => (
                    <span
                      key={topic.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={
                        topic.colorHex
                          ? {
                              backgroundColor: topic.colorHex,
                              color: topic.textColorHex ?? "#fff",
                            }
                          : {
                              backgroundColor: "hsl(var(--muted))",
                              color: "hsl(var(--muted-foreground))",
                            }
                      }
                    >
                      {topic.nameEn}
                    </span>
                  ))}
                  {post.postTags.slice(0, 2).map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={
                        tag.colorHex
                          ? {
                              backgroundColor: tag.colorHex + "22",
                              color: tag.colorHex,
                            }
                          : {
                              backgroundColor: "hsl(var(--muted))",
                              color: "hsl(var(--muted-foreground))",
                            }
                      }
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        </Link>
      ))}
    </div>
  );
}
