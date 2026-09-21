"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { FeedCard } from "./FeedCard";
import type { PostItem } from "@/lib/post-queries";
import { type TagGroupColorMap } from "@/lib/post-labels";

type FetchFn = (args: { cursor?: string; topicId?: string }) => Promise<{ posts: PostItem[]; nextCursor: string | null }>;

/**
 * 더 부르지 않는 이유. null 이면 계속 부른다.
 * "진짜 끝" 과 "상한에 걸려 멈춤" 은 안내 문구가 달라 구분해서 들고 있어야 한다.
 */
type EndReason = "caught-up" | "capped";

function endReasonOf(cursor: string | null, count: number, maxItems: number): EndReason | null {
  // 커서가 없으면 서버가 더 없다고 답한 것 — 상한과 동시에 닿아도 이쪽이 사실이다
  if (cursor === null) return "caught-up";
  if (count >= maxItems) return "capped";
  return null;
}

interface Props {
  initialPosts: PostItem[];
  initialCursor: string | null;
  savedIds: string[];
  tagGroupMap: TagGroupColorMap;
  fetchFn: FetchFn;
  /** 이 개수에 닿으면 더 부르지 않는다. 기본은 상한 없음 */
  maxItems?: number;
  /** 있으면 fetchFn 을 부를 때마다 함께 넘긴다. 첫 페이지는 서버가 이미 걸러 온 것이다 */
  topicId?: string;
}

export function InfiniteFeed({
  initialPosts,
  initialCursor,
  savedIds,
  tagGroupMap,
  fetchFn,
  maxItems = Infinity,
  topicId,
}: Props) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [endReason, setEndReason] = useState<EndReason | null>(
    endReasonOf(initialCursor, initialPosts.length, maxItems)
  );
  const [error, setError] = useState(false);

  // Observer 콜백용 ref 미러 — stale closure 없이 최신 값을 읽기 위함
  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(initialCursor);
  const endRef = useRef<EndReason | null>(
    endReasonOf(initialCursor, initialPosts.length, maxItems)
  );
  const countRef = useRef(initialPosts.length);
  const errorRef = useRef(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  // ref만 읽으므로 의존성 없이 안정적. useCallback([])으로 감싸 Observer 등록 시 단 한 번만 사용.
  const loadMore = useCallback(async () => {
    // 커서가 null 인 경우는 endRef 가 이미 "caught-up" 으로 덮는다
    if (loadingRef.current || endRef.current !== null || errorRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);
    try {
      const result = await fetchFn({ cursor: cursorRef.current ?? undefined, topicId });
      setPosts((prev) => [...prev, ...result.posts].slice(0, maxItems));
      cursorRef.current = result.nextCursor;
      countRef.current = Math.min(countRef.current + result.posts.length, maxItems);
      const reason = endReasonOf(result.nextCursor, countRef.current, maxItems);
      if (reason !== null) {
        endRef.current = reason;
        setEndReason(reason);
      }
    } catch {
      errorRef.current = true;
      setError(true);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [fetchFn, maxItems, topicId]);

  // loadMore는 fetchFn이 안정적인 참조(server action)일 때 단 한 번만 등록됨

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div>
      <div className="flex flex-col gap-10">
        {posts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            tagGroupMap={tagGroupMap}
            isSaved={savedSet.has(post.id)}
          />
        ))}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-10 mt-6">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video rounded-lg bg-muted" />
              <div className="mt-2.5 flex flex-col gap-2">
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
                <div className="h-5 w-full rounded bg-muted" />
                <div className="h-5 w-3/4 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Something went wrong.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => {
              errorRef.current = false;
              setError(false);
              loadMore();
            }}
          >
            Try again
          </button>
        </p>
      )}

      {/* 상한("capped")으로 멈춘 경우는 더 볼 게 남아 있으므로 아무것도 알리지 않는다 */}
      {endReason === "caught-up" && !isLoading && !error && posts.length > 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          You're all caught up.
        </p>
      )}

      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
