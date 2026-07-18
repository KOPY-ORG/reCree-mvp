import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Sparkles, Waves, Flame, Lightbulb } from "lucide-react";
import { LocationCard } from "./_components/LocationCard";
import { prisma } from "@/lib/prisma";
import { resolveTopicColors, resolveTagColors, K_MEDIA_GROUP, type ResolvedLabel } from "@/lib/post-labels";
import { MarkdownContent } from "./_components/MarkdownContent";
import { PostDetailHeader } from "./_components/PostDetailHeader";
import { BannerCarousel } from "./_components/BannerCarousel";
import { OriginalSourceCards } from "./_components/OriginalSourceCards";
import { SourceSection } from "./_components/SourceSection";
import { ImageCreditSection } from "./_components/ImageCreditSection";
import { PostMetaBar } from "./_components/PostMetaBar";
import { getCurrentUser } from "@/lib/auth";
import type { SourcePlatform } from "@/types";
import { PostReCreeshotSection } from "./_components/PostReCreeshotSection";
import { getPostDetail } from "@/lib/post-detail-query";
import { PostActionBar } from "./_components/PostActionBar";
import { PurchaseButton } from "./_components/PurchaseButton";
import { PostComments } from "./_components/PostComments";
import { PostViewTracker } from "./_components/PostViewTracker";

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
      postPlaces: {
        take: 1,
        select: {
          place: { select: { nameEn: true, nameKo: true } },
        },
      },
      postImages: {
        where: { imageType: "BANNER" },
        orderBy: [{ isThumbnail: "desc" }, { sortOrder: "asc" }],
        take: 1,
        select: { url: true },
      },
    },
  });

  if (!post) return {};

  const place = post.postPlaces[0]?.place;
  const placeLabel = place?.nameEn ?? place?.nameKo;

  // "ATEEZ Aurora MV Filming Location | Bukhangang Bridge Seoul"
  // layout.tsx template이 "| reCree" 자동 부착
  const title = placeLabel
    ? `${post.titleEn} | ${placeLabel}`
    : post.titleEn;

  const description = post.bodyEn
    ? post.bodyEn.slice(0, 160)
    : placeLabel
      ? `Visit ${placeLabel}, the exact filming location from ${post.titleEn}. Discover iconic K-content spots with reCree.`
      : "Discover iconic K-content spots with reCree.";

  const imageUrl = post.postImages[0]?.url ?? "https://recree.io/og-default.png";
  const pageUrl = `https://recree.io/posts/${post.slug}`;
  const fullTitle = `${title} | reCree`;

  return {
    title,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url: pageUrl,
      siteName: "reCree",
      images: [{ url: imageUrl, width: 1200, height: 630 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
  };
}

export default async function PostDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { preview } = await searchParams;
  const isPreview = preview === "1";

  const [currentUser, tagGroupConfigs] = await Promise.all([
    getCurrentUser(),
    prisma.tagGroupConfig.findMany({
      select: { group: true, displayLabel: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
  ]);

  const result = await getPostDetail(slug, { userId: currentUser?.id, isPreview });
  if (!result) notFound();

  const { post, comments, isSaved, isLikedByMe } = result;

  const reCreeshorts = await prisma.reCreeshot.findMany({
    where: { linkedPostId: post.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      imageUrl: true,
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
    ...post.postTopics.map(({ topic }) => ({ text: topic.nameEn, slug: topic.level === 2 ? (topic.slug ?? undefined) : undefined, ...resolveTopicColors(topic) })),
    ...post.postTags.filter(({ tag }) => tag.group === K_MEDIA_GROUP).map(({ tag }) => ({ text: tag.name, ...resolveTagColors(tag, configMap.get(tag.group)) })),
    ...post.postTags.filter(({ tag }) => tag.group !== K_MEDIA_GROUP).map(({ tag }) => ({ text: tag.name, ...resolveTagColors(tag, configMap.get(tag.group)) })),
  ];

  const spotInsight = post.postPlaces[0] ?? null;
  const insightEn = spotInsight?.insightEn as {
    context?: string;
    mustTry?: string;
    tip?: string;
  } | null;

  const placeLabel = spotInsight?.place.nameEn ?? spotInsight?.place.nameKo;
  const headline = placeLabel ?? (post.isShop && post.subtitle ? post.subtitle : null);
  const storySubtitle = post.isShop ? "The full story behind this product" : "The full story behind this spot";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.titleEn,
    "description": post.bodyEn?.slice(0, 160) ?? (placeLabel
      ? `Visit ${placeLabel}, the exact filming location from ${post.titleEn}. Discover iconic K-content spots with reCree.`
      : "Discover iconic K-content spots with reCree."),
    "image": bannerImages.map((img) => ({
      "@type": "ImageObject",
      "url": img.url,
      "contentUrl": img.url,
    })),
    "url": `https://recree.io/posts/${post.slug}`,
    "publisher": {
      "@type": "Organization",
      "name": "reCree",
      "url": "https://recree.io",
    },
    ...(spotInsight && {
      "about": {
        "@type": "TouristAttraction",
        "name": placeLabel,
        "address": spotInsight.place.addressEn ?? undefined,
      },
    }),
  };

  return (
    <article className="pb-8 max-w-2xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {!isPreview && <PostDetailHeader postId={post.id} isLoggedIn={!!currentUser} />}
      {!isPreview && <PostViewTracker postId={post.id} />}
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
      <div className="px-4 pb-2 space-y-1">
        {headline && (
          <p className="text-xl font-bold leading-tight">
            {headline}
          </p>
        )}
        <h1 className={headline ? "text-sm text-muted-foreground leading-snug" : "text-xl font-bold leading-tight"}>
          {post.titleEn}
        </h1>
      </div>

      {/* 좋아요 · 댓글 */}
      <PostActionBar
        postId={post.id}
        initialLiked={isLikedByMe}
        initialLikeCount={post.likeCount}
        commentCount={post.commentCount}
      />

      {/* 구매 버튼 (shop 포스트) */}
      {post.isShop && post.purchaseUrl && (
        <PurchaseButton purchaseUrl={post.purchaseUrl} isAffiliate={post.isAffiliate} />
      )}

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
          placeId={spotInsight.place.id}
          nameEn={spotInsight.place.nameEn}
          nameKo={spotInsight.place.nameKo}
          addressEn={spotInsight.place.addressEn}
          latitude={spotInsight.place.latitude ? Number(spotInsight.place.latitude) : null}
          longitude={spotInsight.place.longitude ? Number(spotInsight.place.longitude) : null}
          googleMapsUrl={spotInsight.place.googleMapsUrl}
          naverMapsUrl={spotInsight.place.naverMapsUrl ?? null}
          streetViewUrl={spotInsight.place.streetViewUrl ?? null}
        />
      )}

      {/* How others reCree'd + Tips (shop 포스트는 숨김) */}
      {!post.isShop && (
        <PostReCreeshotSection
          postId={post.id}
          shots={reCreeshorts}
          originalImageUrl={originalImages[0]?.url ?? null}
          isLoggedIn={!!currentUser}
        />
      )}

      {/* 본문 */}
      {post.bodyEn && (
        <div className="mx-4 mt-3 rounded-2xl border border-secondary bg-white overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <p className="text-sm font-bold">Story</p>
            <p className="text-xs text-muted-foreground mt-0.5">{storySubtitle}</p>
          </div>
          <div className="px-4 pb-4">
            <MarkdownContent source={post.bodyEn} />
          </div>
        </div>
      )}

      {/* From the Source */}
      <SourceSection sources={post.postSources.map((s) => ({ ...s, platform: s.platform as SourcePlatform | null }))} />

      {/* Photo Credits */}
      <ImageCreditSection
        credits={post.postImages
          .filter((img): img is typeof img & { creditText: string } => !!img.creditText)
          .map((img) => img.creditText)}
      />

      {/* 출처 */}
      {post.source && (
        <p className="px-4 mt-6 text-xs text-muted-foreground">
          Source: {post.source}
        </p>
      )}

      {/* 댓글 섹션 */}
      <PostComments
        postId={post.id}
        initialComments={comments}
        initialCommentCount={post.commentCount}
        currentUserId={currentUser?.id ?? null}
        currentUserRole={currentUser?.role ?? null}
        currentUserNickname={currentUser?.nickname ?? null}
        currentUserProfileImageUrl={currentUser?.profileImageUrl ?? null}
      />
    </article>
  );
}
