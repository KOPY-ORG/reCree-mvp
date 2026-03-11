import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MarkdownContent } from "./_components/MarkdownContent";
import { PostDetailHeader } from "./_components/PostDetailHeader";
import { BannerCarousel } from "./_components/BannerCarousel";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export default async function PostDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      postTopics: {
        where: { isVisible: true },
        orderBy: { displayOrder: "asc" },
        include: {
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
        where: { isVisible: true },
        orderBy: { displayOrder: "asc" },
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              colorHex: true,
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

  if (!post || (!isPreview && post.status !== "PUBLISHED")) notFound();

  const bannerImages = post.postImages.filter((img) => img.imageType === "BANNER");
  const spotInsight = post.postPlaces[0] ?? null;
  const insightEn = spotInsight?.insightEn as {
    context?: string;
    mustTry?: string;
    tip?: string;
  } | null;

  return (
    <article className="pb-8">
      <PostDetailHeader />
      {isPreview && (
        <div className="bg-amber-100 text-amber-800 text-xs text-center py-2 font-medium">
          미리보기 모드 — 실제 발행 전 상태입니다
        </div>
      )}

      {/* 배너 캐러셀 — 헤더(h-12) 높이만큼 위로 올려 풀블리드 */}
      {bannerImages.length > 0 && (
        <div className="-mt-12">
          <BannerCarousel images={bannerImages} />
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
                    ? { backgroundColor: topic.colorHex, color: topic.textColorHex ?? "#FCFCFC" }
                    : { backgroundColor: "var(--color-muted)", color: "var(--color-muted-foreground)" }
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
                    ? { backgroundColor: tag.colorHex + "22", color: tag.colorHex }
                    : { backgroundColor: "var(--color-muted)", color: "var(--color-muted-foreground)" }
                }
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <h1 className="text-xl font-bold leading-tight">{post.titleEn}</h1>
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
            {insightEn?.context && (
              <p className="text-foreground/80 leading-relaxed">{insightEn.context}</p>
            )}

            {spotInsight.vibe.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {spotInsight.vibe.map((v, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-brand-sub2 text-xs">
                    {v}
                  </span>
                ))}
              </div>
            )}

            {insightEn?.mustTry && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Must Try
                </p>
                <p className="text-foreground/80 leading-relaxed">{insightEn.mustTry}</p>
              </div>
            )}

            {insightEn?.tip && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Tip
                </p>
                <p className="text-foreground/80 leading-relaxed">{insightEn.tip}</p>
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
