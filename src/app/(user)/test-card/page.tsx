/**
 * 임시 렌더 검증 페이지 — EventListCard / EventVerticalCard 컴포넌트 확인 후 삭제 예정
 */
import { EventListCard } from "@/components/maps/EventListCard";
import { EventVerticalCard } from "@/components/maps/EventVerticalCard";
import type { EventCollectionMapEvent } from "@/lib/event-collection-queries";

const DUMMY_WITH_IMAGE: EventCollectionMapEvent = {
  id: "ev-1",
  slug: "arirang-concert",
  nameEn: "ARIRANG 2025 Opening Night Concert",
  descriptionEn: "Grand opening concert at BEXCO",
  startDate: new Date("2026-06-20T00:00:00Z"),
  endDate: new Date("2026-06-22T00:00:00Z"),
  openTime: "18:00",
  closeTime: "22:00",
  category: "CONCERT",
  entryType: "TICKET",
  bannerImageUrl:
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80",
  place: {
    id: "pl-1",
    latitude: 35.1796,
    longitude: 129.0756,
    nameEn: "BEXCO Exhibition Center",
    addressEn: "55, APEC-ro, Haeundae-gu, Busan",
  },
};

const DUMMY_NO_IMAGE: EventCollectionMapEvent = {
  id: "ev-2",
  slug: "arirang-popup",
  nameEn: "K-Culture Pop-up Market",
  descriptionEn: null,
  startDate: new Date("2026-06-04T00:00:00Z"),
  endDate: new Date("2026-06-14T00:00:00Z"),
  openTime: "10:00",
  closeTime: "20:00",
  category: "SHOPPING",
  entryType: "WALK_IN",
  bannerImageUrl: null,
  place: {
    id: "pl-2",
    latitude: 35.158,
    longitude: 129.059,
    nameEn: "Busan Cinema Center",
    addressEn: "120 Suyeong-ro, Haeundae-gu",
  },
};

const DUMMY_VERTICAL_D8: EventCollectionMapEvent = {
  id: "ev-v1",
  slug: "bts-concert-d8",
  nameEn: "BTS World Tour: Yet To Come in Seoul",
  descriptionEn: null,
  startDate: new Date("2026-06-12T00:00:00Z"),
  endDate: new Date("2026-06-15T00:00:00Z"),
  openTime: "19:00",
  closeTime: "22:00",
  category: "CONCERT",
  entryType: "TICKET",
  bannerImageUrl:
    "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80",
  place: {
    id: "pl-v1",
    latitude: 37.515,
    longitude: 127.038,
    nameEn: "KSPO Dome, Seoul",
    addressEn: "424, Olympic-ro, Songpa-gu",
  },
};

const DUMMY_VERTICAL_NOW: EventCollectionMapEvent = {
  id: "ev-v2",
  slug: "bts-popup-now",
  nameEn: "BTS Pop-up: Space Of BTS",
  descriptionEn: null,
  startDate: new Date("2026-05-28T00:00:00Z"),
  endDate: new Date("2026-06-14T00:00:00Z"),
  openTime: "10:00",
  closeTime: "20:00",
  category: "PROMOTION",
  entryType: "WALK_IN",
  bannerImageUrl: null,
  place: {
    id: "pl-v2",
    latitude: 37.523,
    longitude: 127.03,
    nameEn: "COEX Mall, Gangnam",
    addressEn: "513 Yeongdong-daero, Gangnam-gu",
  },
};

export default function TestCardPage() {
  return (
    <div className="min-h-screen bg-[#F4F5F7] p-6 space-y-6">
      <h1 className="text-xl font-bold">EventListCard 렌더 검증</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Default (배너 있음)</h2>
        <EventListCard
          event={DUMMY_WITH_IMAGE}
          collectionName="ARIRANG 2025"
          collectionSlug="arirang-2025"
          isSaved={false}
          notchBg="#F4F5F7"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Selected (배너 있음)</h2>
        <EventListCard
          event={DUMMY_WITH_IMAGE}
          collectionName="ARIRANG 2025"
          collectionSlug="arirang-2025"
          isSelected
          isSaved={false}
          notchBg="#F4F5F7"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Saved (북마크 채움)</h2>
        <EventListCard
          event={DUMMY_WITH_IMAGE}
          collectionName="ARIRANG 2025"
          collectionSlug="arirang-2025"
          isSaved
          notchBg="#F4F5F7"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">배너 없음</h2>
        <EventListCard
          event={DUMMY_NO_IMAGE}
          collectionName="ARIRANG 2025"
          collectionSlug="arirang-2025"
          isSaved={false}
          notchBg="#F4F5F7"
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Selected + Saved</h2>
        <EventListCard
          event={DUMMY_NO_IMAGE}
          collectionName="ARIRANG 2025"
          collectionSlug="arirang-2025"
          isSelected
          isSaved
          notchBg="#F4F5F7"
        />
      </section>

      {/* ── EventVerticalCard ── */}
      <h1 className="text-xl font-bold pt-4">EventVerticalCard 렌더 검증</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">배너 있음 + D-8</h2>
        <div className="max-w-[220px]">
          <EventVerticalCard
            event={DUMMY_VERTICAL_D8}
            collectionName="BTS 2026"
            collectionSlug="bts-2026"
            notchBg="#F4F5F7"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">배너 없음 + NOW</h2>
        <div className="max-w-[220px]">
          <EventVerticalCard
            event={DUMMY_VERTICAL_NOW}
            collectionName="BTS 2026"
            collectionSlug="bts-2026"
            notchBg="#F4F5F7"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">캐러셀 edge-peek 시뮬레이션</h2>
        <div
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide px-[6%]"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {[DUMMY_VERTICAL_D8, DUMMY_VERTICAL_NOW, DUMMY_VERTICAL_D8].map((ev, i) => (
            <div key={i} className="flex-shrink-0" style={{ width: "72%", scrollSnapAlign: "center" }}>
              <EventVerticalCard
                event={ev}
                collectionName="BTS 2026"
                collectionSlug="bts-2026"
                notchBg="#F4F5F7"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
