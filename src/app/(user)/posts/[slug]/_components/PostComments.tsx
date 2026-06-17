"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LogIn, Trash2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  addComment,
  deleteComment,
} from "@/app/(user)/_actions/post-interaction-actions";
import { useToast } from "@/app/(user)/_hooks/useToast";
import type { PostComment } from "@/lib/post-detail-query";

// CommentItem: 실제 + optimistic(temp-*) 항목 공통 타입.
// createdAt은 RSC 직렬화로 string으로 올 수 있어 Date | string 허용.
type CommentItem = {
  id: string;
  body: string;
  createdAt: Date | string;
  user: { id: string; nickname: string | null; profileImageUrl: string | null };
};

interface Props {
  postId: string;
  initialComments: PostComment[];
  initialCommentCount: number;
  currentUserId: string | null;
  currentUserRole: string | null;
  currentUserNickname: string | null;
  currentUserProfileImageUrl: string | null;
}

// ─── 상대시간 포맷 ────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── PostComments ─────────────────────────────────────────────────────────────

export function PostComments({
  postId,
  initialComments,
  initialCommentCount,
  currentUserId,
  currentUserRole,
  currentUserNickname,
  currentUserProfileImageUrl,
}: Props) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const trimmedBody = body.trim();

  // ── 등록 ──────────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!trimmedBody) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: CommentItem = {
      id: tempId,
      body: trimmedBody,
      createdAt: new Date(),
      user: {
        id: currentUserId ?? "",
        nickname: currentUserNickname,
        profileImageUrl: currentUserProfileImageUrl,
      },
    };

    setComments((prev) => [optimistic, ...prev]);
    setCommentCount((c) => c + 1);
    setBody("");

    startTransition(async () => {
      const result = await addComment(postId, trimmedBody);

      if (result.error === "unauthenticated") {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setCommentCount((c) => c - 1);
        showToast("Sign in to comment");
        return;
      }
      if (result.error === "invalid_input") {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setCommentCount((c) => c - 1);
        showToast("Comment must be 1–1000 characters");
        return;
      }
      if (result.error || !result.comment) {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setCommentCount((c) => c - 1);
        showToast("Something went wrong");
        return;
      }

      // 임시 항목을 서버가 준 실제 객체로 교체
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? result.comment! : c))
      );
    });
  }

  // ── 삭제 ──────────────────────────────────────────────────────────────────

  function handleDelete(commentId: string) {
    setPendingDeleteId(commentId);
  }

  function executeDelete() {
    if (!pendingDeleteId) return;
    const commentId = pendingDeleteId;
    setPendingDeleteId(null);

    const prevComments = comments;
    const prevCount = commentCount;

    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentCount((c) => c - 1);

    startTransition(async () => {
      const result = await deleteComment(commentId);
      if (result.error) {
        setComments(prevComments);
        setCommentCount(prevCount);
        showToast("Something went wrong");
      }
    });
  }

  // ── 권한 판정 ─────────────────────────────────────────────────────────────

  function canDelete(comment: CommentItem) {
    return (
      !comment.id.startsWith("temp-") &&
      !!currentUserId &&
      (comment.user.id === currentUserId ||
        currentUserRole === "ADMIN" ||
        currentUserRole === "EDITOR")
    );
  }

  // ── 렌더 ──────────────────────────────────────────────────────────────────

  return (
    <section id="comments" className="px-4 mt-8 mb-6">
      <h2 className="text-base font-bold mb-3">
        Comments
        {commentCount > 0 && (
          <span className="font-normal text-muted-foreground ml-1">
            ({commentCount})
          </span>
        )}
      </h2>
      <div className="rounded-2xl border border-secondary bg-white overflow-hidden">
        {/* 댓글 목록 */}
        <div className="px-4 py-4 space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Be the first to comment
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-2.5">
                <UserAvatar
                  imageUrl={comment.user.profileImageUrl}
                  name={comment.user.nickname}
                  size={32}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">
                      {comment.user.nickname ?? "User"}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(new Date(comment.createdAt))}
                      </span>
                      {canDelete(comment) && (
                        <button
                          type="button"
                          onClick={() => handleDelete(comment.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-foreground mt-0.5 break-words">
                    {comment.body}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 입력창 */}
        <div className="px-4 pb-4 pt-3">
          {currentUserId ? (
            <>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add a comment…"
                rows={2}
                maxLength={1000}
                className="resize-none text-sm"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!trimmedBody || pending}
                  className="px-4 py-1.5 rounded-full text-sm font-medium bg-brand text-black disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {pending ? "Posting…" : "Post"}
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-center py-1">
              <button
                type="button"
                onClick={() => setShowLoginDialog(true)}
                className="px-5 py-2 rounded-full text-sm font-semibold bg-brand text-black hover:opacity-90 active:scale-95 transition-all"
              >
                Sign in to comment
              </button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete comment?"
        description="This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={executeDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="max-w-xs rounded-2xl text-center">
          <DialogHeader className="items-center gap-3">
            <LogIn className="size-8 text-muted-foreground" strokeWidth={1.5} />
            <DialogTitle>Sign in to comment</DialogTitle>
            <DialogDescription>
              Join the conversation and share your thoughts.
            </DialogDescription>
          </DialogHeader>
          <Link
            href="/login"
            className="mt-2 w-full py-2.5 rounded-full bg-brand text-black text-sm font-semibold text-center block transition-opacity hover:opacity-80"
          >
            Sign in
          </Link>
        </DialogContent>
      </Dialog>
    </section>
  );
}
