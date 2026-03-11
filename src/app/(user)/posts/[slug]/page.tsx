import { notFound } from "next/navigation";
import { Sparkles, Waves, Flame, MapPin, Lightbulb } from "lucide-react";
import { LocationCard } from "./_components/LocationCard";
import { prisma } from "@/lib/prisma";
import { resolveTopicColors, labelBackground, DEFAULT_COLOR, DEFAULT_TEXT, type ResolvedLabel } from "@/lib/post-labels";
import { MarkdownContent } from "./_components/MarkdownContent";
import { PostDetailHeader } from "./_components/PostDetailHeader";
import { BannerCarousel } from "./_components/BannerCarousel";
import { OriginalSourceCards } from "./_components/OriginalSourceCards";
import { SourceSection } from "./_components/SourceSection";
import { PostMetaBar } from "./_components/PostMetaBar";
import { getCurrentUser } from "@/lib/auth";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export default async function PostDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";

  const [post, tagGroupConfigs] = await Promise.all([
    prisma.post.findUnique({
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
              colorHex2: true,
              gradientDir: true,
              gradientStop: true,
              textColorHex: true,
              parent: {
                select: {
                  colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
                  parent: {
                    select: {
                      colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
                      parent: { select: { colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true } },
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
              phone: true,
              operatingHours: true,
              gettingThere: true,
            },
          },
        },
      },
    },
  }),
    prisma.tagGroupConfig.findMany({
      select: { group: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
  ]);

  if (!post || (!isPreview && post.status !== "PUBLISHED")) notFound();

  const bannerImages = post.postImages.filter((img) => img.imageType === "BANNER");
  const originalImages = post.postImages.filter((img) => img.imageType === "ORIGINAL");
  const originalLinkUrls = post.postSources
    .filter((s) => s.isOriginalLink)
    .map((s) => s.url);

  // 색상 resolve
  const configMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  const resolvedTopics: (ResolvedLabel & { nameEn: string })[] = post.postTopics.map(({ topic }) => ({
    nameEn: topic.nameEn,
    text: topic.nameEn,
    ...resolveTopicColors(topic),
  }));

  const resolvedTags: ResolvedLabel[] = post.postTags.map(({ tag }) => {
    const gc = configMap.get(tag.group);
    return {
      text: tag.name,
      colorHex: tag.colorHex ?? gc?.colorHex ?? DEFAULT_COLOR,
      colorHex2: tag.colorHex ? (tag.colorHex2 ?? null) : (gc?.colorHex2 ?? null),
      gradientDir: gc?.gradientDir ?? "to bottom",
      gradientStop: gc?.gradientStop ?? 150,
      textColorHex: tag.textColorHex ?? gc?.textColorHex ?? DEFAULT_TEXT,
    };
  });

  const currentUser = await getCurrentUser();
  const isSaved = currentUser
    ? !!(await prisma.save.findUnique({
        where: { userId_targetType_targetId: { userId: currentUser.id, targetType: "POST", targetId: post.id } },
      }))
    : false;
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
          <BannerCarousel images={bannerImages}>
            <OriginalSourceCards
              images={originalImages}
              originalLinkUrls={originalLinkUrls}
            />
          </BannerCarousel>
        </div>
      )}

      {/* 배지 + 공유/스크랩 */}
      <PostMetaBar
        topics={resolvedTopics}
        tags={resolvedTags}
        isSaved={isSaved}
        postId={post.id}
        titleEn={post.titleEn}
      />

      {/* 제목 */}
      <div className="px-4 pb-2 space-y-1.5">
        <h1 className="text-xl font-bold leading-tight">
          {spotInsight?.place.nameEn ?? spotInsight?.place.nameKo ?? post.titleEn}
        </h1>
        {spotInsight && (
          <p className="text-sm text-muted-foreground leading-snug">{post.titleEn}</p>
        )}
      </div>

      {/* Spot Insight */}
      {spotInsight && (
        <div className="mx-4 mt-3 rounded-2xl border border-secondary bg-white overflow-hidden">
          {/* 헤더 */}
          <div className="px-4 pt-4 pb-3">
            <p className="text-sm font-bold">Spot Insight</p>
          </div>

          <div className="px-4 pb-4 space-y-5">
            {/* Context */}
            {insightEn?.context && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 shrink-0 text-brand drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]" />
                  <p className="text-sm font-bold text-foreground">Context</p>
                </div>
                <p className="text-sm text-gray-900 leading-relaxed pl-5">{insightEn.context}</p>
              </div>
            )}

            {/* Vibe */}
            {spotInsight.vibe.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Waves className="h-4 w-4 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]" style={{ color: "#FFC60C" }} />
                  <p className="text-sm font-bold text-foreground">Vibe</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-5">
                  {spotInsight.vibe.map((v, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-full bg-brand-sub2 text-xs font-medium">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Must-try */}
            {insightEn?.mustTry && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Flame className="h-4 w-4 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]" style={{ color: "#F46022" }} />
                  <p className="text-sm font-bold text-foreground">Must-try</p>
                </div>
                <p className="text-sm text-gray-900 leading-relaxed pl-5">{insightEn.mustTry}</p>
              </div>
            )}

            {/* Tip */}
            {insightEn?.tip && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]" style={{ color: "#36D8FC" }} />
                  <p className="text-sm font-bold text-foreground">Tip</p>
                </div>
                <p className="text-sm text-gray-900 leading-relaxed pl-5">{insightEn.tip}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location 카드 */}
      {spotInsight && (
        <LocationCard
          nameEn={spotInsight.place.nameEn}
          nameKo={spotInsight.place.nameKo}
          addressEn={spotInsight.place.addressEn}
          latitude={spotInsight.place.latitude ? Number(spotInsight.place.latitude) : null}
          longitude={spotInsight.place.longitude ? Number(spotInsight.place.longitude) : null}
          googleMapsUrl={spotInsight.place.googleMapsUrl}
          phone={spotInsight.place.phone ?? null}
          operatingHours={(spotInsight.place.operatingHours as string[] | null) ?? null}
          gettingThere={spotInsight.place.gettingThere ?? null}
        />
      )}

      {/* 본문 */}
      {post.bodyEn && (
        <div className="mx-4 mt-3 rounded-2xl border border-secondary bg-white overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <p className="text-sm font-bold">Story</p>
            <p className="text-xs text-muted-foreground mt-0.5">The full story behind this spot</p>
          </div>
          <div className="px-4 pb-4">
            <MarkdownContent source={post.bodyEn} />
          </div>
        </div>
      )}

      {/* From the Source */}
      <SourceSection sources={post.postSources} />

      {/* 출처 */}
      {post.source && (
        <p className="px-4 mt-6 text-xs text-muted-foreground">
          Source: {post.source}
        </p>
      )}
    </article>
  );
}
