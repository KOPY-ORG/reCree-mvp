"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { FeedCard } from "./FeedCard";
import type { PostItem } from "@/lib/post-queries";
import { type TagGroupColorMap } from "@/lib/post-labels";

type FetchFn = (args: { cursor?: string }) => Promise<{ posts: PostItem[]; nextCursor: string | null }>;

interface Props {
  initialPosts: PostItem[];
  initialCursor: string | null;
  savedIds: string[];
  tagGroupMap: TagGroupColorMap;
  fetchFn: FetchFn;
}

export function InfiniteFeed({
  initialPosts,
  initialCursor,
  savedIds,
  tagGroupMap,
  fetchFn,
}: Props) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnd, setIsEnd] = useState(initialCursor === null);
  const [error, setError] = useState(false);

  // Observer 콜백용 ref 미러 — stale closure 없이 최신 값을 읽기 위함
  const loadingRef = useRef(false);
  const cursorRef = useRef<string | null>(initialCursor);
  const isEndRef = useRef(initialCursor === null);
  const errorRef = useRef(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  // ref만 읽으므로 의존성 없이 안정적. useCallback([])으로 감싸 Observer 등록 시 단 한 번만 사용.
  const loadMore = useCallback(async () => {
    if (loadingRef.current || isEndRef.current || errorRef.current || cursorRef.current === null) return;

    loadingRef.current = true;
    setIsLoading(true);
    try {
      const result = await fetchFn({ cursor: cursorRef.current ?? undefined });
      setPosts((prev) => [...prev, ...result.posts]);
      cursorRef.current = result.nextCursor;
      if (result.nextCursor === null) {
        isEndRef.current = true;
        setIsEnd(true);
      }
    } catch {
      errorRef.current = true;
      setError(true);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [fetchFn]);

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

      {isEnd && !isLoading && !error && posts.length > 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          You're all caught up.
        </p>
      )}

      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
