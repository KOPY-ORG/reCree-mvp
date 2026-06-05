import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { EventCategory, EventEntryType } from "@prisma/client";
import { EventBackButton } from "./_components/EventBackButton";
import { MapPreview } from "@/components/maps/MapPreview";

// ── 상수 ────────────────────────────────────────────────────────────────────────

const ACCENT = "#F01941";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  CONCERT: "Concert",
  LANDMARK_LIGHTING: "Light Show",
  PROMOTION: "Promotion",
  ACTIVITY: "Activity",
  SHOPPING: "Shopping",
  MOBILITY: "Mobility",
  FNB: "F&B",
  STAY: "Stay",
  WELCOME_KIT: "Welcome Kit",
};

const ENTRY_TYPE_INFO: Record<EventEntryType, { label: string; note: string }> = {
  WALK_IN: { label: "Walk-in", note: "No booking needed" },
  RESERVATION: { label: "Reservation", note: "Required before visit" },
  TICKET: { label: "Ticketed", note: "Purchase ticket to enter" },
};

// ── 헬퍼 ────────────────────────────────────────────────────────────────────────

function pickTranslation<T extends { locale: string }>(
  items: T[],
  locale = "en",
  fallback = "ko",
): T | undefined {
  return (
    items.find((t) => t.locale === locale) ??
    items.find((t) => t.locale === fallback) ??
    items[0]
  );
}

function formatDateRangeUTC(start: Date, end: Date): string {
  const opts = { timeZone: "UTC" } as const;
  const startMonth = start.toLocaleDateString("en-US", { ...opts, month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { ...opts, month: "short" });
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  if (startMonth === endMonth && start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${startMonth} ${startDay} – ${endDay}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

function formatTimeRange(open: string | null, close: string | null): string | null {
  if (!open && !close) return null;
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return m ? `${hour}:${String(m).padStart(2, "0")} ${ampm}` : `${hour} ${ampm}`;
  };
  if (open && close) return `${fmt(open)} – ${fmt(close)}`;
  if (open) return `From ${fmt(open)}`;
  return `Until ${fmt(close!)}`;
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ── 데이터 조회 ────────────────────────────────────────────────────────────────

async function getEventDetail(collectionSlug: string, eventSlug: string) {
  return await prisma.event.findFirst({
    where: {
      slug: eventSlug,
      collection: { slug: collectionSlug },
      status: "PUBLISHED",
    },
    select: {
      id: true,
      slug: true,
      category: true,
      startDate: true,
      endDate: true,
      openTime: true,
      closeTime: true,
      entryType: true,
      reservationUrl: true,
      officialUrl: true,
      snsUrl: true,
      bannerImageUrl: true,
      translations: {
        select: {
          locale: true,
          name: true,
          description: true,
          hoursNote: true,
        },
      },
      collection: {
        select: {
          slug: true,
          translations: { select: { locale: true, name: true } },
        },
      },
      places: {
        orderBy: { sortOrder: "asc" },
        select: {
          place: {
            select: {
              nameEn: true,
              nameKo: true,
              addressEn: true,
              addressKo: true,
              latitude: true,
              longitude: true,
              googleMapsUrl: true,
              naverMapsUrl: true,
              kakaoMapsUrl: true,
              amapUrl: true,
            },
          },
        },
      },
      bodyBlocks: {
        orderBy: { sortOrder: "asc" },
        select: {
          type: true,
          imageUrl: true,
          sortOrder: true,
          translations: { select: { locale: true, text: true } },
        },
      },
      perks: {
        orderBy: { sortOrder: "asc" },
        select: {
          imageUrl: true,
          perkUrl: true,
          sortOrder: true,
          translations: { select: { locale: true, badge: true, title: true, detail: true } },
        },
      },
    },
  });
}

// ── generateMetadata ──────────────────────────────────────────────────────────

type Props = { params: Promise<{ collectionSlug: string; eventSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collectionSlug, eventSlug } = await params;
  const event = await prisma.event.findFirst({
    where: {
      slug: eventSlug,
      collection: { slug: collectionSlug },
      status: "PUBLISHED",
    },
    select: {
      bannerImageUrl: true,
      translations: {
        where: { locale: { in: ["en", "ko"] } },
        select: { locale: true, name: true, description: true },
      },
    },
  });

  if (!event) return {};

  const t = pickTranslation(event.translations, "en", "ko");
  const name = t?.name ?? "";
  const description = t?.description?.slice(0, 160) ??
    `Experience ${name} — an exclusive K-culture event. Discover more on reCree.`;
  const imageUrl = event.bannerImageUrl ?? "https://recree.io/og-default.png";
  const pageUrl = `https://recree.io/events/${collectionSlug}/${eventSlug}`;

  const fullTitle = `${name} | reCree`;

  return {
    title: name,
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

// ── 페이지 ──────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({ params }: Props) {
  const { collectionSlug, eventSlug } = await params;
  const event = await getEventDetail(collectionSlug, eventSlug);
  if (!event) notFound();

  const t = pickTranslation(event.translations, "en", "ko");
  const collectionT = pickTranslation(event.collection.translations, "en", "ko");

  const eventName = t?.name ?? "";
  const description = t?.description ?? "";
  const hoursNote = t?.hoursNote ?? "Open daily";
  const collectionName = collectionT?.name ?? event.collection.slug;
  const places = event.places.map((ep) => ep.place);
  const placeCount = places.length;
  const firstPlaceName = placeCount > 0 ? (places[0].nameEn ?? places[0].nameKo) : null;
  const dateRange = formatDateRangeUTC(event.startDate, event.endDate);
  const year = String(event.startDate.getUTCFullYear());
  const timeRange = formatTimeRange(event.openTime, event.closeTime);
  const entryInfo = ENTRY_TYPE_INFO[event.entryType];
  const categoryLabel = CATEGORY_LABELS[event.category];
  const hasLinks = !!(event.officialUrl || event.snsUrl);
  const hasAbout = !!(description || event.bodyBlocks.length > 0);

  return (
    <div style={{ background: "#F4F5F7", minHeight: "100dvh" }}>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative w-full" style={{ height: 318 }}>
        {event.bannerImageUrl ? (
          <Image
            src={event.bannerImageUrl}
            alt={eventName}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #2A2D33 0%, #1A1C20 100%)" }}
          />
        )}

        {/* 그라데이션 오버레이 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,6,9,.42) 0%, transparent 22%, transparent 52%, rgba(10,6,9,.34) 100%)",
          }}
        />

        {/* 상단 바 — 뒤로가기 */}
        <div className="absolute top-0 left-0 right-0 flex items-center px-4 pt-4">
          <EventBackButton />
        </div>

        {/* 이벤트 뱃지 */}
        <div className="absolute flex gap-2" style={{ top: 64, left: 16 }}>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-white font-extrabold"
            style={{ background: ACCENT, fontSize: 12.5, letterSpacing: "0.12em" }}
          >
            EVENT
          </span>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-white font-bold"
            style={{
              background: "rgba(12,8,10,.42)",
              backdropFilter: "blur(8px)",
              fontSize: 11,
              letterSpacing: "0.04em",
            }}
          >
            {collectionName.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── Sheet ────────────────────────────────────────────────────────────── */}
      <div
        className="relative px-4 pb-28"
        style={{
          marginTop: -22,
          borderRadius: "22px 22px 0 0",
          background: "#F4F5F7",
          paddingTop: 8,
        }}
      >
        {/* ── 타이틀 블록 ──────────────────────────────────────────────────────── */}
        <div
          className="mb-[13px] p-[17px]"
          style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 2px 14px rgba(20,18,28,.05)",
            border: "1px solid #EEEFF2",
          }}
        >
          {/* 필 행 */}
          <div className="flex flex-wrap gap-[7px] mb-3">
            <span
              className="inline-flex items-center px-2.5 py-[5px] rounded-full text-white font-bold"
              style={{
                background: `linear-gradient(120deg, ${ACCENT}, #FF3B5C)`,
                fontSize: 12,
                letterSpacing: "0.04em",
              }}
            >
              {collectionName}
            </span>
            <span
              className="inline-flex items-center px-2.5 py-[5px] rounded-full font-bold"
              style={{
                color: "#5A4A12",
                background: "linear-gradient(120deg, #FFE14D, #FFC83D)",
                fontSize: 12,
              }}
            >
              {categoryLabel}
            </span>
            {placeCount > 0 && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-[5px] rounded-full font-semibold"
                style={{
                  color: "#3A3D44",
                  background: "#F2F0F2",
                  border: "1px solid #ECEAEE",
                  fontSize: 12,
                }}
              >
                <MapPin size={11} color={ACCENT} />
                {placeCount === 1 ? firstPlaceName : `${placeCount} locations`}
              </span>
            )}
          </div>

          {/* 이벤트명 */}
          <h1
            className="font-extrabold text-[#16181C]"
            style={{ fontSize: 23, lineHeight: 1.18, letterSpacing: "-0.02em" }}
          >
            {eventName}
          </h1>

          {/* 날짜 칩 */}
          <div className="mt-3">
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-extrabold"
              style={{
                background: `linear-gradient(100deg, ${ACCENT}, #FF3B5C)`,
                fontSize: 13.5,
                letterSpacing: "0.01em",
                boxShadow: "0 6px 16px rgba(240,25,65,.38)",
              }}
            >
              {dateRange}
            </span>
          </div>
        </div>

        {/* ── 티켓 블록 ────────────────────────────────────────────────────────── */}
        <div
          className="mb-[13px] overflow-hidden"
          style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 10px 30px rgba(240,25,65,.14)",
            border: "1px solid rgba(240,25,65,.16)",
          }}
        >
          {/* 티켓 헤더 */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: `linear-gradient(100deg, ${ACCENT}, #FF3B5C)` }}
          >
            <span
              className="text-white font-extrabold"
              style={{ fontSize: 12.5, letterSpacing: "0.1em" }}
            >
              {event.entryType === "WALK_IN" ? "ADMIT ONE · FREE" : "ADMIT ONE"}
            </span>
            <span
              className="text-white font-bold"
              style={{ fontSize: 11, letterSpacing: "0.08em" }}
            >
              {collectionName.toUpperCase()}
            </span>
          </div>

          {/* 날짜·시간 */}
          <div className="flex items-stretch px-4 py-4">
            <div className="flex-1">
              <div
                className="font-extrabold mb-1"
                style={{ fontSize: 10.5, letterSpacing: "0.12em", color: "#9AA0A8" }}
              >
                DATES
              </div>
              <div
                className="font-extrabold text-[#16181C]"
                style={{ fontSize: 25, lineHeight: 1.1 }}
              >
                {dateRange}
              </div>
              <div className="font-medium mt-0.5" style={{ fontSize: 12, color: "#8A8F98" }}>
                {year}
              </div>
            </div>

            {timeRange && (
              <>
                <div
                  className="mx-4 self-stretch w-px"
                  style={{
                    background:
                      "repeating-linear-gradient(to bottom, #E6E4E8 0 5px, transparent 5px 10px)",
                  }}
                />
                <div className="flex-1">
                  <div
                    className="font-extrabold mb-1"
                    style={{ fontSize: 10.5, letterSpacing: "0.12em", color: "#9AA0A8" }}
                  >
                    HOURS
                  </div>
                  <div
                    className="font-extrabold text-[#16181C]"
                    style={{ fontSize: 19, lineHeight: 1.2 }}
                  >
                    {timeRange}
                  </div>
                  <div className="font-medium mt-0.5" style={{ fontSize: 12, color: "#8A8F98" }}>
                    {hoursNote}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 천공선 */}
          <div
            className="mx-4"
            style={{ borderTop: "2px dashed rgba(240,25,65,.28)" }}
          />

          {/* 참여방법 */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-[11px]"
                style={{ width: 38, height: 38, background: "rgba(240,25,65,.11)" }}
              >
                {event.entryType === "TICKET" ? (
                  <Ticket size={18} color={ACCENT} />
                ) : event.entryType === "RESERVATION" ? (
                  <Calendar size={18} color={ACCENT} />
                ) : (
                  <MapPin size={18} color={ACCENT} />
                )}
              </div>
              <div>
                <div className="font-bold text-[#16181C]" style={{ fontSize: 14 }}>
                  {entryInfo.label}
                </div>
                <div className="font-medium" style={{ fontSize: 12, color: "#9AA0A8" }}>
                  {entryInfo.note}
                </div>
              </div>
            </div>

            {event.entryType === "WALK_IN" && (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-extrabold"
                style={{ background: "#C8FF09", color: "#16210A", fontSize: 12.5 }}
              >
                ✓ No booking
              </span>
            )}
          </div>
        </div>

        {/* ── 장소 블록 ────────────────────────────────────────────────────────── */}
        {placeCount > 0 && places.map((p, idx) => (
          <div
            key={p.nameEn ?? p.nameKo ?? String(idx)}
            className="mb-[13px] overflow-hidden"
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 2px 14px rgba(20,18,28,.05)",
              border: "1px solid #EEEFF2",
            }}
          >
            {p.latitude && p.longitude && (
              <MapPreview
                lat={p.latitude}
                lng={p.longitude}
                zoom={15}
                height={180}
                className="rounded-none border-0 border-b border-[#EEEFF2]"
              />
            )}
            <div className="px-[17px] py-4">
              <h2
                className="font-extrabold text-[#16181C] mb-2"
                style={{ fontSize: 16.5, letterSpacing: "-0.01em" }}
              >
                Location
              </h2>
              {(p.nameEn || p.nameKo) && (
                <div
                  className="font-semibold text-[#16181C] mb-0.5"
                  style={{ fontSize: 14 }}
                >
                  {p.nameEn ?? p.nameKo}
                </div>
              )}
              {(p.addressEn || p.addressKo) && (
                <div
                  className="font-medium"
                  style={{ fontSize: 13, color: "#8A8F98", lineHeight: 1.5 }}
                >
                  {p.addressEn ?? p.addressKo}
                </div>
              )}
              {(p.googleMapsUrl || p.naverMapsUrl) && (
                <div className="flex gap-2 mt-3">
                  {p.googleMapsUrl && (
                    <a
                      href={p.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] font-bold"
                      style={{
                        background: "rgba(240,25,65,.08)",
                        border: "1px solid rgba(240,25,65,.2)",
                        color: ACCENT,
                        fontSize: 12.5,
                      }}
                    >
                      <MapPin size={13} />
                      Google Maps
                    </a>
                  )}
                  {p.naverMapsUrl && (
                    <a
                      href={p.naverMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] font-bold"
                      style={{
                        background: "#F0FAE8",
                        border: "1px solid #C8FF09",
                        color: "#2A4A00",
                        fontSize: 12.5,
                      }}
                    >
                      <MapPin size={13} />
                      Naver Map
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* ── 혜택 블록 — "What you'll get here" ──────────────────────────────── */}
        {event.perks.length > 0 && (
          <div
            className="mb-[13px] p-[17px]"
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 2px 14px rgba(20,18,28,.05)",
              border: "1px solid #EEEFF2",
            }}
          >
            <h2
              className="font-extrabold text-[#16181C] mb-3"
              style={{ fontSize: 16.5, letterSpacing: "-0.01em" }}
            >
              What you&apos;ll get here
            </h2>
            <div className="space-y-3">
              {event.perks.map((perk, i) => {
                const perkT = pickTranslation(perk.translations, "en", "ko");
                const card = (
                  <div
                    className="flex rounded-[14px] overflow-hidden"
                    style={{ background: "#F7F6F8", border: "1px solid #ECEAEE" }}
                  >
                    {perk.imageUrl && (
                      <div className="relative flex-shrink-0" style={{ width: 96, height: 96 }}>
                        <Image
                          src={perk.imageUrl}
                          alt={perkT?.title ?? ""}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex flex-col justify-center px-3 py-3 min-w-0">
                      {perkT?.badge && (
                        <span
                          className="inline-flex self-start items-center px-2 py-[3px] rounded-full text-white font-bold mb-1.5"
                          style={{ background: ACCENT, fontSize: 10.5, letterSpacing: "0.04em" }}
                        >
                          {perkT.badge}
                        </span>
                      )}
                      <div
                        className="font-bold text-[#16181C] leading-snug"
                        style={{ fontSize: 14 }}
                      >
                        {perkT?.title}
                      </div>
                      {perkT?.detail && (
                        <div
                          className="font-medium mt-1 leading-snug"
                          style={{ fontSize: 12, color: "#8A8F98" }}
                        >
                          {perkT.detail}
                        </div>
                      )}
                    </div>
                  </div>
                );
                return perk.perkUrl ? (
                  <a
                    key={i}
                    href={perk.perkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    {card}
                  </a>
                ) : (
                  <div key={i}>{card}</div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── About 블록 ───────────────────────────────────────────────────────── */}
        {hasAbout && (
          <div
            className="mb-[13px] p-[17px]"
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 2px 14px rgba(20,18,28,.05)",
              border: "1px solid #EEEFF2",
            }}
          >
            <h2
              className="font-extrabold text-[#16181C] mb-3"
              style={{ fontSize: 16.5, letterSpacing: "-0.01em" }}
            >
              About this spot
            </h2>
            {description && (
              <p
                className="text-[#3E424A] mb-4"
                style={{ fontSize: 14, lineHeight: 1.64, fontWeight: 400 }}
              >
                {description}
              </p>
            )}
            {event.bodyBlocks.length > 0 && (
              <div className="space-y-4">
                {event.bodyBlocks.map((block, i) => {
                  if (block.type === "TEXT") {
                    const blockT = pickTranslation(block.translations, "en", "ko");
                    if (!blockT?.text) return null;
                    return (
                      <p
                        key={i}
                        className="text-[#3E424A]"
                        style={{ fontSize: 14, lineHeight: 1.64, fontWeight: 400 }}
                      >
                        {blockT.text}
                      </p>
                    );
                  }
                  if (block.type === "IMAGE" && block.imageUrl) {
                    return (
                      <div
                        key={i}
                        className="relative w-full overflow-hidden rounded-[14px]"
                        style={{ aspectRatio: "16 / 9" }}
                      >
                        <Image
                          src={block.imageUrl}
                          alt=""
                          fill
                          sizes="calc(100vw - 34px)"
                          className="object-cover"
                        />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 링크 블록 ────────────────────────────────────────────────────────── */}
        {hasLinks && (
          <div
            className="mb-[13px] p-[17px]"
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 2px 14px rgba(20,18,28,.05)",
              border: "1px solid #EEEFF2",
            }}
          >
            <h2
              className="font-extrabold text-[#16181C] mb-3"
              style={{ fontSize: 16.5, letterSpacing: "-0.01em" }}
            >
              Links
            </h2>
            <div className="space-y-2">
              {event.officialUrl && (
                <a
                  href={event.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-[12px] px-4 py-3"
                  style={{
                    background: "rgba(240,25,65,.07)",
                    border: "1px solid rgba(240,25,65,.22)",
                  }}
                >
                  <div>
                    <div className="font-extrabold text-[#16181C]" style={{ fontSize: 14 }}>
                      Official event site
                    </div>
                    <div className="font-semibold" style={{ fontSize: 12, color: "#9AA0A8" }}>
                      {safeHostname(event.officialUrl)}
                    </div>
                  </div>
                  <span className="font-bold" style={{ color: ACCENT, fontSize: 16 }}>
                    ↗
                  </span>
                </a>
              )}
              {event.snsUrl && (
                <a
                  href={event.snsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-[12px] px-4 py-3"
                  style={{ background: "#F7F6F8", border: "1px solid #ECEAEE" }}
                >
                  <div>
                    <div className="font-extrabold text-[#16181C]" style={{ fontSize: 14 }}>
                      Follow on Instagram
                    </div>
                    <div className="font-semibold" style={{ fontSize: 12, color: "#9AA0A8" }}>
                      {safeHostname(event.snsUrl)}
                    </div>
                  </div>
                  <span className="font-bold" style={{ color: "#9AA0A8", fontSize: 16 }}>
                    ↗
                  </span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
