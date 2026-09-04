import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getCourseDetail } from "@/lib/course-queries";
import { coverBackground, NEUTRAL_COVER, pinColors } from "../_components/course-cover";
import { CourseBackButton } from "../_components/CourseBackButton";
import { CourseMiniMap } from "../_components/CourseMiniMap";
import { CopyCourseButton } from "../_components/CopyCourseButton";
import {
  CHIP_BG,
  CHIP_FG,
  INK,
  LINE,
  MAP_BG,
  MUTED,
  PAPER,
  SPOT_CHIP,
  SUB,
  TOURISM_CHIP,
} from "../_constants";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}

export default async function CourseDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { day } = await searchParams;

  const [currentUser, course] = await Promise.all([getCurrentUser(), getCourseDetail(id)]);
  if (!course) notFound();

  // 권한 판정은 이 화면이 한다 — getCourseDetail은 isPublic을 거르지 않는다.
  // forbidden이 아니라 notFound인 이유: 비공개 코스의 존재 자체를 노출하지 않는다.
  const isMine = course.authorId === currentUser?.id;
  if (!course.isPublic && !isMine) notFound();

  const dayCount = course.days.length;
  const itemCount = course.days.reduce((sum, d) => sum + d.items.length, 0);
  const dayLabel = `${dayCount} ${dayCount === 1 ? "day" : "days"}`;

  // dayNumber를 그대로 URL 파라미터로 쓴다 — 탭 라벨과 링크가 어긋날 수 없다
  const requestedDay = Number(day);
  const activeDay = course.days.find((d) => d.dayNumber === requestedDay) ?? course.days[0] ?? null;
  const items = activeDay?.items ?? [];

  // 지역 라벨과 "지도에서 볼 수 있는가"는 CourseItem 스냅샷에 없다 — 필요한 만큼만 따로 읽는다.
  // /discover?place= 는 발행 포스트가 붙은 장소만 지도에 뜨므로(discover/page.tsx:123 → getAllMapPlaces),
  // 포스트가 없는 장소는 링크를 걸지 않는다.
  const placeIds = [...new Set(items.map((i) => i.placeId).filter((v): v is string => v !== null))];
  const placeRows =
    placeIds.length > 0
      ? await prisma.place.findMany({
          where: { id: { in: placeIds } },
          select: {
            id: true,
            area: {
              select: {
                nameEn: true,
                nameKo: true,
                parent: { select: { nameEn: true, nameKo: true } },
              },
            },
            postPlaces: { where: { post: { status: "PUBLISHED" } }, take: 1, select: { postId: true } },
          },
        })
      : [];

  const placeMeta = new Map(
    placeRows.map((p) => [
      p.id,
      {
        // PlaceListSheetCard.tsx:46 과 같은 조립 방식
        areaLabel: p.area
          ? (p.area.nameEn ?? p.area.nameKo) +
            (p.area.parent ? ", " + (p.area.parent.nameEn ?? p.area.parent.nameKo) : "")
          : null,
        onMap: p.postPlaces.length > 0,
      },
    ]),
  );

  const cover = coverBackground(course.topics);
  const pin = pinColors(course.topics);
  const hasCoords = items.some((i) => i.latitude != null && i.longitude != null);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1">
        {/* ── 배너 ─────────────────────────────────────────────────────── */}
        <div className="relative h-[222px]" style={{ background: cover }}>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,.34) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,.55))",
            }}
          />

          <CourseBackButton />

          {isMine && (
            <Link
              href={`/journeys/${course.id}/edit`}
              className="absolute right-3.5 top-3.5 z-10 flex h-9 items-center rounded-[18px] bg-white/[.92] px-3.5 text-xs font-semibold leading-none"
              style={{ color: INK }}
            >
              Edit
            </Link>
          )}

          <div className="absolute inset-x-[18px] bottom-[18px]">
            <div className="flex gap-1.5">
              {isMine && !course.isPublic && (
                <span
                  className="rounded-md px-2 py-[5px] text-[9.5px] font-semibold leading-none"
                  style={{ background: "#C8FF09", color: INK }}
                >
                  Private
                </span>
              )}
              <span
                className="rounded-md px-2 py-[5px] text-[9.5px] font-semibold leading-none text-white"
                style={{ background: "rgba(255,255,255,.22)" }}
              >
                {dayLabel}
              </span>
            </div>

            <h1 className="mt-2.5 text-[25px] font-bold leading-[1.18] tracking-[-0.03em] text-white">
              {course.title}
            </h1>
            <p className="mt-2 text-[11.5px] font-semibold leading-none text-white/80">
              by {course.authorName ?? "Anonymous"}
            </p>
          </div>
        </div>

        {/* ── 스탯 ─────────────────────────────────────────────────────── */}
        <div className="flex gap-2 px-[18px] pt-4">
          <div className="flex-1 rounded-[14px] px-3.5 py-[13px]" style={{ background: PAPER }}>
            <div className="text-[17px] font-bold leading-none" style={{ color: INK }}>
              {dayCount}
            </div>
            <div className="mt-1.5 text-[10.5px] font-semibold leading-none" style={{ color: SUB }}>
              {dayCount === 1 ? "day" : "days"}
            </div>
          </div>
          <div className="flex-1 rounded-[14px] px-3.5 py-[13px]" style={{ background: PAPER }}>
            <div className="text-[17px] font-bold leading-none" style={{ color: INK }}>
              {itemCount}
            </div>
            <div className="mt-1.5 text-[10.5px] font-semibold leading-none" style={{ color: SUB }}>
              {itemCount === 1 ? "place" : "places"}
            </div>
          </div>
        </div>

        {/* ── Day 탭 ───────────────────────────────────────────────────── */}
        {dayCount > 1 && (
          <div className="flex gap-[7px] overflow-x-auto px-[18px] pt-[18px]">
            {course.days.map((d) => {
              const active = d.id === activeDay?.id;
              return (
                <Link
                  key={d.id}
                  href={`/journeys/${course.id}?day=${d.dayNumber}`}
                  scroll={false}
                  className="flex h-[34px] flex-none items-center rounded-[18px] px-3.5 text-xs font-semibold leading-none"
                  style={{
                    background: active ? INK : CHIP_BG,
                    color: active ? "#ffffff" : CHIP_FG,
                  }}
                >
                  Day {d.dayNumber}
                </Link>
              );
            })}
          </div>
        )}

        {/* ── 미니맵 ───────────────────────────────────────────────────── */}
        {items.length === 0 ? (
          <div
            className="mx-[18px] mt-4 flex h-[172px] items-center justify-center rounded-2xl text-xs font-medium"
            style={{ background: MAP_BG, color: MUTED }}
          >
            Nothing planned for this day
          </div>
        ) : (
          hasCoords && (
            <div
              className="mx-[18px] mt-4 h-[172px] overflow-hidden rounded-2xl"
              style={{ background: MAP_BG }}
            >
              <CourseMiniMap
                points={items.map((item, i) => ({
                  id: item.id,
                  latitude: item.latitude,
                  longitude: item.longitude,
                  index: i + 1,
                }))}
                pinColor={pin.fill}
                pinTextColor={pin.text}
                height="100%"
              />
            </div>
          )
        )}

        {/* ── Day 아이템 ───────────────────────────────────────────────── */}
        <div className="px-[18px] pt-[22px]">
          <h2 className="text-base font-bold leading-none" style={{ color: INK }}>
            {activeDay
              ? `Day ${activeDay.dayNumber}${activeDay.title ? ` · ${activeDay.title}` : ""}`
              : "Day 1"}
          </h2>

          {items.length === 0 ? (
            <div className="mt-3.5 rounded-[14px] px-[18px] py-[22px]" style={{ background: PAPER }}>
              <p className="text-[13px] font-medium leading-[1.3]" style={{ color: INK }}>
                This day is empty
              </p>
              <p className="mt-1.5 text-[11.5px] font-medium leading-[1.5]" style={{ color: MUTED }}>
                The author left it open — a rest day, or a gap to fill in once you make it yours.
              </p>
            </div>
          ) : (
            items.map((item, i) => {
              const meta = item.placeId ? placeMeta.get(item.placeId) : undefined;
              const chip = item.placeId ? SPOT_CHIP : TOURISM_CHIP;
              const region =
                meta?.areaLabel ??
                item.address ??
                item.place?.addressEn ??
                item.place?.addressKo ??
                null;
              const href = item.placeId && meta?.onMap ? `/discover?place=${item.placeId}` : null;

              const row = (
                <div
                  className="flex items-center gap-3 py-3"
                  style={{ borderBottom: `1px solid ${LINE}` }}
                >
                  <div
                    className="flex size-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold leading-none text-white"
                    style={{ background: INK }}
                  >
                    {i + 1}
                  </div>
                  <div
                    className="size-14 flex-none rounded-xl"
                    style={{ background: item.placeId ? cover : NEUTRAL_COVER }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[13px] font-medium leading-[1.3]"
                      style={{ color: INK }}
                    >
                      {item.nameEn}
                    </p>
                    {region && (
                      <p
                        className="mt-[5px] truncate text-[11px] font-medium leading-[1.2]"
                        style={{ color: SUB }}
                      >
                        {region}
                      </p>
                    )}
                  </div>
                  <span
                    className="flex-none rounded-[5px] px-1.5 py-[5px] text-[9px] font-medium leading-none"
                    style={{ background: chip.bg, color: chip.fg }}
                  >
                    {chip.label}
                  </span>
                </div>
              );

              return href ? (
                <Link key={item.id} href={href} className="block">
                  {row}
                </Link>
              ) : (
                <div key={item.id}>{row}</div>
              );
            })
          )}
        </div>
      </div>

      {/* ── 하단 CTA ─────────────────────────────────────────────────────
          내 코스는 배너 우상단 Edit 으로 간다 (시안과 동일).
          BottomNav(h-16) 위에 떠 있도록 bottom-16. */}
      {!isMine && (
        <div className="sticky bottom-16 z-30 mt-6">
          <CopyCourseButton
            courseId={course.id}
            isLoggedIn={!!currentUser}
            dayLabel={dayLabel}
          />
        </div>
      )}
    </div>
  );
}
