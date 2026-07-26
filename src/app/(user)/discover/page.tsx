import { getSavedPostIds, getSavedEventIds } from "@/lib/post-queries";
import { getAllMapPlaces } from "@/lib/map-queries";
import { getCurrentUser } from "@/lib/auth";
import { getTagGroupsWithTags } from "@/lib/filter-queries";
import { getLevel0TopicsDeep } from "@/lib/topic-queries";
import {
  getActiveEventCollections,
  getEventCollectionForMap,
} from "@/lib/event-collection-queries";
import type { EventCollectionForMap } from "@/lib/event-collection-queries";
import { getCuratedSections, getSectionData } from "@/lib/curation-queries";
import { ExploreMapView } from "./_components/ExploreMapView";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://recree.io";
const DEFAULT_TITLE = "K-Culture Map";
const DEFAULT_DESCRIPTION =
  "Explore K-pop and K-drama filming locations, cafes, and photo spots across Korea.";

// 콤마 구분 문자열/배열 파라미터를 값 배열로 정규화 (공백/빈 값 제거)
function parseAxis(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  const raw = Array.isArray(v) ? v.join(",") : v;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const topics = parseAxis(sp.topics);
  const tags = parseAxis(sp.tags);
  const tagGroups = parseAxis(sp.tagGroups);
  const region = parseAxis(sp.region);

  // 인식된 축만 고정 순서로 재구성한 정규화 self URL (canonical / og:url 용)
  const qs = new URLSearchParams();
  if (topics.length) qs.set("topics", topics.join(","));
  if (tags.length) qs.set("tags", tags.join(","));
  if (tagGroups.length) qs.set("tagGroups", tagGroups.join(","));
  if (region.length) qs.set("region", region.join(","));
  const selfUrl = qs.toString() ? `${BASE_URL}/discover?${qs.toString()}` : `${BASE_URL}/discover`;

  // 값이 있는 축이 정확히 1개 && 그 축 값이 1개일 때만 단일 필터로 취급
  const present = [
    { axis: "topics", values: topics },
    { axis: "tags", values: tags },
    { axis: "tagGroups", values: tagGroups },
    { axis: "region", values: region },
  ].filter((a) => a.values.length > 0);
  const isBase = present.length === 0;
  const single = present.length === 1 && present[0].values.length === 1 ? present[0] : null;

  // region은 라벨 조회 없이 index 제외. 단일 topic/tagGroup/tag만 라벨 조회 (별개 경량 쿼리)
  let label: string | null = null;
  if (single && single.axis !== "region") {
    const value = single.values[0];
    if (single.axis === "topics") {
      const t = await prisma.topic.findUnique({ where: { slug: value }, select: { nameEn: true } });
      label = t?.nameEn || null;
    } else if (single.axis === "tagGroups") {
      const g = await prisma.tagGroupConfig.findUnique({ where: { group: value }, select: { nameEn: true } });
      label = g?.nameEn || null;
    } else if (single.axis === "tags") {
      const tg = await prisma.tag.findUnique({ where: { slug: value }, select: { name: true } });
      label = tg?.name || null;
    }
  }

  // index 대상 = 필터 없는 기본, 또는 라벨을 찾은 단일 필터. (조합/region/잘못된 slug → noindex)
  const isIndexTarget = isBase || Boolean(label);

  const title = label ? `${label} Spots in Korea` : DEFAULT_TITLE;
  const description = label
    ? `Find ${label} spots across Korea on the reCree map — filming locations, cafes, and photo spots loved by fans.`
    : DEFAULT_DESCRIPTION;
  const fullTitle = `${title} | reCree`;

  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url: selfUrl,
      siteName: "reCree",
      images: [{ url: "/og-default.png", width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/og-default.png"],
    },
  };

  if (isIndexTarget) {
    // canonical = 그 필터가 붙은(또는 기본) URL. robots는 지정 안 함 → 루트 layout 상속(index)
    metadata.alternates = { canonical: selfUrl };
  } else {
    // noindex: canonical은 생략(self og:url만 유지) — noindex + 다른 canonical 상충 방지
    metadata.robots = { index: false, follow: true };
  }

  return metadata;
}

export default async function ExplorePage() {
  const currentUser = await getCurrentUser();

  // 칩용 컬렉션 목록을 먼저 받아야 맵데이터 병렬 preload 가능
  const eventCollections = await getActiveEventCollections();

  const [tagGroups, savedPostIds, savedEventIds, allPlaces, topicTree, eventMapDataEntries, curation] =
    await Promise.all([
      getTagGroupsWithTags(),
      getSavedPostIds(currentUser?.id ?? null),
      getSavedEventIds(currentUser?.id ?? null),
      getAllMapPlaces(),
      getLevel0TopicsDeep(),
      Promise.all(
        eventCollections.map(
          async (c) =>
            [c.slug, await getEventCollectionForMap(c.slug)] as const
        )
      ),
      (async () => {
        const sections = await getCuratedSections({});
        const sectionData = await getSectionData(sections);
        return { sections, sectionData };
      })(),
    ]);

  const eventMapData: Record<string, EventCollectionForMap | null> =
    Object.fromEntries(eventMapDataEntries);
  const { sections, sectionData } = curation;

  const placesWithSaved = allPlaces.map((place) => ({
    ...place,
    isSaved: place.posts.some((p) => savedPostIds.has(p.id)),
  }));

  return (
    <ExploreMapView
      allPlaces={placesWithSaved}
      savedPostIds={[...savedPostIds]}
      savedEventIds={[...savedEventIds]}
      tagGroups={tagGroups}
      topicTree={topicTree}
      isLoggedIn={!!currentUser}
      eventCollections={eventCollections}
      eventMapData={eventMapData}
      sections={sections}
      sectionData={sectionData}
    />
  );
}
