"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";

// ─── Zod 스키마 ─────────────────────────────────────────────────────────────

const postIdSchema = z.string().uuid();
const commentIdSchema = z.string().uuid();
const commentSchema = z.object({
  postId: z.string().uuid(),
  body: z.string().trim().min(1).max(1000),
});

// ─── 공유 타입 ───────────────────────────────────────────────────────────────

export type CommentAuthor = {
  id: string;
  nickname: string | null;
  profileImageUrl: string | null;
};

export type CommentData = {
  id: string;
  body: string;
  createdAt: Date | string;
  user: CommentAuthor;
};

// ─── togglePostLike ──────────────────────────────────────────────────────────

export async function togglePostLike(
  postId: string
): Promise<{ liked: boolean; error?: string }> {
  const parsed = postIdSchema.safeParse(postId);
  if (!parsed.success) return { liked: false, error: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { liked: false, error: "unauthenticated" };

  const userId = user.id;

  try {
    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId, postId: parsed.data } },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.postLike.delete({ where: { id: existing.id } }),
        prisma.post.updateMany({
          where: { id: parsed.data, likeCount: { gt: 0 } },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false };
    } else {
      await prisma.$transaction([
        prisma.postLike.create({ data: { userId, postId: parsed.data } }),
        prisma.post.update({
          where: { id: parsed.data },
          data: { likeCount: { increment: 1 } },
        }),
      ]);
      return { liked: true };
    }
  } catch (e) {
    // 동시 요청 경쟁 조건으로 unique 제약 위반 → 이미 처리됨으로 흡수
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { liked: true };
    }
    console.error("[togglePostLike] server_error", e);
    return { liked: false, error: "server_error" };
  }
}

// ─── addComment ──────────────────────────────────────────────────────────────

export async function addComment(
  postId: string,
  body: string
): Promise<{ comment?: CommentData; error?: string }> {
  const parsed = commentSchema.safeParse({ postId, body });
  if (!parsed.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const userId = user.id;

  try {
    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          userId,
          postId: parsed.data.postId,
          body: parsed.data.body,
        },
        select: {
          id: true,
          body: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              nickname: true,
              profileImageUrl: true,
            },
          },
        },
      }),
      prisma.post.update({
        where: { id: parsed.data.postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    return { comment };
  } catch (e) {
    console.error("[addComment] server_error", e);
    return { error: "server_error" };
  }
}

// ─── incrementPostView ───────────────────────────────────────────────────────

export async function incrementPostView(postId: string): Promise<void> {
  const parsed = postIdSchema.safeParse(postId);
  if (!parsed.success) return;

  const user = await getCurrentUser();
  if (user?.role === "ADMIN" || user?.role === "EDITOR") return;

  await prisma.post.update({
    where: { id: parsed.data },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {});
}

// ─── deleteComment ───────────────────────────────────────────────────────────

export async function deleteComment(
  commentId: string
): Promise<{ error?: string }> {
  const parsed = commentIdSchema.safeParse(commentId);
  if (!parsed.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  try {
    const [comment, actor] = await Promise.all([
      prisma.comment.findUnique({
        where: { id: parsed.data },
        select: { userId: true, postId: true },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      }),
    ]);

    if (!comment) return { error: "not_found" };
    const isModerator = actor?.role === "ADMIN" || actor?.role === "EDITOR";
    if (comment.userId !== user.id && !isModerator) return { error: "forbidden" };

    await prisma.$transaction([
      prisma.comment.delete({ where: { id: parsed.data } }),
      prisma.post.updateMany({
        where: { id: comment.postId, commentCount: { gt: 0 } },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

    return {};
  } catch (e) {
    console.error("[deleteComment] server_error", e);
    return { error: "server_error" };
  }
}
