import type { ActiveEventCollection, EventCollectionForMap } from "@/lib/event-collection-queries";
import { EventVerticalCarousel } from "@/components/maps/EventVerticalCarousel";

interface Props {
  eventCollections?: ActiveEventCollection[];
  eventMapData?: Record<string, EventCollectionForMap | null>;
}

const STUB_SECTIONS = ["Theme routes", "Area hotspots"] as const;

export function HotTabStub({ eventCollections, eventMapData }: Props) {
  const firstCol = eventCollections?.[0];
  const colData = firstCol ? (eventMapData?.[firstCol.slug] ?? null) : null;

  return (
    <div className="pb-4 space-y-6">
      {/* Trending now — 실제 이벤트 캐러셀 */}
      <EventVerticalCarousel
        title="Catch it in Busan Now"
        titleClassName="text-sm font-semibold text-foreground"
        events={colData?.markers ?? []}
        collectionSlug={colData?.collection.slug ?? firstCol?.slug ?? ""}
        collectionName={colData?.collection.nameEn ?? ""}
      />

      {/* 나머지 섹션 — stub 유지 */}
      {STUB_SECTIONS.map((title) => (
        <div key={title} className="px-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <span className="text-sm text-muted-foreground">See all ›</span>
          </div>
          <div className="rounded-xl bg-muted h-24 flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Coming soon</span>
          </div>
        </div>
      ))}
    </div>
  );
}
