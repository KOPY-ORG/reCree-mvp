"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { ensureVoterKey, hashRequestIp, hitBurstLimit, HELPFUL_LIMITS } from "@/lib/helpful-vote";

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

// ─── toggleHelpfulVote ───────────────────────────────────────────────────────
// "도움이 됐어요" — 로그인 없이 누른다. 같은 기기(voterKey 쿠키)는 글마다 한 번, 다시 누르면 취소.
// 남용 방지: 순간 연타(메모리) → 같은 곳의 10분 · 글별 24시간 한도(DB) 순으로 막는다 (src/lib/helpful-vote.ts)

export async function toggleHelpfulVote(
  postId: string
): Promise<{ voted: boolean; count: number; error?: "invalid_input" | "not_found" | "rate_limited" | "server_error" }> {
  const parsed = postIdSchema.safeParse(postId);
  if (!parsed.success) return { voted: false, count: 0, error: "invalid_input" };

  try {
    const post = await prisma.post.findUnique({
      where: { id: parsed.data },
      select: { status: true },
    });
    if (!post || post.status !== "PUBLISHED") return { voted: false, count: 0, error: "not_found" };

    const ipHash = await hashRequestIp();
    if (!ipHash) return { voted: false, count: 0, error: "server_error" };
    const voterKey = await ensureVoterKey();
    const where = { postId_voterKey: { postId: parsed.data, voterKey } };
    const countVotes = () => prisma.postHelpfulVote.count({ where: { postId: parsed.data } });

    if (hitBurstLimit(ipHash)) {
      const existing = await prisma.postHelpfulVote.findUnique({ where, select: { id: true } });
      return { voted: !!existing, count: await countVotes(), error: "rate_limited" };
    }

    // 이미 눌렀으면 취소
    const removed = await prisma.postHelpfulVote.deleteMany({ where: { postId: parsed.data, voterKey } });
    if (removed.count > 0) return { voted: false, count: await countVotes() };

    // 새로 남기기 전에 같은 곳의 한도를 센다
    const now = Date.now();
    const { perIp, perPostPerIp } = HELPFUL_LIMITS;
    const [ipRecent, postIpRecent] = await Promise.all([
      prisma.postHelpfulVote.count({
        where: { ipHash, createdAt: { gte: new Date(now - perIp.windowMs) } },
      }),
      prisma.postHelpfulVote.count({
        where: { postId: parsed.data, ipHash, createdAt: { gte: new Date(now - perPostPerIp.windowMs) } },
      }),
    ]);
    if (ipRecent >= perIp.max || postIpRecent >= perPostPerIp.max) {
      return { voted: false, count: await countVotes(), error: "rate_limited" };
    }

    try {
      await prisma.postHelpfulVote.create({ data: { postId: parsed.data, voterKey, ipHash } });
    } catch (e) {
      // 같은 기기의 동시 요청 — 이미 남아 있으므로 눌린 상태로 본다
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    }
    return { voted: true, count: await countVotes() };
  } catch (e) {
    console.error("[toggleHelpfulVote] server_error", e);
    return { voted: false, count: 0, error: "server_error" };
  }
}
