import type { ActiveEventCollection, EventCollectionForMap } from "@/lib/event-collection-queries";
import { FeedbackForm } from "@/components/feedback/FeedbackForm";
import type { CuratedSectionWithSlug, SectionData } from "@/lib/curation-types";
import type { TagGroupColorMap } from "@/lib/post-labels";
import { EventVerticalCarousel } from "@/components/maps/EventVerticalCarousel";
import { HScrollSection } from "@/components/curation/HScrollSection";
import { PostCard } from "../../_components/PostCard";
import { getPostMoreHref } from "@/lib/curation-types";

interface Props {
  eventCollections?: ActiveEventCollection[];
  eventMapData?: Record<string, EventCollectionForMap | null>;
  sections?: CuratedSectionWithSlug[];
  sectionData?: SectionData[];
  tagGroupMap?: TagGroupColorMap;
  savedPostIdsSet?: Set<string>;
}

export function HotTabStub({ eventCollections, eventMapData, sections, sectionData, tagGroupMap, savedPostIdsSet }: Props) {
  const firstCol = eventCollections?.[0];
  const colData = firstCol ? (eventMapData?.[firstCol.slug] ?? null) : null;
  const map = tagGroupMap ?? (new Map() as TagGroupColorMap);

  return (
    <div className="pb-4 space-y-6">
      {/* 이벤트 캐러셀 */}
      <EventVerticalCarousel
        title="Catch it in London Now"
        titleClassName="text-sm font-semibold text-foreground"
        events={colData?.markers ?? []}
        collectionSlug={colData?.collection.slug ?? firstCol?.slug ?? ""}
        collectionName={colData?.collection.nameEn ?? ""}
      />

      {/* 큐레이션 섹션 */}
      {sections?.map((section, i) => {
        const data = sectionData?.[i];
        if (!data || data.items.length === 0) return null;
        if (data.kind === "reCreeshots") return null;
        return (
          <HScrollSection key={section.id} title={section.titleEn} moreHref={getPostMoreHref(section)} showMore={false}>
            {data.items.map((post, index) => (
              <PostCard
                key={post.id}
                post={post}
                tagGroupMap={map}
                isSaved={savedPostIdsSet?.has(post.id) ?? false}
                priority={index === 0}
              />
            ))}
          </HScrollSection>
        );
      })}

      <div className="px-4">
        <FeedbackForm source="discover" />
      </div>
    </div>
  );
}
