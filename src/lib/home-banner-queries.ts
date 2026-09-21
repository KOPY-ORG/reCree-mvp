// 홈 배너 조회 + 표시용 변환 — 서버 전용
//
// page.tsx 에 77줄짜리 select 가 인라인으로 박혀 있던 것을 옮겼다.
// 쿼리 내용은 그대로다 — where · orderBy · select 를 손대지 않았다.
//
// HomeBanner.labelOverrides 는 여기서도 읽지 않는다. 스키마에는 있지만
// 지금껏 쓰인 적이 없고, 되살리는 것은 이 정리의 범위가 아니다.
import { prisma } from "@/lib/prisma";
import {
  selectCardLabels,
  type LabelTopicInput,
  type LabelTagInput,
  type TagGroupColorMap,
  type ResolvedLabel,
} from "@/lib/post-labels";
import type { PlaceTypeLink } from "@/lib/place-types";
import type { BannerItem } from "@/app/(user)/_components/HomeBannerCarousel";

/** 활성 배너를 order 순으로. shop 포스트는 배너에 올리지 않는다 */
export async function getHomeBanners() {
  return prisma.homeBanner.findMany({
    where: { isActive: true, post: { isShop: false } },
    orderBy: { order: "asc" },
    select: {
      id: true,
      post: {
        select: {
          id: true,
          slug: true,
          titleEn: true,
          postImages: {
            where: { isThumbnail: true },
            select: { url: true, focalX: true, focalY: true, zoom: true },
            take: 1,
          },
          postTopics: {
            orderBy: { displayOrder: "asc" },
            select: {
              topicId: true,
              isVisible: true,
              displayOrder: true,
              topic: {
                select: {
                  nameEn: true,
                  colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
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
            orderBy: { displayOrder: "asc" },
            select: {
              tagId: true,
              isVisible: true,
              displayOrder: true,
              tag: {
                select: {
                  name: true, slug: true, group: true,
                  colorHex: true, colorHex2: true, textColorHex: true,
                },
              },
            },
          },
          postPlaces: {
            take: 1,
            select: {
              place: {
                select: {
                  nameEn: true,
                  nameKo: true,
                  placePlaceTypes: {
                    orderBy: { sortOrder: "asc" },
                    select: {
                      sortOrder: true,
                      placeType: { select: { name: true, nameKo: true, category: true, isDefault: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

export type HomeBannerRow = Awaited<ReturnType<typeof getHomeBanners>>[number];

/** 홈 배너용 라벨 2개 선택 — PostCard home variant와 같은 규칙(selectCardLabels)을 그대로 쓴다 */
function resolveBannerLabels(
  postTopics: { isVisible: boolean; displayOrder: number; topic: LabelTopicInput }[],
  postTags:   { isVisible: boolean; displayOrder: number; tag:   LabelTagInput }[],
  placeTypes: readonly PlaceTypeLink[] | undefined,
  tagGroupMap: TagGroupColorMap,
): ResolvedLabel[] {
  return selectCardLabels(
    {
      topics: postTopics.filter((t) => t.isVisible).map((t) => t.topic),
      tags: postTags.filter((t) => t.isVisible).map((t) => t.tag),
      placeTypes,
      tagGroupMap,
    },
    "home",
  );
}

/**
 * 조회 결과를 캐러셀이 받는 모양으로. 라벨 규칙과 표시명 폴백이 여기 모인다.
 * tagGroupMap·savedPostIds 는 다른 쿼리에서 오므로 인자로 받는다.
 */
export function toBannerItems(
  rows: HomeBannerRow[],
  tagGroupMap: TagGroupColorMap,
  savedPostIds: Set<string>,
): BannerItem[] {
  return rows.map((b) => ({
    id: b.post.id,
    slug: b.post.slug,
    titleEn: b.post.titleEn,
    displayName:
      b.post.postPlaces[0]?.place.nameEn ??
      b.post.postPlaces[0]?.place.nameKo ??
      b.post.titleEn,
    thumbnailUrl: b.post.postImages[0]?.url ?? null,
    focalX: b.post.postImages[0]?.focalX ?? null,
    focalY: b.post.postImages[0]?.focalY ?? null,
    zoom: b.post.postImages[0]?.zoom ?? null,
    labels: resolveBannerLabels(
      b.post.postTopics,
      b.post.postTags,
      b.post.postPlaces[0]?.place.placePlaceTypes,
      tagGroupMap,
    ),
    isSaved: savedPostIds.has(b.post.id),
  }));
}
