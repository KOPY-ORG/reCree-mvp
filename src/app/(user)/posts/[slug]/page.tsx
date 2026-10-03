import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LocationCard } from "./_components/LocationCard";
import { prisma } from "@/lib/prisma";
import { selectDetailLabels, type ResolvedLabel } from "@/lib/post-labels";
import { PostDetailHeader } from "./_components/PostDetailHeader";
import { BannerCarousel } from "./_components/BannerCarousel";
import { OriginalSourceCards } from "./_components/OriginalSourceCards";
import { BannerReCreeshotButton } from "./_components/BannerReCreeshotButton";
import { SourceSection, splitSources } from "./_components/SourceSection";
import { SocialEmbed, SocialEmbedProvider, SocialEmbedSwitch, SocialMediaRow } from "./_components/SocialEmbed";
import { isSocialEmbeddable, pickSocialEmbed } from "./_components/social-source";
import { ImageCreditSection } from "./_components/ImageCreditSection";
import { PostMetaBar } from "./_components/PostMetaBar";
import { getCurrentUser } from "@/lib/auth";
import type { SourcePlatform } from "@/types";
import { PostReCreeshotSection } from "./_components/PostReCreeshotSection";
import { getPostDetail } from "@/lib/post-detail-query";
import { PostActionBar } from "./_components/PostActionBar";
import { PostMoreMenu } from "./_components/PostMoreMenu";
import { LikeSaveButtons } from "./_components/LikeSaveButtons";
import { PostLikeProvider } from "./_components/PostLikeProvider";
import { PurchaseButton } from "./_components/PurchaseButton";
import { PostComments } from "./_components/PostComments";
import { PostViewTracker } from "./_components/PostViewTracker";
import { NearbyAttractionsSection } from "./_components/NearbyAttractionsSection";
import { MustTryCard } from "./_components/MustTryCard";
import { StoryCard } from "./_components/StoryCard";
import { ViewOnMapButton } from "./_components/ViewOnMapButton";
import { HelpfulVote } from "./_components/HelpfulVote";
import { readVoterKey } from "@/lib/helpful-vote";
import { getAllMapPlaces } from "@/lib/map-queries";
import { getSavedPostIds } from "@/lib/post-queries";
import { getTopicMarkerColor, getTopicMarkerGradient } from "@/lib/map-utils";

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

  const result = await getPostDetail(slug, { userId: currentUser?.id, isPreview, voterKey: await readVoterKey() });
  if (!result) notFound();

  const { post, comments, isSaved, isLikedByMe, isHelpfulByMe } = result;

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

  // 출처는 맨 위 유튜브 하나와 나머지로 나눈다 — lg 에서 유튜브는 왼쪽 열 미디어 칸, 나머지는 오른쪽 열 출처 카드가 된다.
  // 둘을 이어 붙이면 모바일의 한 줄 순서 그대로다. 각 묶음이 비면 SourceSection 이 null 이라 래퍼도 렌더하지 않는다
  const { youTube, rest: restSources } = splitSources(
    post.postSources.map((s) => ({ ...s, platform: s.platform as SourcePlatform | null }))
  );
  const hasRestAttribution = restSources.length > 0 || !!post.source;
  // 유튜브가 없으면 출처 중 첫 인스타그램 · X 게시물을 임베드한다 — lg 는 미디어 줄 왼쪽(오른쪽에 사진 세로 캐러셀),
  // 모바일은 출처 카드 자리. 서버에서 oEmbed 로 지금 임베드되는지 먼저 확인하고, 안 되면(삭제 · 비공개 · 임베드 끔) 지금 화면 그대로다
  const socialPick = youTube ? null : pickSocialEmbed(restSources);
  const social = socialPick && (await isSocialEmbeddable(socialPick.embed)) ? socialPick : null;
  const credits = post.postImages
    .filter((img): img is typeof img & { creditText: string } => !!img.creditText)
    .map((img) => img.creditText);
  // 위치 카드 마커는 discover 지도와 같은 마커다. 색 · 개수 · 저장 표시를 discover 와 같은 데이터로 정해야
  // 두 화면의 같은 장소가 같은 핀이 된다 — discover 가 쓰는 캐시(getAllMapPlaces, 60초)에서 이 장소를 꺼낸다
  const hasLocation =
    !!spotInsight && spotInsight.place.latitude !== null && spotInsight.place.longitude !== null;
  const [mapPlaces, savedPostIds] = hasLocation
    ? await Promise.all([getAllMapPlaces(), getSavedPostIds(currentUser?.id ?? null)])
    : [[], new Set<string>()];
  const mapPlace = hasLocation ? mapPlaces.find((p) => p.id === spotInsight.place.id) : undefined;
  const locationMarker = {
    color: (mapPlace && getTopicMarkerColor(mapPlace.posts)) ?? "#D3FD52",
    gradient: mapPlace ? getTopicMarkerGradient(mapPlace.posts) : undefined,
    postCount: mapPlace?.posts.length ?? 1,
    isSaved: mapPlace?.posts.some((p) => savedPostIds.has(p.id)) ?? false,
  };

  const showNearby =
    !post.isShop &&
    !!spotInsight &&
    spotInsight.place.latitude !== null &&
    spotInsight.place.longitude !== null;

  // 블록은 전부 한 번만 렌더한다(유튜브 iframe · 지도 · h1 이 두 벌 생기지 않게). 그래서 DOM 은 lg 의 두 열 모양이고,
  // 모바일은 두 열 래퍼를 display: contents 로 풀어 블록들을 바깥 flex 열의 형제로 만든 뒤 order 로 순서를 되돌린다.
  //   모바일: 사진 1 → 칩 · 제목 2 → Fan To-Do 3 → 구매 4 → 출처(유튜브 · 인스타그램 · X 임베드 → 나머지) 5 → Story 6 → 위치 7
  //          → recreeshot 8 → 주변 관광지 9 → 댓글 10 → 좋아요 · 저장 · 도움이 됐어요 11 → 사진 크레딧 12
  //   lg   : 왼쪽 = 미디어 → Fan To-Do → Story → 주변 관광지 → 댓글 → 사진 크레딧 (칩 · 더보기 줄은 미디어 다음)
  //            미디어 = 유튜브(아래 사진 줄) / 인스타그램 · X 임베드(옆에 사진 세로 캐러셀) / 사진(16:9 캐러셀) 중 있는 것 하나
  //          오른쪽 = 제목 · 아이콘 줄 → 구매 → 위치 → 출처 카드(미디어 밖) → recreeshot → 좋아요 줄
  // 왼쪽 미디어 칸을 채울 것(유튜브 · 사진)이 없으면 lg 에서도 두 열을 풀어 모바일 순서 그대로 한 줄로 둔다.
  // 블록 사이 간격은 모바일은 각 블록의 위 마진이(붙어 있는 블록은 0), lg 는 각 열의 gap 이 맡는다 —
  // 칩 · 제목 · Fan To-Do 는 모바일에서 사진에 붙어 있지만 lg 에서는 다른 열이라 gap 하나로는 둘 다 맞출 수 없다.
  // 각 블록 안쪽 요소의 위아래 마진은 래퍼에서 지운다(block)
  const twoCol = !!youTube || !!social || hasBanner;
  const ORDER = ["order-1", "order-2", "order-3", "order-4", "order-5", "order-6",
                 "order-7", "order-8", "order-9", "order-10", "order-11", "order-12"];
  // 모바일 바깥 틀은 2칸 격자다 — 칩(1fr) 옆에 댓글 · 저장(auto)이 서고, 나머지 블록은 두 칸을 다 쓴다(SPAN).
  // 칩과 아이콘 줄이 lg 에서 서로 다른 열로 갈리므로 한 블록 안 격자로는 둘 다 맞출 수 없다
  const SPAN = "col-span-2 min-w-0";
  const order = (n: number) => `${SPAN} ${twoCol ? `${ORDER[n - 1]} lg:order-none` : ORDER[n - 1]}`;
  const gap = twoCol ? "mt-6 lg:mt-0" : "mt-6";
  const column = (lgGap: string) => (twoCol ? `contents lg:flex lg:min-w-0 lg:flex-col ${lgGap}` : "contents");
  const block = "[&>*]:mt-0 [&>*]:mb-0";

  // 배너 캐러셀 — 모바일은 화면 맨 위까지 올려 풀블리드 (미리보기엔 헤더 없으므로 margin 제거).
  // 상단 버튼(PostDetailHeader)은 이 안에서 렌더한다 — 모바일은 화면 위에 고정, lg 는 숨는다.
  // lg 모양 — media: 미디어 칸(16:9 캐러셀). strip: 영상 아래 사진 줄(약 2.5장, 영상과 16 간격).
  // column: 인스타 · X 임베드 오른쪽 세로 사진 줄(미디어 줄이 높이 · 좌우 여백을 정한다).
  // 모바일 모양은 셋 다 같다 — 임베드가 실패하면 media 로 다시 그린다(SocialEmbedSwitch)
  const bannerBlock = (lgLayout: "media" | "strip" | "column") => {
    // 사진이 미디어 칸이 아니면(영상 · 임베드 옆 사진 줄) 원본 장면 카드 · 카메라 버튼은 숨긴다 — 영상 · 임베드가 원본이고, 오른쪽 열 recreeshot 카드가 카메라를 맡는다
    const photoRow = lgLayout !== "media";
    const outer = { media: "", strip: "lg:-mt-3", column: "lg:min-w-0 lg:flex-1" }[lgLayout];
    const inner = { media: "lg:mx-4 lg:overflow-hidden lg:rounded-[20px]", strip: "lg:mx-4", column: "" }[lgLayout];
    return (
      <div className={`${order(1)} mt-0 ${outer}`}>
        <div className={`lg:mt-0 ${inner} ${isPreview ? "" : "-mt-12"}`}>
          <BannerCarousel images={bannerImages} lgLayout={lgLayout}>
            {!isPreview && (
              <PostDetailHeader postId={post.id} isLoggedIn={!!currentUser} isSaved={isSaved} titleEn={post.titleEn} />
            )}
            {/* 원본 장면 카드 — 왼쪽 아래. lg 는 사진이 미디어 칸일 때만(영상 글의 사진 줄에서는 숨긴다).
                lg 줄 폭은 가운데 점 앞(50% − 64)에서 멈추고 카드가 그 안에서 줄어든다. 화살표(세로 가운데) · 카메라(오른쪽 아래)와는 자리가 갈린다 */}
            <OriginalSourceCards
              images={originalImages}
              originalLinkUrls={originalLinkUrls}
              className={`absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex gap-2 sm:gap-3 z-10 ${photoRow ? "lg:hidden" : "lg:max-w-[calc(50%-4rem)]"}`}
            />
            {/* recreeshot 추가 — 아래 recreeshot 섹션과 같은 조건(shop 은 숨김). 미리보기에선 누를 일이 없다.
                lg 사진 줄에서는 뺀다 — 오른쪽 열 recreeshot 카드가 맡는다 */}
            {!post.isShop && !isPreview && (
              <BannerReCreeshotButton
                postId={post.id}
                originalImageUrl={originalImages[0]?.url ?? null}
                isLoggedIn={!!currentUser}
                className={photoRow ? "lg:hidden" : ""}
              />
            )}
          </BannerCarousel>
        </div>
      </div>
    );
  };

  // 오른쪽 열 출처 카드 묶음. withoutSocial 이면 임베드한 출처를 카드에서 빼고, 남는 것이 없으면 묶음째 그리지 않는다 (간격이 남지 않게).
  // 모바일은 영상 · 임베드 바로 아래(간격 12), 둘 다 없으면 출처 자리
  const restBlock = (withoutSocial: boolean) => {
    const sources = withoutSocial ? restSources.filter((s) => s.id !== social?.source.id) : restSources;
    if (sources.length === 0 && !post.source) return null;
    return (
      <div className={`${order(5)} ${youTube || withoutSocial ? "mt-3 lg:mt-0" : gap} flex flex-col gap-3 ${block}`}>
        <SourceSection sources={sources} />
        {post.source && (
          <p className="px-4 text-xs text-muted-foreground">
            Source: {post.source}
          </p>
        )}
      </div>
    );
  };

  // lg: 상세는 1440 으로 퍼지지 않고 1200(+ 좌우 48)에서 멈춘다 — desktop-layout.md §15 원칙 4, post-detail-pc-mock.html.
  // 블록마다 모바일 좌우 여백 16 을 그대로 두므로, 바깥 여백(32)과 열 사이(8)에 그만큼을 덜 준다 → 실제 여백 48 · 열 사이 40.
  // 오른쪽 열은 내용 폭 350, 넓은 화면(1400~)에서 380
  return (
    <article className="pb-8 max-w-2xl mx-auto lg:max-w-[81rem]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* 모바일 상단 버튼. 사진이 있으면 사진 안에서 렌더한다. lg 는 숨고 제목 아래 아이콘 줄이 대신한다 */}
      {!isPreview && !hasBanner && (
        <PostDetailHeader postId={post.id} isLoggedIn={!!currentUser} isSaved={isSaved} titleEn={post.titleEn} />
      )}
      {!isPreview && <PostViewTracker postId={post.id} />}
      {isPreview && (
        <div className="bg-amber-100 text-amber-800 text-xs text-center py-2 font-medium">
          미리보기 모드 — 실제 발행 전 상태입니다
        </div>
      )}

      <PostLikeProvider postId={post.id} initialLiked={isLikedByMe} isLoggedIn={!!currentUser}>
      <SocialEmbedProvider>
      <div
        className={
          twoCol
            ? "grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_382px] lg:items-start lg:gap-x-2 lg:px-8 lg:pt-6 min-[87.5rem]:grid-cols-[minmax(0,1fr)_412px]"
            : "grid grid-cols-[minmax(0,1fr)_auto] lg:mx-auto lg:max-w-2xl lg:pt-4"
        }
      >
      {/* 왼쪽 열 */}
      <div className={column("lg:gap-7")}>
      {/* 맨 위 유튜브 — lg 는 왼쪽 열 미디어 칸(16:9), 모바일은 출처 자리. 음소거 자동재생 · 타임스탬프 · 자막 · Sound on 은 YouTubeEmbed 그대로 */}
      {youTube && (
        <div className={`${order(5)} ${gap} ${block}`}>
          <SourceSection sources={[youTube]} autoplay />
        </div>
      )}

      {/* 인스타그램 · X 게시물 + 장소 사진. lg 는 한 줄(임베드 카드 | 사진 세로 캐러셀), 모바일은 풀려서 사진은 맨 위,
          임베드는 출처 카드 자리(유튜브와 같은 순서)에 카드 자체만 선다. 카드가 뜨지 않으면(8초) 임베드가 빠지고 지금 화면으로 돌아간다 */}
      {social ? (
        <SocialMediaRow>
          <SocialEmbedSwitch
            embedded={
              <div className={`${order(5)} ${gap} px-4 lg:flex-none lg:px-0`}>
                <SocialEmbed embed={social.embed} hasPhotos={hasBanner} />
              </div>
            }
            fallback={null}
          />
          {hasBanner && <SocialEmbedSwitch embedded={bannerBlock("column")} fallback={bannerBlock("media")} />}
        </SocialMediaRow>
      ) : (
        hasBanner && bannerBlock(youTube ? "strip" : "media")
      )}

      {/* 배너 없을 때 소스 이미지 카드 (칩 위). 모바일 전용 — lg 는 영상 · 출처 카드가 보여 주므로 블록째 숨겨 gap 을 남기지 않는다 */}
      {!hasBanner && (
        <div className={`${order(1)} mt-0 lg:hidden`}>
          <OriginalSourceCards
            images={originalImages}
            originalLinkUrls={originalLinkUrls}
            className={`px-4 pb-1 flex gap-2 ${isPreview ? "pt-3" : "pt-14"}`}
          />
        </div>
      )}

      {/* 토픽 · 태그 칩 + 더보기. 모바일은 풀려서(contents) 칩이 바깥 격자 첫 칸, 같은 줄 둘째 칸에 댓글 · 저장(오른쪽 열 DOM)이 선다.
          lg 는 왼쪽 열 미디어 바로 아래 한 줄 — 칩(넘치면 줄바꿈) | 더보기(PostMoreMenu, lg 전용) */}
      <div className={`${order(2)} contents lg:flex lg:items-start lg:gap-x-2 lg:px-4`}>
        <div className="order-2 col-start-1 min-w-0 self-start pl-4 pt-3 lg:order-none lg:flex-1 lg:p-0">
          <PostMetaBar labels={labels} />
        </div>
        <PostMoreMenu postId={post.id} isLoggedIn={!!currentUser} />
      </div>

      {/* Fan To-Do — 모바일은 제목 바로 아래에 붙는다. 값이 없으면 카드도 없다 */}
      {mustTry && (
        <div className={`${order(3)} mt-0 pt-2 pb-1 ${twoCol ? "lg:p-0" : ""}`}>
          <MustTryCard text={mustTry} />
        </div>
      )}

      {/* 본문 — lg 는 접지 않는다(StoryCard) */}
      {post.bodyEn && (
        <div className={`${order(6)} ${gap}`}>
          <StoryCard body={post.bodyEn} />
        </div>
      )}

      {/* Nearby Attractions (시안 :885) — 0건이면 컴포넌트가 null 을 돌려주므로 래퍼도 숨겨 gap 을 남기지 않는다.
          좌표 없는 Place 는 실측 0건이지만 latitude 가 nullable 이라 방어는 남긴다 */}
      {showNearby && (
        <div className={`${order(9)} ${gap} ${block} empty:hidden`}>
          <NearbyAttractionsSection
            lat={Number(spotInsight.place.latitude)}
            lng={Number(spotInsight.place.longitude)}
            placeLabel={spotInsight.place.nameEn ?? spotInsight.place.nameKo}
          />
        </div>
      )}

      {/* 댓글 섹션 */}
      <div className={`${order(10)} ${gap} ${block}`}>
        <PostComments
          postId={post.id}
          initialComments={comments}
          initialCommentCount={post._count.comments}
          currentUserId={currentUser?.id ?? null}
          currentUserRole={currentUser?.role ?? null}
          currentUserNickname={currentUser?.nickname ?? null}
          currentUserProfileImageUrl={currentUser?.profileImageUrl ?? null}
        />
      </div>

      {/* 사진 크레딧 — 페이지 맨 아래. 없으면 컴포넌트가 null 이라 래퍼도 숨긴다 */}
      {credits.length > 0 && (
        <div className={`${order(12)} ${gap} ${block}`}>
          <ImageCreditSection credits={credits} />
        </div>
      )}
      </div>

      {/* 오른쪽 열 */}
      <div className={column("lg:gap-5")}>
      {/* 제목 + 아이콘 줄. 모바일은 풀려서(contents) 아이콘 줄이 칩 옆(둘째 칸), 제목이 다음 줄 두 칸이 된다 —
          자동 배치는 뒤로 돌아가지 않으므로 DOM 은 아이콘 줄이 먼저다. lg 는 오른쪽 열 맨 위 — 제목 / 좋아요 · 저장 · 댓글 · 공유.
          아이콘 칸(42)이 아이콘(24)보다 커서 아래로 남는 9 만큼 lg 에서 블록 아래를 당긴다 */}
      <div className={`${order(2)} contents lg:flex lg:flex-col lg:px-4 ${twoCol ? "lg:-mb-2.5" : ""}`}>
        <div className="order-2 col-start-2 self-start pt-3 pr-4 pl-2 lg:order-2 lg:p-0">
          <PostActionBar postId={post.id} isSaved={isSaved} isLoggedIn={!!currentUser} titleEn={post.titleEn} />
        </div>
        <div className="order-2 col-span-2 min-w-0 space-y-1 px-4 pt-2 pb-2 lg:order-1 lg:p-0">
          {headline && (
            <p className="text-xl font-bold leading-tight lg:text-[28px] lg:leading-[1.2]">
              {headline}
            </p>
          )}
          <h1
            className={
              headline
                ? "text-sm text-muted-foreground leading-snug lg:pt-1 lg:text-base"
                : "text-xl font-bold leading-tight lg:text-[28px] lg:leading-[1.2]"
            }
          >
            {post.titleEn}
          </h1>
        </div>
      </div>

      {/* 구매 버튼 (shop 포스트) — 모바일은 제목 · Fan To-Do 아래에 붙는다 */}
      {post.isShop && post.purchaseUrl && (
        <div className={`${order(4)} mt-0 lg:[&>*]:mt-0`}>
          <PurchaseButton purchaseUrl={post.purchaseUrl} isAffiliate={post.isAffiliate} />
        </div>
      )}

      {/* Location 카드 */}
      {spotInsight && (
        <div className={`${order(7)} ${gap} ${block}`}>
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
            marker={locationMarker}
          />
        </div>
      )}

      {/* 유튜브 밖의 출처(인스타그램 · X 등) 카드 · 출처 문구. 임베드한 게시물은 여기 카드에서 뺀다 — 임베드가 실패하면 다시 넣는다 */}
      {hasRestAttribution &&
        (social ? <SocialEmbedSwitch embedded={restBlock(true)} fallback={restBlock(false)} /> : restBlock(false))}

      {/* How others reCree'd — 없으면 제목 없이 추가 카드만 (shop 포스트는 숨김) */}
      {!post.isShop && (
        <div className={`${order(8)} ${gap} ${block}`}>
          <PostReCreeshotSection
            postId={post.id}
            shots={reCreeshorts}
            originalImageUrl={originalImages[0]?.url ?? null}
            isLoggedIn={!!currentUser}
          />
        </div>
      )}

      {/* 좋아요 · 저장(로그인 필요) · 도움이 됐어요(로그인 없이) 한 줄. 모바일은 댓글 바로 아래, lg 는 오른쪽 열 맨 아래. 미리보기에선 숨김.
          아래 끝이 lg 임베드 미디어 줄의 높이 기준이다 (SocialEmbed, data-media-end) */}
      {!isPreview && (
        <div data-media-end className={`${order(11)} ${gap}`}>
          <HelpfulVote postId={post.id} initialVoted={isHelpfulByMe}>
            <LikeSaveButtons postId={post.id} isSaved={isSaved} isLoggedIn={!!currentUser} />
          </HelpfulVote>
        </div>
      )}
      </div>
      </div>
      </SocialEmbedProvider>
      </PostLikeProvider>
      {/* 모바일: 하단 내비게이션 위에 뜨는 View on Map. 위치가 있는 글에서만. lg 는 위치 카드 안 버튼으로 대신한다 */}
      {hasLocation && !isPreview && <ViewOnMapButton placeId={spotInsight.place.id} />}
    </article>
  );
}
