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
const noteSchema = z.string().trim().max(200).optional();

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
          ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
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
    });

    revalidateCoursePaths(courseId);
    return {};
  } catch (e) {
    console.error("[removeCourseDay] server_error", e);
    return { error: "server_error" };
  }
}
