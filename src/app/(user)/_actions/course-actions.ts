"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// ─── 상수 ────────────────────────────────────────────────────────────────────

const MAX_DAYS = 7;
const MAX_ITEMS_PER_DAY = 20;

// ─── Zod 스키마 ──────────────────────────────────────────────────────────────

const courseIdSchema = z.string().uuid();
const dayIdSchema = z.string().uuid();
const itemIdSchema = z.string().uuid();

const titleSchema = z.string().trim().min(1).max(100);
const descriptionSchema = z.string().trim().max(500).optional();

const isPublicSchema = z.boolean();
const topicIdsSchema = z.array(z.string().uuid());

// ─── 소유자 검증 헬퍼 ────────────────────────────────────────────────────────
// 페이지 레벨 가드는 Server Action을 보호하지 못하므로 액션마다 소유자를 확인한다.
// userId는 인자로 받는다 — 호출하는 액션이 inline supabase.auth.getUser()로 먼저 인증한다.

type OwnerError = { error: "not_found" | "forbidden" };

async function assertCourseOwner(
  courseId: string,
  userId: string
): Promise<{ ok: true } | OwnerError> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { authorId: true },
  });
  if (!course) return { error: "not_found" };
  if (course.authorId !== userId) return { error: "forbidden" };
  return { ok: true };
}

async function assertDayOwner(
  dayId: string,
  userId: string
): Promise<{ ok: true; courseId: string } | OwnerError> {
  const day = await prisma.courseDay.findUnique({
    where: { id: dayId },
    select: {
      courseId: true,
      course: { select: { authorId: true } },
    },
  });
  if (!day) return { error: "not_found" };
  if (day.course.authorId !== userId) return { error: "forbidden" };
  return { ok: true, courseId: day.courseId };
}

async function assertItemOwner(
  itemId: string,
  userId: string
): Promise<{ ok: true; courseId: string; dayId: string } | OwnerError> {
  const item = await prisma.courseItem.findUnique({
    where: { id: itemId },
    select: {
      dayId: true,
      day: {
        select: {
          courseId: true,
          course: { select: { authorId: true } },
        },
      },
    },
  });
  if (!item) return { error: "not_found" };
  if (item.day.course.authorId !== userId) return { error: "forbidden" };
  return { ok: true, courseId: item.day.courseId, dayId: item.dayId };
}

// ─── 캐시 무효화 ─────────────────────────────────────────────────────────────

/**
 * 코스 변경 후 영향받는 캐시 경로 무효화.
 * - "/journeys" : 코스 목록
 * - "/profile" : 내 코스 섹션
 * - "/journeys/[id]" : 코스 상세 (courseId를 아는 경우만)
 */
function revalidateCoursePaths(courseId?: string) {
  revalidatePath("/journeys");
  revalidatePath("/profile");
  if (courseId) revalidatePath(`/journeys/${courseId}`);
}

// ─── createCourse ────────────────────────────────────────────────────────────

/** 새 코스 생성. 빈 코스로 시작하지 않도록 Day 1을 함께 만든다. */
export async function createCourse(input: {
  title: string;
  description?: string;
}): Promise<{ id?: string; error?: string }> {
  const parsedTitle = titleSchema.safeParse(input.title);
  if (!parsedTitle.success) return { error: "invalid_input" };

  const parsedDescription = descriptionSchema.safeParse(input.description);
  if (!parsedDescription.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    const course = await prisma.$transaction(async (tx) => {
      const created = await tx.course.create({
        data: {
          title: parsedTitle.data,
          description: parsedDescription.data || null,
          authorId: user.id,
          isPublic: false,
        },
        select: { id: true },
      });
      await tx.courseDay.create({
        data: { courseId: created.id, dayNumber: 1 },
      });
      return created;
    });

    revalidateCoursePaths(course.id);
    return { id: course.id };
  } catch (e) {
    console.error("[createCourse] server_error", e);
    return { error: "server_error" };
  }
}

// ─── updateCourse ────────────────────────────────────────────────────────────

/**
 * 코스 메타 수정. 전달된 필드만 바꾼다.
 * topicIds가 undefined면 Topic을 건드리지 않고, 배열이면 통째로 교체한다.
 */
export async function updateCourse(
  courseId: string,
  input: {
    title?: string;
    description?: string;
    isPublic?: boolean;
    topicIds?: string[];
  }
): Promise<{ error?: string }> {
  const parsedId = courseIdSchema.safeParse(courseId);
  if (!parsedId.success) return { error: "invalid_input" };

  let title: string | undefined;
  if (input.title !== undefined) {
    const parsed = titleSchema.safeParse(input.title);
    if (!parsed.success) return { error: "invalid_input" };
    title = parsed.data;
  }

  let description: string | null | undefined;
  if (input.description !== undefined) {
    const parsed = descriptionSchema.safeParse(input.description);
    if (!parsed.success) return { error: "invalid_input" };
    description = parsed.data || null;
  }

  let isPublic: boolean | undefined;
  if (input.isPublic !== undefined) {
    const parsed = isPublicSchema.safeParse(input.isPublic);
    if (!parsed.success) return { error: "invalid_input" };
    isPublic = parsed.data;
  }

  let topicIds: string[] | undefined;
  if (input.topicIds !== undefined) {
    const parsed = topicIdsSchema.safeParse(input.topicIds);
    if (!parsed.success) return { error: "invalid_input" };
    topicIds = [...new Set(parsed.data)];
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    const owner = await assertCourseOwner(parsedId.data, user.id);
    if ("error" in owner) return owner;

    // 코스 라벨은 L2 Topic만 쓴다. 존재·활성·레벨을 한 번에 확인한다.
    if (topicIds !== undefined && topicIds.length > 0) {
      const found = await prisma.topic.findMany({
        where: { id: { in: topicIds }, isActive: true, level: 2 },
        select: { id: true },
      });
      if (found.length !== topicIds.length) return { error: "invalid_input" };
    }

    await prisma.$transaction(async (tx) => {
      // topicIds만 바뀌어도 updatedAt을 올린다 — getMyCourses가 updatedAt으로 정렬한다.
      // 빈 data({})는 Prisma가 쿼리를 내보내지 않아 @updatedAt이 동작하지 않으므로 직접 넣는다.
      await tx.course.update({
        where: { id: parsedId.data },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(isPublic !== undefined ? { isPublic } : {}),
          updatedAt: new Date(),
        },
      });

      if (topicIds !== undefined) {
        await tx.courseTopic.deleteMany({ where: { courseId: parsedId.data } });
        if (topicIds.length > 0) {
          await tx.courseTopic.createMany({
            data: topicIds.map((topicId) => ({ courseId: parsedId.data, topicId })),
          });
        }
      }
    });

    revalidateCoursePaths(parsedId.data);
    return {};
  } catch (e) {
    console.error("[updateCourse] server_error", e);
    return { error: "server_error" };
  }
}

// ─── deleteCourse ────────────────────────────────────────────────────────────

/** 코스 삭제. Day/Item/Topic은 Cascade지만 Save는 FK가 없어 직접 지운다. */
export async function deleteCourse(courseId: string): Promise<{ error?: string }> {
  const parsedId = courseIdSchema.safeParse(courseId);
  if (!parsedId.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    const owner = await assertCourseOwner(parsedId.data, user.id);
    if ("error" in owner) return owner;

    await prisma.$transaction([
      prisma.save.deleteMany({
        where: { targetType: "COURSE", targetId: parsedId.data },
      }),
      prisma.course.delete({ where: { id: parsedId.data } }),
    ]);

    revalidateCoursePaths(parsedId.data);
    return {};
  } catch (e) {
    console.error("[deleteCourse] server_error", e);
    return { error: "server_error" };
  }
}

// ─── addCourseDay ────────────────────────────────────────────────────────────

/** Day 추가. dayNumber는 트랜잭션 안에서 max+1로 계산해 경쟁 상태를 완화한다. */
export async function addCourseDay(courseId: string): Promise<{ error?: string }> {
  const parsedId = courseIdSchema.safeParse(courseId);
  if (!parsedId.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    const owner = await assertCourseOwner(parsedId.data, user.id);
    if ("error" in owner) return owner;

    const result: { error?: string } = await prisma.$transaction(async (tx) => {
      const count = await tx.courseDay.count({ where: { courseId: parsedId.data } });
      if (count >= MAX_DAYS) return { error: "invalid_input" };

      const last = await tx.courseDay.findFirst({
        where: { courseId: parsedId.data },
        orderBy: { dayNumber: "desc" },
        select: { dayNumber: true },
      });

      await tx.courseDay.create({
        data: { courseId: parsedId.data, dayNumber: (last?.dayNumber ?? 0) + 1 },
      });

      // Day를 추가했는데 목록 순서가 안 바뀌면 편집이 반영되지 않은 것처럼 보인다.
      // 빈 data({})는 쿼리 자체가 나가지 않아 @updatedAt이 안 걸린다 — 직접 넣는다.
      await tx.course.update({
        where: { id: parsedId.data },
        data: { updatedAt: new Date() },
      });
      return {};
    });

    if (result.error) return result;

    revalidateCoursePaths(parsedId.data);
    return {};
  } catch (e) {
    console.error("[addCourseDay] server_error", e);
    return { error: "server_error" };
  }
}

// ─── removeCourseDay ─────────────────────────────────────────────────────────

/**
 * Day 삭제 후 남은 Day를 1..n으로 재번호한다.
 * 마지막 Day를 지워 Day 0개가 되는 것도 허용한다 — 편집기 빈 상태가 설계에 있다.
 */
export async function removeCourseDay(dayId: string): Promise<{ error?: string }> {
  const parsedId = dayIdSchema.safeParse(dayId);
  if (!parsedId.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    const owner = await assertDayOwner(parsedId.data, user.id);
    if ("error" in owner) return owner;
    const { courseId } = owner;

    await prisma.$transaction(async (tx) => {
      // CourseItem은 onDelete: Cascade로 함께 삭제된다
      await tx.courseDay.delete({ where: { id: parsedId.data } });

      const remaining = await tx.courseDay.findMany({
        where: { courseId },
        orderBy: { dayNumber: "asc" },
        select: { id: true, dayNumber: true },
      });

      // @@unique([courseId, dayNumber]) 때문에 순차 대입은 중간 상태에서 충돌한다.
      // (1,2,3에서 2를 지우고 3→2로 내리면 아직 남아있는 값과 겹쳐 P2002)
      // 전부 음수로 밀어 양수 구간을 비운 뒤 1..n으로 되돌린다. Day는 최대 7개다.
      // 정확성 조건이 아니라 최적화다 — 맨 뒤 Day를 지우면 남은 번호가 이미 1..n이라
      // update 14회를 통째로 건너뛴다.
      const needsRenumber = remaining.some((d, i) => d.dayNumber !== i + 1);
      if (needsRenumber) {
        for (let i = 0; i < remaining.length; i++) {
          await tx.courseDay.update({
            where: { id: remaining[i].id },
            data: { dayNumber: -(i + 1) },
          });
        }
        for (let i = 0; i < remaining.length; i++) {
          await tx.courseDay.update({
            where: { id: remaining[i].id },
            data: { dayNumber: i + 1 },
          });
        }
      }

      await tx.course.update({
        where: { id: courseId },
        data: { updatedAt: new Date() },
      });
      // 최대 17회 왕복(delete 1 + findMany 1 + update 14 + update 1)이다.
      // pooler 지연을 감안하면 기본 5초가 빠듯하다 — Day 7개에서 맨 앞을 지우는 경우가 최악이다.
    }, { timeout: 15000 });

    revalidateCoursePaths(courseId);
    return {};
  } catch (e) {
    console.error("[removeCourseDay] server_error", e);
    return { error: "server_error" };
  }
}

// ─── 아이템 입력 스키마 ──────────────────────────────────────────────────────
// 두 갈래다. TourAPI 관광지는 Place가 아니므로 placeId가 없다 (Nearby Attractions 경로).

const addItemSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("place"),
    placeId: z.string().uuid(),
  }),
  z.object({
    source: z.literal("external"),
    nameEn: z.string().trim().min(1).max(200),
    nameKo: z.string().trim().max(200).optional(),
    address: z.string().trim().max(300).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    imageUrl: z.string().url().optional(),
  }),
]);

type AddItemInput = z.infer<typeof addItemSchema>;

/** CourseItem에 저장할 스냅샷. Place는 나중에 바뀔 수 있으므로 값을 복사해 둔다. */
type ItemSnapshot = {
  placeId: string | null;
  nameEn: string;
  nameKo: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
};

// ─── addCourseItem ───────────────────────────────────────────────────────────

/** Day 맨 뒤에 아이템 추가. Place에서 오면 스냅샷을 뜨고 placeId로 원본을 추적한다. */
export async function addCourseItem(
  dayId: string,
  input: AddItemInput
): Promise<{ error?: string }> {
  const parsedDayId = dayIdSchema.safeParse(dayId);
  if (!parsedDayId.success) return { error: "invalid_input" };

  const parsed = addItemSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    const owner = await assertDayOwner(parsedDayId.data, user.id);
    if ("error" in owner) return owner;
    const { courseId } = owner;

    let snapshot: ItemSnapshot;

    if (parsed.data.source === "place") {
      const place = await prisma.place.findUnique({
        where: { id: parsed.data.placeId },
        select: {
          nameEn: true,
          nameKo: true,
          addressEn: true,
          addressKo: true,
          latitude: true,
          longitude: true,
          imageUrl: true,
          // Place.imageUrl은 fallback이고 대표 이미지는 PlaceImage에 있다 (map-queries와 동일)
          placeImages: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      });
      if (!place) return { error: "not_found" };

      snapshot = {
        placeId: parsed.data.placeId,
        // Place.nameEn은 nullable인데 CourseItem.nameEn은 NOT NULL — Ko 폴백이 필수다
        nameEn: place.nameEn?.trim() || place.nameKo,
        nameKo: place.nameKo,
        address: place.addressEn?.trim() || place.addressKo,
        latitude: place.latitude,
        longitude: place.longitude,
        imageUrl: place.placeImages[0]?.url ?? place.imageUrl,
      };
    } else {
      snapshot = {
        placeId: null,
        nameEn: parsed.data.nameEn,
        nameKo: parsed.data.nameKo || null,
        address: parsed.data.address || null,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        imageUrl: parsed.data.imageUrl || null,
      };
    }

    const result: { error?: string } = await prisma.$transaction(async (tx) => {
      const count = await tx.courseItem.count({ where: { dayId: parsedDayId.data } });
      if (count >= MAX_ITEMS_PER_DAY) return { error: "invalid_input" };

      // 같은 Day에 같은 장소는 막고, 다른 Day는 허용한다 (이틀 연속 방문이 정상 시나리오).
      // external은 식별자가 없어 중복 검사를 하지 않는다.
      if (snapshot.placeId !== null) {
        const duplicate = await tx.courseItem.findFirst({
          where: { dayId: parsedDayId.data, placeId: snapshot.placeId },
          select: { id: true },
        });
        if (duplicate) return { error: "invalid_input" };
      }

      const last = await tx.courseItem.findFirst({
        where: { dayId: parsedDayId.data },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      // 아이템이 없으면 last가 null — 0부터 시작한다
      const sortOrder = last === null ? 0 : last.sortOrder + 1;

      await tx.courseItem.create({
        data: { dayId: parsedDayId.data, sortOrder, ...snapshot },
      });
      await tx.course.update({
        where: { id: courseId },
        data: { updatedAt: new Date() },
      });
      return {};
    });

    if (result.error) return result;

    revalidateCoursePaths(courseId);
    return {};
  } catch (e) {
    console.error("[addCourseItem] server_error", e);
    return { error: "server_error" };
  }
}

// ─── removeCourseItem ────────────────────────────────────────────────────────

/**
 * 아이템 삭제. sortOrder에 구멍이 남지만 재정렬하지 않는다 —
 * unique가 없어 orderBy가 정상 동작하고, reorderCourseItems가 0부터 다시 매긴다.
 */
export async function removeCourseItem(itemId: string): Promise<{ error?: string }> {
  const parsedId = itemIdSchema.safeParse(itemId);
  if (!parsedId.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    const owner = await assertItemOwner(parsedId.data, user.id);
    if ("error" in owner) return owner;
    const { courseId } = owner;

    await prisma.$transaction([
      prisma.courseItem.delete({ where: { id: parsedId.data } }),
      prisma.course.update({ where: { id: courseId }, data: { updatedAt: new Date() } }),
    ]);

    revalidateCoursePaths(courseId);
    return {};
  } catch (e) {
    console.error("[removeCourseItem] server_error", e);
    return { error: "server_error" };
  }
}

// ─── reorderCourseItems ──────────────────────────────────────────────────────

/** Day 안의 아이템 순서를 통째로 다시 매긴다. sortOrder에 unique가 없어 음수 경유가 필요 없다. */
export async function reorderCourseItems(
  dayId: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  const parsedDayId = dayIdSchema.safeParse(dayId);
  if (!parsedDayId.success) return { error: "invalid_input" };

  const parsedIds = z.array(itemIdSchema).safeParse(orderedIds);
  if (!parsedIds.success) return { error: "invalid_input" };

  // 정렬은 집합이 정확히 일치해야 의미가 있다 — 중복은 제거가 아니라 거부한다
  if (new Set(parsedIds.data).size !== parsedIds.data.length) {
    return { error: "invalid_input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    const owner = await assertDayOwner(parsedDayId.data, user.id);
    if ("error" in owner) return owner;
    const { courseId } = owner;

    if (parsedIds.data.length === 0) return {};

    // 집합 조회와 update를 같은 트랜잭션에 둔다. 사이가 벌어지면 그 틈에
    // 아이템이 추가된 경우 새 아이템이 옛 sortOrder를 유지한 채 재정렬에서 빠져
    // 조용히 어긋나고, 삭제된 경우 update가 P2025로 터진다.
    const result: { error?: string } = await prisma.$transaction(async (tx) => {
      const items = await tx.courseItem.findMany({
        where: { dayId: parsedDayId.data },
        select: { id: true },
      });

      // 다른 Day의 아이템이 섞여 들어오는 것을 막는다 — 집합이 정확히 일치해야 한다
      if (items.length !== parsedIds.data.length) return { error: "invalid_input" };
      const owned = new Set(items.map((item) => item.id));
      if (parsedIds.data.some((id) => !owned.has(id))) return { error: "invalid_input" };

      for (let index = 0; index < parsedIds.data.length; index++) {
        await tx.courseItem.update({
          where: { id: parsedIds.data[index] },
          data: { sortOrder: index },
        });
      }
      await tx.course.update({
        where: { id: courseId },
        data: { updatedAt: new Date() },
      });
      return {};
    });

    if (result.error) return result;

    revalidateCoursePaths(courseId);
    return {};
  } catch (e) {
    console.error("[reorderCourseItems] server_error", e);
    return { error: "server_error" };
  }
}

// ─── copyCourse ──────────────────────────────────────────────────────────────

/**
 * 코스 복사. 소유자 검증이 아니라 공개 여부를 검증한다 — 남의 공개 코스를 복사하는 기능이다.
 * 복사 직후 원본과 완전히 끊어진다. 이후 원본이 바뀌어도 복사본은 그대로다.
 */
export async function copyCourse(sourceId: string): Promise<{ id?: string; error?: string }> {
  const parsedId = courseIdSchema.safeParse(sourceId);
  if (!parsedId.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    const source = await prisma.course.findUnique({
      where: { id: parsedId.data },
      select: {
        title: true,
        description: true,
        coverImageUrl: true,
        isPublic: true,
        authorId: true,
        days: {
          orderBy: { dayNumber: "asc" },
          select: {
            dayNumber: true,
            title: true,
            items: {
              orderBy: { sortOrder: "asc" },
              select: {
                sortOrder: true,
                placeId: true,
                nameEn: true,
                nameKo: true,
                address: true,
                latitude: true,
                longitude: true,
                imageUrl: true,
                note: true,
              },
            },
          },
        },
        topics: { select: { topicId: true } },
      },
    });

    if (!source) return { error: "not_found" };
    // 내 비공개 코스는 복사할 수 있다
    if (!source.isPublic && source.authorId !== user.id) return { error: "forbidden" };

    const created = await prisma.$transaction(
      async (tx) => {
        const copy = await tx.course.create({
          data: {
            title: source.title,
            description: source.description,
            coverImageUrl: source.coverImageUrl,
            authorId: user.id,
            isPublic: false, // 복사본은 항상 비공개로 시작
            copyCount: 0, // 원본 값을 가져오지 않는다
            copiedFromId: parsedId.data,
          },
          select: { id: true },
        });

        // 3단 중첩이라 Day를 하나씩 만들어 id를 받고 아이템을 createMany 한다
        // (event-actions.ts:324 의 perk/bodyBlock 패턴)
        for (const day of source.days) {
          const newDay = await tx.courseDay.create({
            data: { courseId: copy.id, dayNumber: day.dayNumber, title: day.title },
            select: { id: true },
          });
          // 아이템 0개인 Day도 그대로 복사한다 — 빈 Day는 정상 상태다
          if (day.items.length > 0) {
            await tx.courseItem.createMany({
              data: day.items.map((item) => ({ dayId: newDay.id, ...item })),
            });
          }
        }

        if (source.topics.length > 0) {
          await tx.courseTopic.createMany({
            data: source.topics.map((t) => ({ courseId: copy.id, topicId: t.topicId })),
          });
        }

        // 증가만 있고 감소는 없다 — 복사 후 원본과 끊어지므로 되돌릴 일이 없다.
        //
        // 이 update는 @updatedAt 때문에 원본의 updatedAt도 함께 밀어 올린다.
        // 개념상으로는 올리지 않는 게 맞다 — copyCount는 남이 올린 값이지 작성자의 편집이 아니다.
        // 끄려면 raw SQL밖에 없는데 코드베이스에 선례가 0건이고,
        // scrap-actions.ts의 saveCount 증가가 이미 Post.updatedAt에 같은 부작용을 낸다.
        // 영향은 작성자 본인의 getMyCourses(updatedAt desc) 정렬뿐이고
        // getPublicCourses는 createdAt desc라 무관하다. 그래서 그대로 둔다.
        await tx.course.update({
          where: { id: parsedId.data },
          data: { copyCount: { increment: 1 } },
        });

        return copy;
      },
      { timeout: 15000 }
    );

    revalidateCoursePaths(created.id);
    revalidateCoursePaths(parsedId.data); // 원본도 — copyCount가 바뀌었다
    return { id: created.id };
  } catch (e) {
    console.error("[copyCourse] server_error", e);
    return { error: "server_error" };
  }
}
