/**
 * 임시 렌더 검증 페이지 — EventListCard 컴포넌트 확인 후 삭제 예정
 */
import { EventListCard } from "@/components/maps/EventListCard";
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
    </div>
  );
}
