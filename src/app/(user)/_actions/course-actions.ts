"use server";

import { revalidatePath } from "next/cache";
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
