import { notFound } from "next/navigation";
import type { Metadata } from "next";
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
import { MustTryCard } from "./_components/MustTryCard";

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
  // Spot Insight 중 화면에 남는 것은 Must-try 하나다. Context · Vibe · Tip 은 데이터는 그대로 두고 표시만 하지 않는다
  const insightEn = spotInsight?.insightEn as { mustTry?: string } | null;
  const mustTry = insightEn?.mustTry?.trim() || null;

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

  // SourceSection 이 스스로 null 을 돌려주는 조건과 같은 식이어야 한다 — 빈 래퍼가 gap 을 남기지 않게
  const hasSource = post.postSources.some((s) => s.sourceType === "PRIMARY");
  const credits = post.postImages
    .filter((img): img is typeof img & { creditText: string } => !!img.creditText)
    .map((img) => img.creditText);
  const hasAttribution = hasSource || credits.length > 0 || !!post.source;
  const showNearby =
    !post.isShop &&
    !!spotInsight &&
    spotInsight.place.latitude !== null &&
    spotInsight.place.longitude !== null;

  // 블록은 전부 한 번만 렌더한다(유튜브 iframe · 지도 · h1 이 두 벌 생기지 않게). 그래서 DOM 은 lg 의 두 열 모양이고,
  // 모바일은 두 열 래퍼를 display: contents 로 풀어 블록들을 바깥 flex 열의 형제로 만든 뒤 order 로 순서를 되돌린다.
  //   모바일: 사진·제목 1 → 출처 2 → Must-try 3 → Story 4 → 위치 5 → recreeshot 6 → 주변 관광지 7 → 댓글 8
  //   lg   : 왼쪽 = 사진·제목 → 출처 → 위치, 오른쪽 = Must-try → Story → recreeshot → 주변 관광지 → 댓글
  // 배너가 없으면 lg 에서도 왼쪽이 비므로 두 열을 풀어 모바일 순서 그대로 한 줄로 둔다.
  // 블록 사이 간격은 바깥 열(과 lg 의 각 열)의 gap 이 맡고, 각 블록의 위아래 마진은 래퍼에서 지운다.
  const order = hasBanner
    ? ["order-1 lg:order-none", "order-2 lg:order-none", "order-3 lg:order-none", "order-4 lg:order-none",
       "order-5 lg:order-none", "order-6 lg:order-none", "order-7 lg:order-none", "order-8 lg:order-none"]
    : ["order-1", "order-2", "order-3", "order-4", "order-5", "order-6", "order-7", "order-8"];
  const column = hasBanner ? "contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6" : "contents";
  const block = "[&>*]:mt-0 [&>*]:mb-0";

  // lg: 상세는 1440 으로 퍼지지 않고 1120(+ 좌우 24)에서 멈춘다 — desktop-layout.md §15 원칙 4. 헤더와 같은 값
  return (
    <article className="pb-8 max-w-2xl mx-auto lg:max-w-[73rem]">
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

      <div
        className={
          hasBanner
            ? "flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:px-6 lg:pt-20"
            : "flex flex-col gap-6 lg:mx-auto lg:max-w-2xl lg:pt-4"
        }
      >
      {/* 왼쪽 열 */}
      <div className={column}>
      {/* 사진 + 제목 블록. 둘은 어느 화면에서나 붙어 있어 한 블록이다 */}
      <div className={order[0]}>
      {/* 배너 캐러셀 — 헤더(h-12) 높이만큼 위로 올려 풀블리드 (미리보기엔 헤더 없으므로 margin 제거).
          lg 는 헤더가 불투명 바라 올리지 않고, 사진은 둥근 카드로 붙어 있다 */}
      {hasBanner && (
        <div className={`lg:mx-4 lg:mt-0 lg:overflow-hidden lg:rounded-2xl ${isPreview ? "" : "-mt-12"}`}>
          <BannerCarousel images={bannerImages}>
            <OriginalSourceCards
              images={originalImages}
              originalLinkUrls={originalLinkUrls}
            />
          </BannerCarousel>
        </div>
      )}

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

      {/* 구매 버튼 (shop 포스트) */}
      {post.isShop && post.purchaseUrl && (
        <PurchaseButton purchaseUrl={post.purchaseUrl} isAffiliate={post.isAffiliate} />
      )}
      </div>

      {/* From the Source(유튜브가 맨 위) · 사진 크레딧 · 출처 문구 */}
      {hasAttribution && (
        <div className={`${order[1]} flex flex-col gap-3 ${block}`}>
          <SourceSection sources={post.postSources.map((s) => ({ ...s, platform: s.platform as SourcePlatform | null }))} />
          <ImageCreditSection credits={credits} />
          {post.source && (
            <p className="px-4 text-xs text-muted-foreground">
              Source: {post.source}
            </p>
          )}
        </div>
      )}

      {/* Location 카드 */}
      {spotInsight && (
        <div className={`${order[4]} ${block}`}>
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
      </div>

      {/* 오른쪽 열 */}
      <div className={column}>
      {mustTry && (
        <div className={order[2]}>
          <MustTryCard text={mustTry} />
        </div>
      )}

      {/* 본문 */}
      {post.bodyEn && (
        <div className={`${order[3]} mx-4 rounded-2xl border border-secondary bg-white overflow-hidden`}>
          <div className="px-4 pt-4 pb-3">
            <p className="text-sm font-bold">Story</p>
            <p className="text-xs text-muted-foreground mt-0.5">{storySubtitle}</p>
          </div>
          <div className="px-4 pb-4">
            <MarkdownContent source={post.bodyEn} />
          </div>
        </div>
      )}

      {/* How others reCree'd — 없으면 추가 카드만 (shop 포스트는 숨김) */}
      {!post.isShop && (
        <div className={`${order[5]} ${block}`}>
          <PostReCreeshotSection
            postId={post.id}
            shots={reCreeshorts}
            originalImageUrl={originalImages[0]?.url ?? null}
            isLoggedIn={!!currentUser}
          />
        </div>
      )}

      {/* Nearby Attractions (시안 :885) — 0건이면 컴포넌트가 null 을 돌려주므로 래퍼도 숨겨 gap 을 남기지 않는다.
          좌표 없는 Place 는 실측 0건이지만 latitude 가 nullable 이라 방어는 남긴다 */}
      {showNearby && (
        <div className={`${order[6]} ${block} empty:hidden`}>
          <NearbyAttractionsSection
            lat={Number(spotInsight.place.latitude)}
            lng={Number(spotInsight.place.longitude)}
            placeLabel={spotInsight.place.nameEn ?? spotInsight.place.nameKo}
          />
        </div>
      )}

      {/* 댓글 섹션 */}
      <div className={`${order[7]} ${block}`}>
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
      </div>
      </div>
    </article>
  );
}
