import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MarkdownContent } from "./_components/MarkdownContent";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PostDetailPage({ params }: Props) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
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
              googleMapsUrl: true,
            },
          },
        },
      },
    },
  });

  if (!post || post.status !== "PUBLISHED") notFound();

  const spotInsight = post.postPlaces[0] ?? null;
  const insightEn = spotInsight?.insightEn as {
    context?: string;
    mustTry?: string;
    tip?: string;
  } | null;

  return (
    <article className="pb-8">
      {/* 뒤로가기 */}
      <div className="sticky top-0 z-10 flex items-center h-12 px-3 bg-background/80 backdrop-blur-sm border-b">
        <Link
          href="/"
          className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      {/* 썸네일 */}
      {post.thumbnailUrl && (
        <div className="relative w-full aspect-[16/9] bg-muted">
          <Image
            src={post.thumbnailUrl}
            alt={post.titleEn}
            fill
            className="object-cover"
            sizes="430px"
            priority
          />
        </div>
      )}

      {/* 제목 섹션 */}
      <div className="px-4 pt-4 space-y-2">
        {/* 토픽/태그 뱃지 */}
        {(post.postTopics.length > 0 || post.postTags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {post.postTopics.map(({ topic }) => (
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
            {post.postTags.map(({ tag }) => (
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

        <h1 className="text-xl font-bold leading-tight">{post.titleEn}</h1>
        {post.subtitleEn && (
          <p className="text-sm text-muted-foreground">{post.subtitleEn}</p>
        )}
      </div>

      {/* Spot Insight */}
      {spotInsight && (
        <div className="mx-4 mt-5 rounded-xl border bg-muted/30 overflow-hidden">
          {/* 장소 헤더 */}
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {spotInsight.place.nameEn ?? spotInsight.place.nameKo}
              </p>
              {spotInsight.place.addressEn && (
                <p className="text-xs text-muted-foreground">
                  {spotInsight.place.addressEn}
                </p>
              )}
            </div>
            {spotInsight.place.googleMapsUrl && (
              <a
                href={spotInsight.place.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs text-muted-foreground underline shrink-0"
              >
                Map
              </a>
            )}
          </div>

          <div className="px-4 py-3 space-y-3 text-sm">
            {/* Context */}
            {insightEn?.context && (
              <p className="text-foreground/80 leading-relaxed">
                {insightEn.context}
              </p>
            )}

            {/* Vibe */}
            {spotInsight.vibe.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {spotInsight.vibe.map((v, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full bg-brand/20 text-xs font-medium"
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}

            {/* Must-try */}
            {insightEn?.mustTry && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Must Try
                </p>
                <p className="text-foreground/80 leading-relaxed">
                  {insightEn.mustTry}
                </p>
              </div>
            )}

            {/* Tip */}
            {insightEn?.tip && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Tip
                </p>
                <p className="text-foreground/80 leading-relaxed">
                  {insightEn.tip}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 본문 */}
      {post.bodyEn && (
        <div className="px-4 mt-6">
          <MarkdownContent source={post.bodyEn} />
        </div>
      )}

      {/* 출처 */}
      {post.source && (
        <p className="px-4 mt-6 text-xs text-muted-foreground">
          Source: {post.source}
        </p>
      )}
    </article>
  );
}
