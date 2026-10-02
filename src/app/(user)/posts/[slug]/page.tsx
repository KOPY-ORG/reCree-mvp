import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Sparkles, Waves, Flame, Lightbulb } from "lucide-react";
import { LocationCard } from "./_components/LocationCard";
import { prisma } from "@/lib/prisma";
import { selectDetailLabels, type ResolvedLabel } from "@/lib/post-labels";
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
import { NearbyAttractionsSection } from "./_components/NearbyAttractionsSection";

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

  // 상세: 토픽 전부 + 팬 맥락 태그 + 장소 타입 전부 (sortOrder 순)
  const labels: ResolvedLabel[] = selectDetailLabels({
    topics: post.postTopics.map(({ topic }) => topic),
    tags: post.postTags.map(({ tag }) => tag),
    placeTypes: post.postPlaces[0]?.place.placePlaceTypes,
    tagGroupMap: configMap,
  });

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

  const hasBanner = bannerImages.length > 0;

  // 모바일 간격 보정 (아래 두 열 래퍼 주석 참고). 모두 모바일에서만 의미가 있고 lg 는 gap 이 간격을 맡는다.
  // SourceSection · ImageCreditSection 이 스스로 null 을 돌려주는 조건과 같은 식이어야 한다.
  const hasSource = post.postSources.some((s) => s.sourceType === "PRIMARY");
  const hasTail =
    post.postImages.some((img) => !!img.creditText) || !!post.source;
  // Source(mb-6 = 24) 뒤에 크레딧(mt-2) · 출처(mt-6)가 오면 예전에는 둘이 겹쳐 24 였다 → 뒤쪽 첫 마진을 지운다
  const sourceGapFix = hasSource ? "[&>:first-child]:mt-0" : "";
  // Source 가 두 열의 마지막이면 그 mb-6 이 아래 Nearby(mt-6) · 댓글(mt-8)과 겹치던 것을 → 지워서 뒤쪽 마진만 남긴다.
  // 크레딧이 마지막일 때(mb-4)는 order-7 래퍼의 [&>:last-child]:mb-0 이 같은 일을 한다
  const tailGapFix = hasSource && !hasTail ? "[&>section]:mb-0" : "";

  return (
    <article className="pb-8 max-w-2xl mx-auto lg:max-w-none">
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

      {/* lg: 두 열. 왼쪽 7 = 사진 → 제목 블록 → 위치 카드 → From the Source, 오른쪽 5 = 나머지(구매 · 인사이트 ·
          recreeshot · Story · 크레딧 · 출처) 원래 순서. 왼쪽이 길어 sticky 없이 양쪽이 자연 스크롤한다.
          배너가 없으면 왼쪽이 비므로 한 줄로 둔다.

          블록은 전부 한 번만 렌더한다(지도 iframe · h1 이 두 벌 생기지 않게). 그래서 DOM 은 lg 의 두 열 모양이고,
          모바일은 두 열 래퍼를 display: contents 로 풀어 조각들을 이 flex 열의 형제로 만든 뒤 order 로 원래 순서
          (사진 1 → 제목 2 → 구매·인사이트 3 → 위치 4 → recreeshot·Story 5 → Source 6 → 크레딧·출처 7)를 되돌린다.

          flex 항목 사이에서는 마진이 겹치지(collapse) 않는다. 모바일 간격이 그대로이려면 겹치던 자리를 손봐야 하는데,
          조각 경계에서 양쪽 마진이 모두 있는 곳은 Source(mb-6) 뒤 두 군데뿐이다 — 아래 sourceGapFix · tailGapFix */}
      <div
        className={
          hasBanner
            ? "flex flex-col lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-6 lg:px-6 lg:pt-20"
            : "flex flex-col lg:mx-auto lg:max-w-2xl lg:pt-4"
        }
      >
      {/* 왼쪽 열 */}
      <div className={hasBanner ? "contents lg:flex lg:min-w-0 lg:flex-col lg:gap-5" : "contents"}>
      {/* 배너 캐러셀 — 헤더(h-12) 높이만큼 위로 올려 풀블리드 (미리보기엔 헤더 없으므로 margin 제거).
          lg 는 헤더가 불투명 바라 올리지 않고, 사진은 둥근 카드로 붙어 있다 */}
      {hasBanner && (
        <div className={`order-1 lg:order-none lg:mx-4 lg:mt-0 lg:overflow-hidden lg:rounded-2xl ${isPreview ? "" : "-mt-12"}`}>
          <BannerCarousel images={bannerImages}>
            <OriginalSourceCards
              images={originalImages}
              originalLinkUrls={originalLinkUrls}
            />
          </BannerCarousel>
        </div>
      )}

      {/* 제목 블록 — 토픽·태그 칩 · 제목 · 부제 · 좋아요·댓글·공유·저장 */}
      <div className={hasBanner ? "order-2 lg:order-none" : "order-2"}>
      {/* 배너 없을 때 소스 이미지 카드 (뱃지 위) */}
      {!hasBanner && (
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
      </div>

      {/* Location 카드. lg 는 간격을 열의 gap 이 맡는다 */}
      {spotInsight && (
        <div className={hasBanner ? "order-4 lg:order-none lg:[&>*]:mt-0" : "order-4"}>
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
        </div>
      )}

      <div className={`${hasBanner ? "order-6 lg:order-none lg:[&>*]:my-0" : "order-6"} ${tailGapFix}`}>
      {/* From the Source */}
      <SourceSection sources={post.postSources.map((s) => ({ ...s, platform: s.platform as SourcePlatform | null }))} />
      </div>
      </div>

      {/* 오른쪽 열. 첫 블록의 위 마진은 lg 에서 지워 사진과 윗선을 맞춘다 */}
      <div className={hasBanner ? "contents lg:block lg:min-w-0 lg:[&>div:first-child>:first-child]:mt-0" : "contents"}>
      <div className={hasBanner ? "order-3 lg:order-none" : "order-3"}>
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
      </div>

      <div className={hasBanner ? "order-5 lg:order-none" : "order-5"}>
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
      </div>

      <div className={`${hasBanner ? "order-7 lg:order-none" : "order-7"} ${sourceGapFix} [&>:last-child]:mb-0`}>
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
      </div>
      </div>
      </div>

      {/* lg: 아래 두 블록은 두 단 밑에서 전체 폭으로 이어진다. 댓글은 읽기 폭으로 좁힌다 */}
      <div className="lg:px-6">

      {/* Nearby Attractions (시안 :885) — 실패 · 0건 · 좌표 없음 · shop 일 때 사라지는
          유일한 블록이라 꼬리에 둔다. 없어져도 위로 붙는 것이 댓글 하나뿐이고,
          Story → Sources → Credits 로 이어지는 본문이 중간에 끊기지 않는다.
          좌표 없는 Place 는 실측 0건이지만 latitude 가 nullable 이라 방어는 남긴다 */}
      {!post.isShop &&
        spotInsight &&
        spotInsight.place.latitude !== null &&
        spotInsight.place.longitude !== null && (
          <NearbyAttractionsSection
            lat={Number(spotInsight.place.latitude)}
            lng={Number(spotInsight.place.longitude)}
            placeLabel={spotInsight.place.nameEn ?? spotInsight.place.nameKo}
          />
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
      </div>
    </article>
  );
}
