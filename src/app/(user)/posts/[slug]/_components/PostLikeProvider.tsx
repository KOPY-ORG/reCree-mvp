"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { togglePostLike } from "@/app/(user)/_actions/post-interaction-actions";
import { useToast } from "@/app/(user)/_hooks/useToast";
import { LoginPromptDialog } from "@/app/(user)/_components/LoginPromptDialog";

interface PostLike {
  liked: boolean;
  pending: boolean;
  toggle: () => void;
}

const PostLikeContext = createContext<PostLike | null>(null);

interface Props {
  postId: string;
  initialLiked: boolean;
  isLoggedIn: boolean;
  children: React.ReactNode;
}

// 좋아요 상태는 이 한 곳에 둔다 — 게시글 아래 좋아요 알약(LikeSaveButtons)과 lg 제목 아래 하트(PostActionBar)가 같이 쓴다.
// 로그인해야 누를 수 있다. 비로그인은 상태를 바꾸지 않고 로그인 안내창을 띄운다.
// 먼저 바꿔 보여주고(서버 응답을 기다리지 않는다) 실패하면 되돌린다
export function PostLikeProvider({ postId, initialLiked, isLoggedIn, children }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast, showToast } = useToast();

  function toggle() {
    if (!isLoggedIn) {
      setShowLoginDialog(true);
      return;
    }

    const prevLiked = liked;
    setLiked(!prevLiked);

    startTransition(async () => {
      const result = await togglePostLike(postId);
      if (result.error) {
        setLiked(prevLiked);
        showToast(result.error === "unauthenticated" ? "Sign in to like" : "Something went wrong");
        return;
      }
      setLiked(result.liked);
    });
  }

  return (
    <PostLikeContext.Provider value={{ liked, pending, toggle }}>
      {children}

      <LoginPromptDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        title="Sign in to like"
        description="Show some love for the spots you enjoy."
      />

      {toast && (
        <div className="fixed bottom-[var(--bottom-nav-space)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
    </PostLikeContext.Provider>
  );
}

export function usePostLike(): PostLike {
  const value = useContext(PostLikeContext);
  if (!value) throw new Error("usePostLike must be used inside PostLikeProvider");
  return value;
}
