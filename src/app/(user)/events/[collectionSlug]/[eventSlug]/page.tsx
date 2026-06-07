import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, Globe, Instagram, MapPin, Ticket } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { EventBackButton } from "./_components/EventBackButton";
import { EventLocationMap } from "@/components/maps/EventLocationMap";
import { getEventDict } from "@/lib/i18n/event-dict";
import { EventLangSwitcher } from "./_components/EventLangSwitcher";
import { EventShareButton } from "./_components/EventShareButton";
import { InstagramEmbed } from "./_components/InstagramEmbed";
import { EventImage } from "@/components/events/EventImage";
import { PerkCard } from "@/components/events/PerkCard";
import { EventScrapButton } from "@/app/(user)/_components/EventScrapButton";
import { EVENT_RED as ACCENT, getDDay } from "@/lib/event-format";

// ── 헬퍼 ────────────────────────────────────────────────────────────────────────

function pickTranslation<T extends { locale: string }>(
  items: T[],
  locale = "en",
  fallback = "en",
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

function formatTimeRange(
  open: string | null,
  close: string | null,
  fromDate: (d: string) => string,
  untilDate: (d: string) => string,
): string | null {
  if (!open && !close) return null;
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  if (open && close) return `${fmt(open)} – ${fmt(close)}`;
  if (open) return fromDate(fmt(open));
  return untilDate(fmt(close!));
}

function splitHoursNote(note: string): string[] {
  const byNewline = note.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (byNewline.length > 1) return byNewline;
  return note.split(/\s+(?=\w[\w ]*period:)/i).map((l) => l.trim()).filter(Boolean);
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function safeUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  return /^https?:\/\//i.test(u.trim()) ? u.trim() : null;
}

function linkify(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all"
        style={{ color: "#0a66c2" }}
      >
        {part}
      </a>
    ) : (
      part
    ),
  );
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
              id: true,
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
          caption: true,
          embedUrl: true,
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

type Props = {
  params: Promise<{ collectionSlug: string; eventSlug: string }>;
  searchParams: Promise<{ lang?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { collectionSlug, eventSlug } = await params;
  const { lang } = await searchParams;
  const locale = lang ?? "en";

  const event = await prisma.event.findFirst({
    where: {
      slug: eventSlug,
      collection: { slug: collectionSlug },
      status: "PUBLISHED",
    },
    select: {
      bannerImageUrl: true,
      translations: {
        select: { locale: true, name: true, description: true },
      },
    },
  });

  if (!event) return {};

  const t = pickTranslation(event.translations, locale, "en");
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

export default async function EventDetailPage({ params, searchParams }: Props) {
  const { collectionSlug, eventSlug } = await params;
  const { lang } = await searchParams;
  const locale = lang ?? "en";
  const dict = getEventDict(locale);

  const event = await getEventDetail(collectionSlug, eventSlug);
  if (!event) notFound();

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const initialSaved = authUser
    ? !!(await prisma.save.findUnique({
        where: {
          userId_targetType_targetId: {
            userId: authUser.id,
            targetType: "EVENT",
            targetId: event.id,
          },
        },
        select: { id: true },
      }))
    : false;

  const t = pickTranslation(event.translations, locale, "en");
  const collectionT = pickTranslation(event.collection.translations, locale, "en");

  const eventName = t?.name ?? "";
  const description = t?.description ?? "";
  const hoursNote = t?.hoursNote ?? null;
  const collectionName = collectionT?.name ?? event.collection.slug;
  const places = event.places.map((ep) => ep.place);
  const placeCount = places.length;
  const dateRange = formatDateRangeUTC(event.startDate, event.endDate);
  const year = String(event.startDate.getUTCFullYear());
  const timeRange = formatTimeRange(event.openTime, event.closeTime, dict.fromDate, dict.untilDate);
  const entryInfo = dict.entryType[event.entryType];
  const categoryLabel = dict.category[event.category];
  const dday = getDDay(event.startDate, event.endDate);
  const reservationLink = safeUrl(event.reservationUrl);
  const hasLinks = !!(event.officialUrl || event.snsUrl);
  const hasAbout = event.bodyBlocks.length > 0;

  return (
    <div style={{ background: "#F4F5F7", minHeight: "100dvh" }}>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative w-full">
        <EventImage
          src={event.bannerImageUrl}
          alt={eventName}
          ratio="1/1"
          sizes="100vw"
          priority
          overlay
        />

        {/* 상단 바 — 뒤로가기 + 언어 전환 */}
        <div className="absolute top-0 left-0 right-0 flex items-center px-4 pt-4">
          <EventBackButton />
          <div className="ml-auto flex items-center gap-2">
            <EventLangSwitcher />
            <EventShareButton title={eventName} />
          </div>
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
          className="-mx-4 -mt-2 mb-[13px] p-[17px]"
          style={{
            background: "#fff",
            borderRadius: "26px 26px 0 0",
          }}
        >
          {/* 칩 행: 시리즈 → 카테고리 → D-day + 저장 버튼 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-wrap gap-[7px]">
              <span
                className="inline-flex items-center rounded-full text-white"
                style={{
                  background: ACCENT,
                  height: 27,
                  paddingInline: 11,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {collectionName}
              </span>
              <span
                className="inline-flex items-center rounded-full text-white"
                style={{
                  background: "#16171A",
                  height: 27,
                  paddingInline: 11,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {categoryLabel}
              </span>
              {dday && (
                <span
                  className="inline-flex items-center rounded-full"
                  style={{
                    background: "#C8FF09",
                    color: "#16171A",
                    height: 27,
                    paddingInline: 11,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {dday}
                </span>
              )}
            </div>
            <EventScrapButton eventId={event.id} initialSaved={initialSaved} />
          </div>

          {/* 이벤트명 */}
          <h1
            className="text-[#16181C]"
            style={{ fontSize: 25, lineHeight: 1.16, fontWeight: 700, letterSpacing: "-0.02em" }}
          >
            {eventName}
          </h1>

          {/* 서브타이틀 — description */}
          {description && (
            <p
              className="mt-2"
              style={{ fontSize: 14.5, lineHeight: 1.5, color: "#4A4D54", fontWeight: 400 }}
            >
              {description}
            </p>
          )}
        </div>

        {/* ── 티켓 블록 ────────────────────────────────────────────────────────── */}
        <div
          className="mb-[13px] overflow-hidden"
          style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 10px 30px rgba(233,40,61,.14)",
            border: "1px solid rgba(233,40,61,.16)",
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
              {/* intentionally English-fixed label (not i18n) */}
              INFORMATION
            </span>
          </div>

          {/* 날짜·시간 */}
          <div className={`flex items-stretch px-4 pt-4 ${hoursNote ? "pb-2" : "pb-4"}`}>
            <div className="flex-1">
              <div
                className="font-extrabold mb-1"
                style={{ fontSize: 10.5, letterSpacing: "0.12em", color: "#9AA0A8" }}
              >
                {dict.dates}
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
                    {dict.hours}
                  </div>
                  <div
                    className="font-extrabold text-[#16181C]"
                    style={{ fontSize: 19, lineHeight: 1.2 }}
                  >
                    {timeRange}
                  </div>
                </div>
              </>
            )}
          </div>

          {hoursNote && (
            <div className="px-4 pb-4">
              {splitHoursNote(hoursNote).map((line, i) => (
                <div key={i} className="font-medium" style={{ fontSize: 12, color: "#8A8F98" }}>
                  {line}
                </div>
              ))}
            </div>
          )}

          {/* 천공선 */}
          <div
            className="mx-4"
            style={{ borderTop: "2px dashed rgba(233,40,61,.28)" }}
          />

          {/* 참여방법 */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-[11px]"
                style={{ width: 38, height: 38, background: "rgba(233,40,61,.11)" }}
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

            <div className="flex items-center gap-2">
              {event.entryType === "WALK_IN" && (
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-extrabold"
                  style={{ background: "#C8FF09", color: "#16210A", fontSize: 12.5 }}
                >
                  ✓ No booking
                </span>
              )}
              {reservationLink && (
                <a
                  href={reservationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-extrabold text-white"
                  style={{ background: ACCENT, fontSize: 12.5 }}
                >
                  {/* TODO: i18n */}
                  Book now
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── 장소 블록 ────────────────────────────────────────────────────────── */}
        {placeCount > 0 && (
          <div
            className="mb-[13px]"
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 2px 14px rgba(20,18,28,.05)",
              border: "1px solid #EEEFF2",
            }}
          >
            {/* ① 헤딩 */}
            <div className="flex items-center justify-between px-[17px] pt-[17px] pb-3">
              <div className="flex items-center gap-2">
                <MapPin size={16} strokeWidth={2.5} style={{ color: "#E9283D", flexShrink: 0 }} />
                <h2
                  className="font-extrabold text-[#16181C]"
                  style={{ fontSize: 16.5, letterSpacing: "-0.01em" }}
                >
                  {placeCount === 1 ? dict.location : "Locations"}
                </h2>
              </div>
              {placeCount >= 2 && (
                <span
                  className="text-xs font-semibold rounded-full px-2.5 py-1 shrink-0 ml-2"
                  style={{ background: "#F4F5F7", color: "#8A8F98" }}
                >
                  {dict.locationsLabel(placeCount)}
                </span>
              )}
            </div>
            {/* ② 지도 (패딩 안 둥근 모서리) */}
            <div className="px-[17px] pb-3">
              <div style={{ borderRadius: 14, overflow: "hidden" }}>
                <EventLocationMap places={places} height={200} />
              </div>
            </div>
            {/* ③ 번호 리스트 */}
            {places.map((p, idx) => {
              const gmap = safeUrl(p.googleMapsUrl);
              const nmap = safeUrl(p.naverMapsUrl);
              const amap = safeUrl(p.amapUrl);
              const hasLinks = !!(gmap || nmap || amap);
              return (
                <div
                  key={p.id ?? String(idx)}
                  className="px-[17px] py-3"
                  style={{ borderTop: "1px solid #EEEFF2" }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="shrink-0 w-[22px] h-[22px] rounded-full flex items-center justify-center text-white font-bold"
                      style={{ background: "#E9283D", fontSize: 11 }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
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
                      {hasLinks && (
                        <div className="flex gap-2 mt-2">
                          {gmap && (
                            <a
                              href={gmap}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] font-bold"
                              style={{
                                background: "rgba(233,40,61,.08)",
                                border: "1px solid rgba(233,40,61,.2)",
                                color: ACCENT,
                                fontSize: 12.5,
                              }}
                            >
                              <MapPin size={13} />
                              Google
                            </a>
                          )}
                          {nmap && (
                            <a
                              href={nmap}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] font-bold"
                              style={{
                                background: "#F0FAE8",
                                border: "1px solid #C8FF09",
                                color: "#2A4A00",
                                fontSize: 12.5,
                              }}
                            >
                              <MapPin size={13} />
                              Naver
                            </a>
                          )}
                          {amap && (
                            <a
                              href={amap}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] font-bold"
                              style={{
                                background: "#FFF3E0",
                                border: "1px solid #FFB74D",
                                color: "#E65100",
                                fontSize: 12.5,
                              }}
                            >
                              <MapPin size={13} />
                              Amap
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
              {dict.whatYouGet}
            </h2>
            <div className="space-y-3">
              {event.perks.map((perk, i) => {
                const perkT = pickTranslation(perk.translations, locale, "en");
                return (
                  <PerkCard
                    key={i}
                    imageUrl={perk.imageUrl}
                    perkUrl={perk.perkUrl}
                    badge={perkT?.badge ?? null}
                    title={perkT?.title ?? null}
                    detail={perkT?.detail ?? null}
                  />
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
              {dict.aboutSpot}
            </h2>
            {event.bodyBlocks.length > 0 && (
              <div className="space-y-4">
                {event.bodyBlocks.map((block, i) => {
                  if (block.type === "TEXT") {
                    const blockT = pickTranslation(block.translations, locale, "en");
                    if (!blockT?.text) return null;
                    return (
                      <p
                        key={i}
                        className="text-[#3E424A]"
                        style={{ fontSize: 14, lineHeight: 1.64, fontWeight: 400 }}
                      >
                        {linkify(blockT.text)}
                      </p>
                    );
                  }
                  if (block.type === "IMAGE" && block.imageUrl) {
                    return (
                      <div key={i}>
                        <EventImage
                          src={block.imageUrl}
                          alt=""
                          ratio="1/1"
                          sizes="calc(100vw - 34px)"
                          className="rounded-[14px]"
                        />
                        {block.caption && (
                          <p
                            className="text-center"
                            style={{ fontSize: 11.5, color: "#8A8E97", marginTop: 8 }}
                          >
                            {block.caption}
                          </p>
                        )}
                      </div>
                    );
                  }
                  if (block.type === "INSTAGRAM" && block.embedUrl) {
                    return <InstagramEmbed key={i} url={block.embedUrl} />;
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
              {dict.links}
            </h2>
            <div className="space-y-2">
              {event.officialUrl && safeUrl(event.officialUrl) && (
                <a
                  href={safeUrl(event.officialUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-[12px] px-4 py-3"
                  style={{
                    background: "rgba(233,40,61,.07)",
                    border: "1px solid rgba(233,40,61,.22)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Globe size={18} color={ACCENT} />
                    <div>
                      <div className="font-extrabold text-[#16181C]" style={{ fontSize: 14 }}>
                        {dict.officialSite}
                      </div>
                      <div className="font-semibold" style={{ fontSize: 12, color: "#9AA0A8" }}>
                        {safeHostname(event.officialUrl)}
                      </div>
                    </div>
                  </div>
                  <span className="font-bold" style={{ color: ACCENT, fontSize: 16 }}>
                    ↗
                  </span>
                </a>
              )}
              {event.snsUrl && safeUrl(event.snsUrl) && (
                <a
                  href={safeUrl(event.snsUrl)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-[12px] px-4 py-3"
                  style={{ background: "#F7F6F8", border: "1px solid #ECEAEE" }}
                >
                  <div className="flex items-center gap-3">
                    <Instagram size={18} color="#E1306C" />
                    <div>
                      <div className="font-extrabold text-[#16181C]" style={{ fontSize: 14 }}>
                        {dict.followOnInstagram}
                      </div>
                      <div className="font-semibold" style={{ fontSize: 12, color: "#9AA0A8" }}>
                        {safeHostname(event.snsUrl)}
                      </div>
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
