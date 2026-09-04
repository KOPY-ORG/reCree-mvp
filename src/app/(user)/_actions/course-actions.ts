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
      // topicIds만 바뀌어도 updatedAt을 올린다 — getMyCourses가 updatedAt으로 정렬한다
      await tx.course.update({
        where: { id: parsedId.data },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
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
