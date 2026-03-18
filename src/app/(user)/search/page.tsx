"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { Search, X, ChevronLeft, MapPin, ChevronRight } from "lucide-react";
import { searchSuggestions, getPopularSearches, type Suggestion } from "./_actions/search-actions";
import { SearchBar } from "../_components/SearchBar";

const RECENT_KEY = "recree_recent_searches";
const MAX_RECENT = 10;
const RECENT_POSTS_KEY = "recree_recent_posts";
const MAX_RECENT_POSTS = 5;

type RecentPost = { title: string; slug: string; placeName?: string };

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  const prev = getRecent().filter((q) => q !== query);
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, MAX_RECENT)));
}

function removeRecent(query: string) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(getRecent().filter((q) => q !== query)));
}

function getRecentPosts(): RecentPost[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_POSTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecentPost(title: string, slug: string, placeName?: string) {
  const prev = getRecentPosts().filter((p) => p.slug !== slug);
  localStorage.setItem(
    RECENT_POSTS_KEY,
    JSON.stringify([{ title, slug, placeName }, ...prev].slice(0, MAX_RECENT_POSTS))
  );
}

function removeRecentPost(slug: string) {
  localStorage.setItem(
    RECENT_POSTS_KEY,
    JSON.stringify(getRecentPosts().filter((p) => p.slug !== slug))
  );
}

function SearchSkeleton() {
  const widths = ["w-28", "w-36", "w-24", "w-32", "w-20", "w-28"];
  return (
    <>
      {widths.map((w, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-border/40 last:border-0"
        >
          <div className="size-4 rounded-full bg-muted shrink-0" />
          <div className={`h-3.5 rounded-full bg-muted ${w}`} />
        </div>
      ))}
    </>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(() => searchParams.get("q") ?? "");
  const from = searchParams.get("from");
  const [recent, setRecent] = useState<string[]>(() => getRecent());
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>(() => getRecentPosts());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getPopularSearches().then(setPopular);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!value.trim()) {
        setSuggestions([]);
        return;
      }
      const results = await searchSuggestions(value);
      setSuggestions(results);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  function navigateKeyword(text: string) {
    saveRecent(text);
    if (from === "map") {
      router.push(`/my-map?q=${encodeURIComponent(text)}`);
    } else {
      router.push(`/explore?q=${encodeURIComponent(text)}`);
    }
  }

  function navigatePost(title: string, slug: string, placeName?: string) {
    saveRecentPost(title, slug, placeName);
    router.push(`/posts/${slug}`);
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (value.trim()) navigateKeyword(value.trim());
  }

  function handleRemoveRecent(q: string) {
    removeRecent(q);
    setRecent(getRecent());
  }

  function handleRemoveRecentPost(slug: string) {
    removeRecentPost(slug);
    setRecentPosts(getRecentPosts());
  }

  function handleClearAll() {
    localStorage.removeItem(RECENT_KEY);
    localStorage.removeItem(RECENT_POSTS_KEY);
    setRecent([]);
    setRecentPosts([]);
  }

  const isTyping = value.trim().length > 0;
  const hasRecent = recent.length > 0 || recentPosts.length > 0;

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* 헤더 */}
      <header className="app-header">
        <form onSubmit={handleSubmit} className="h-12 flex items-center gap-2 px-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="shrink-0 p-1 text-foreground"
          >
            <ChevronLeft className="size-5" />
          </button>

          <SearchBar variant="input" value={value} onChange={setValue} autoFocus />
        </form>
      </header>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {isTyping ? (
          <ul>
            {suggestions.map((s) => (
              <li key={s.type === "post" ? `post-${s.slug}` : `kw-${s.text}`}>
                <button
                  onClick={() =>
                    s.type === "post"
                      ? navigatePost(s.text, s.slug, s.placeName)
                      : navigateKeyword(s.text)
                  }
                  className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-muted/40 transition-colors text-left border-b border-border/40 last:border-0"
                >
                  {s.type === "keyword" ? (
                    <Search className="size-4 text-muted-foreground shrink-0" />
                  ) : (
                    <MapPin className="size-4 text-muted-foreground shrink-0" />
                  )}
                  {s.type === "post" ? (
                    <>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate">{s.placeName ?? s.text}</span>
                        {s.placeName && (
                          <span className="text-xs text-muted-foreground truncate">{s.text}</span>
                        )}
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                    </>
                  ) : (
                    <span>{s.text}</span>
                  )}
                </button>
              </li>
            ))}
            {suggestions.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                No results found.
              </li>
            )}
          </ul>
        ) : (
          <div className="px-4 py-5 space-y-7">
            {hasRecent && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-sm">Recent</h2>
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear all
                  </button>
                </div>
                {recent.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {recent.map((q) => (
                      <span
                        key={q}
                        className="flex items-center gap-1.5 h-7 px-3 rounded-full border border-border text-sm"
                      >
                        <button onClick={() => navigateKeyword(q)}>{q}</button>
                        <button
                          onClick={() => handleRemoveRecent(q)}
                          className="flex items-center justify-center size-4 rounded-full bg-muted-foreground/25 hover:bg-muted-foreground/40 transition-colors"
                        >
                          <X className="size-2.5 text-background" strokeWidth={2.5} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {recentPosts.length > 0 && (
                  <div>
                    {recentPosts.map((p) => (
                      <div key={p.slug} className="flex items-center gap-3 py-2.5">
                        <MapPin className="size-4 shrink-0 text-muted-foreground" />
                        <button
                          onClick={() => navigatePost(p.title, p.slug, p.placeName)}
                          className="flex flex-col min-w-0 flex-1 text-sm text-left"
                        >
                          <span className="truncate">{p.placeName ?? p.title}</span>
                          {p.placeName && (
                            <span className="text-xs text-muted-foreground truncate">{p.title}</span>
                          )}
                        </button>
                        <button
                          onClick={() => handleRemoveRecentPost(p.slug)}
                          className="flex items-center justify-center size-4 rounded-full bg-muted-foreground/25 hover:bg-muted-foreground/40 transition-colors shrink-0"
                        >
                          <X className="size-2.5 text-background" strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            {popular.length > 0 ? (
              <section>
                <h2 className="font-semibold text-sm mb-3">Popular</h2>
                {(() => {
                  const mid = Math.ceil(popular.length / 2);
                  return (
                    <div className="grid grid-cols-2 gap-y-3">
                      <div className="space-y-3">
                        {popular.slice(0, mid).map((q, i) => (
                          <button
                            key={q}
                            onClick={() => navigateKeyword(q)}
                            className="flex items-center gap-3 w-full text-left"
                          >
                            <span className={`w-5 text-sm font-semibold shrink-0 ${i < 3 ? "text-brand" : "text-muted-foreground"}`}>
                              {i + 1}
                            </span>
                            <span className="text-sm truncate">{q}</span>
                          </button>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {popular.slice(mid).map((q, i) => (
                          <button
                            key={q}
                            onClick={() => navigateKeyword(q)}
                            className="flex items-center gap-3 w-full text-left"
                          >
                            <span className="w-5 text-sm font-semibold shrink-0 text-muted-foreground">
                              {mid + i + 1}
                            </span>
                            <span className="text-sm truncate">{q}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </section>
            ) : (
              <SearchSkeleton />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}
