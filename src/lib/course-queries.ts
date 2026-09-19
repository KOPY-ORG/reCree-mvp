// 코스 목록 + 상세 Prisma 쿼리 — 서버 전용
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// CourseItem.place select — 목록/상세 어느 쪽이 늘어도 한 곳만 고치면 되도록 상수로 뽑는다
const coursePlaceSelect = {
  select: {
    id: true,
    nameEn: true,
    nameKo: true,
    latitude: true,
    longitude: true,
    addressEn: true,
    addressKo: true,
    imageUrl: true,
  },
} satisfies Prisma.CourseItem$placeArgs;

// 코스 라벨은 L2 Topic만 쓰므로 parent를 거슬러 올라가지 않는다 (포스트 라벨과 다른 지점)
const courseTopicsSelect = {
  select: {
    topic: {
      select: {
        id: true,
        slug: true,
        nameEn: true,
        nameKo: true,
        colorHex: true,
        colorHex2: true,
        gradientDir: true,
        gradientStop: true,
        textColorHex: true,
      },
    },
  },
} satisfies Prisma.Course$topicsArgs;

// 목록 payload — Day/아이템 본문은 안 가져오고 개수만 집계한다
const courseListSelect = {
  id: true,
  title: true,
  description: true,
  authorId: true,
  author: { select: { nickname: true } },
  isPublic: true,
  copyCount: true,
  coverImageUrl: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { days: true } },
  days: { select: { _count: { select: { items: true } } } },
  topics: courseTopicsSelect,
} satisfies Prisma.CourseSelect;

// ─── 반환 타입 ────────────────────────────────────────────────────────────────
// 클라이언트 컴포넌트로 넘어가므로 Date는 전부 문자열로 변환해 내보낸다.

type CourseTopicLabel = {
  id: string;
  slug: string;
  nameEn: string;
  nameKo: string;
  colorHex: string | null;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string | null;
};

type CourseItemPlace = {
  id: string;
  nameEn: string | null;
  nameKo: string;
  latitude: number | null;
  longitude: number | null;
  addressEn: string | null;
  addressKo: string | null;
  imageUrl: string | null;
};

export type CourseListItem = {
  id: string;
  title: string;
  description: string | null;
  authorId: string;
  /** 작성자 표시명. User.nickname이 nullable이라 여기도 null 가능 — 표기 폴백은 화면에서 정한다 */
  authorName: string | null;
  isPublic: boolean;
  copyCount: number;
  coverImageUrl: string | null;
  dayCount: number;
  /** 전체 Day에 걸친 CourseItem 합계 */
  itemCount: number;
  topics: CourseTopicLabel[];
  createdAt: string;
  updatedAt: string;
};

export type CourseDetail = {
  id: string;
  title: string;
  description: string | null;
  authorId: string;
  /** 작성자 표시명. User.nickname이 nullable이라 여기도 null 가능 */
  authorName: string | null;
  isPublic: boolean;
  copyCount: number;
  copiedFromId: string | null;
  coverImageUrl: string | null;
  topics: CourseTopicLabel[];
  days: {
    id: string;
    dayNumber: number;
    title: string | null;
    items: {
      id: string;
      sortOrder: number;
      placeId: string | null;
      nameEn: string;
      nameKo: string | null;
      address: string | null;
      latitude: number | null;
      longitude: number | null;
      imageUrl: string | null;
      note: string | null;
      place: CourseItemPlace | null;
    }[];
  }[];
  createdAt: string;
  updatedAt: string;
};

// ─── 내부 매핑 ────────────────────────────────────────────────────────────────

type RawCourseListRow = Prisma.CourseGetPayload<{ select: typeof courseListSelect }>;

function toListItem(row: RawCourseListRow): CourseListItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    authorId: row.authorId,
    authorName: row.author.nickname,
    isPublic: row.isPublic,
    copyCount: row.copyCount,
    coverImageUrl: row.coverImageUrl,
    dayCount: row._count.days,
    itemCount: row.days.reduce((sum, day) => sum + day._count.items, 0),
    topics: row.topics.map((ct) => ct.topic),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const DEFAULT_TAKE = 50;

// ─── 공개 함수 ────────────────────────────────────────────────────────────────

/** 공개 코스 목록 */
export async function getPublicCourses(options?: {
  take?: number;
  // cursor는 시그니처만 받아둔다. 무한 스크롤을 붙일 때
  // cursor: { id }, skip: 1 + orderBy id tiebreaker로 연결한다 (post-queries 패턴).
  cursor?: string;
}): Promise<CourseListItem[]> {
  const rows = await prisma.course.findMany({
    where: { isPublic: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: options?.take ?? DEFAULT_TAKE,
    select: courseListSelect,
  });
  return rows.map(toListItem);
}

/** 내가 만든 코스 목록. 공개 여부와 무관하게 전부 */
export async function getMyCourses(userId: string): Promise<CourseListItem[]> {
  const rows = await prisma.course.findMany({
    where: { authorId: userId },
    orderBy: [{ updatedAt: "desc" }],
    select: courseListSelect,
  });
  return rows.map(toListItem);
}

/**
 * 코스 상세 — Day → 아이템 전량.
 *
 * isPublic을 거르지 않는다. 비공개 코스 접근 제어는 페이지 레이어에서
 * course.authorId와 현재 유저를 비교해 판정한다.
 */
export async function getCourseDetail(id: string): Promise<CourseDetail | null> {
  const course = await prisma.course.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      authorId: true,
      author: { select: { nickname: true } },
      isPublic: true,
      copyCount: true,
      copiedFromId: true,
      coverImageUrl: true,
      createdAt: true,
      updatedAt: true,
      topics: courseTopicsSelect,
      days: {
        orderBy: { dayNumber: "asc" },
        select: {
          id: true,
          dayNumber: true,
          title: true,
          items: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              sortOrder: true,
              placeId: true,
              nameEn: true,
              nameKo: true,
              address: true,
              latitude: true,
              longitude: true,
              imageUrl: true,
              note: true,
              place: coursePlaceSelect,
            },
          },
        },
      },
    },
  });

  if (!course) return null;

  return {
    id: course.id,
    title: course.title,
    description: course.description,
    authorId: course.authorId,
    authorName: course.author.nickname,
    isPublic: course.isPublic,
    copyCount: course.copyCount,
    copiedFromId: course.copiedFromId,
    coverImageUrl: course.coverImageUrl,
    topics: course.topics.map((ct) => ct.topic),
    days: course.days.map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      title: day.title,
      items: day.items.map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder,
        placeId: item.placeId,
        nameEn: item.nameEn,
        nameKo: item.nameKo,
        address: item.address,
        latitude: item.latitude,
        longitude: item.longitude,
        imageUrl: item.imageUrl,
        note: item.note,
        place: item.place,
      })),
    })),
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };
}

/** 특정 유저가 저장한 코스 id 집합 */
export async function getSavedCourseIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await prisma.save.findMany({
    where: { userId, targetType: "COURSE" },
    select: { targetId: true },
  });
  return new Set(rows.map((r) => r.targetId));
}
