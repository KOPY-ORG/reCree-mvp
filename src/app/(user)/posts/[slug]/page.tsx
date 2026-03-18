import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Sparkles, Waves, Flame, MapPin, Lightbulb } from "lucide-react";
import { LocationCard } from "./_components/LocationCard";
import { prisma } from "@/lib/prisma";
import { resolveTopicColors, resolveTagColors, type ResolvedLabel } from "@/lib/post-labels";
import { MarkdownContent } from "./_components/MarkdownContent";
import { PostDetailHeader } from "./_components/PostDetailHeader";
import { BannerCarousel } from "./_components/BannerCarousel";
import { OriginalSourceCards } from "./_components/OriginalSourceCards";
import { SourceSection } from "./_components/SourceSection";
import { PostMetaBar } from "./_components/PostMetaBar";
import { getCurrentUser } from "@/lib/auth";
import { PostReCreeshotSection } from "./_components/PostReCreeshotSection";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      slug: true,
      titleEn: true,
      bodyEn: true,
    },
  });

  if (!post) return {};

  const description = post.bodyEn
    ? post.bodyEn.slice(0, 120)
    : "Discover K-content travel spots on reCree";
  const ogTitle = post.titleEn.length > 60
    ? post.titleEn.slice(0, 57) + "..."
    : post.titleEn;
  const imageUrl = "/og-default.png";
  const pageUrl = `https://recree.io/posts/${post.slug}`;

  return {
    title: post.titleEn,
    description,
    openGraph: {
      title: ogTitle,
      description,
      url: pageUrl,
      siteName: "reCree",
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [imageUrl],
    },
  };
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
  }),
    prisma.tagGroupConfig.findMany({
      select: { group: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
  ]);

  if (!post || (!isPreview && post.status !== "PUBLISHED")) notFound();

  const reCreeshorts = await prisma.reCreeshot.findMany({
    where: { linkedPostId: post.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      imageUrl: true,
      referencePhotoUrl: true,
      matchScore: true,
      showBadge: true,
      tips: true,
      user: { select: { nickname: true } },
    },
  });

  const bannerImages = post.postImages.filter((img) => img.imageType === "BANNER");
  const originalImages = post.postImages.filter((img) => img.imageType === "ORIGINAL");
  const originalLinkUrls = post.postSources
    .filter((s) => s.isOriginalLink)
    .map((s) => s.url);

  // 색상 resolve
  const configMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  const labels: ResolvedLabel[] = [
    ...post.postTopics.map(({ topic }) => ({ text: topic.nameEn, ...resolveTopicColors(topic) })),
    ...post.postTags.map(({ tag }) => ({ text: tag.name, ...resolveTagColors(tag, configMap.get(tag.group)) })),
  ];

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
    <article className="pb-8 max-w-2xl mx-auto">
      {!isPreview && <PostDetailHeader />}
      {isPreview && (
        <div className="bg-amber-100 text-amber-800 text-xs text-center py-2 font-medium">
          미리보기 모드 — 실제 발행 전 상태입니다
        </div>
      )}

      {/* 배너 캐러셀 — 헤더(h-12) 높이만큼 위로 올려 풀블리드 (미리보기엔 헤더 없으므로 margin 제거) */}
      {bannerImages.length > 0 && (
        <div className={isPreview ? "" : "-mt-12"}>
          <BannerCarousel images={bannerImages}>
            <OriginalSourceCards
              images={originalImages}
              originalLinkUrls={originalLinkUrls}
            />
          </BannerCarousel>
        </div>
      )}

      {/* 배너 없을 때 소스 이미지 카드 (뱃지 위) */}
      {bannerImages.length === 0 && (
        <OriginalSourceCards
          images={originalImages}
          originalLinkUrls={originalLinkUrls}
          className={`px-4 pb-1 flex gap-2 ${isPreview ? "pt-3" : "pt-14"}`}
        />
      )}

      {/* 배지 + 공유/스크랩 */}
      <PostMetaBar
        labels={labels}
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
                    <span key={i} className="px-2.5 py-0.5 rounded-full bg-muted text-xs font-medium">
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
          naverMapsUrl={spotInsight.place.naverMapsUrl ?? null}
          streetViewUrl={spotInsight.place.streetViewUrl ?? null}
          phone={spotInsight.place.phone ?? null}
          operatingHours={(spotInsight.place.operatingHours as string[] | null) ?? null}
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

      {/* How others reCree'd + Tips */}
      <PostReCreeshotSection
        postId={post.id}
        shots={reCreeshorts}
        originalImageUrl={originalImages[0]?.url ?? null}
      />

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
