"use client";

// 공유 후 "Link copied!" 알림 — useSharePost 의 toast 를 그린다 (PostDetailHeader · PostActionBar)
export function ShareToast({ toast }: { toast: { message: string } | null }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-[var(--bottom-nav-space)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/50 text-white text-sm whitespace-nowrap shadow-lg pointer-events-none">
      {toast.message}
    </div>
  );
}
