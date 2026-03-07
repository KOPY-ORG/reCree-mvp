import Link from "next/link";
import Image from "next/image";
import { Bookmark, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ─── 색상 헬퍼 (home page와 동일 패턴) ──────────────────────────────────────

const DEFAULT_COLOR = "#C6FD09";
const DEFAULT_TEXT = "#000000";

type ColorNode = {
  colorHex?: string | null;
  colorHex2?: string | null;
  gradientDir?: string;
  gradientStop?: number;
  textColorHex?: string | null;
  parent?: ColorNode | null;
};

function resolveTopicColors(node: ColorNode) {
  if (node.colorHex) {
    return {
      colorHex: node.colorHex,
      colorHex2: node.colorHex2 ?? null,
      gradientDir: node.gradientDir ?? "to bottom",
      gradientStop: node.gradientStop ?? 150,
      textColorHex: node.textColorHex ?? DEFAULT_TEXT,
    };
  }
  if (node.parent) return resolveTopicColors(node.parent);
  return { colorHex: DEFAULT_COLOR, colorHex2: null, gradientDir: "to bottom", gradientStop: 150, textColorHex: DEFAULT_TEXT };
}

type TagGroupColorMap = Map<string, { colorHex: string; colorHex2: string | null; gradientDir: string; gradientStop: number; textColorHex: string }>;

type ResolvedLabel = {
  text: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
};

function labelBackground(label: ResolvedLabel): string {
  return label.colorHex2
    ? `linear-gradient(${label.gradientDir}, ${label.colorHex}, ${label.colorHex2} ${label.gradientStop}%)`
    : label.colorHex;
}

// ─── 데이터 조회 ─────────────────────────────────────────────────────────────

async function getExplorePosts() {
  return prisma.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      titleEn: true,
      subtitleEn: true,
      thumbnailUrl: true,
      postTopics: {
        where: { isVisible: true },
        orderBy: { displayOrder: "asc" },
        select: {
          topic: {
            select: {
              nameEn: true,
              colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
              parent: {
                select: {
                  colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
                  parent: {
                    select: {
                      colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
                      parent: { select: { colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      postTags: {
        where: { isVisible: true },
        orderBy: { displayOrder: "asc" },
        select: {
          tag: { select: { name: true, group: true, colorHex: true, colorHex2: true, textColorHex: true } },
        },
      },
    },
  });
}

type ExplorePost = Awaited<ReturnType<typeof getExplorePosts>>[number];

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function PostLabels({ post, tagGroupMap }: { post: ExplorePost; tagGroupMap: TagGroupColorMap }) {
  const labels: ResolvedLabel[] = [];

  for (const { topic } of post.postTopics) {
    labels.push({ text: topic.nameEn, ...resolveTopicColors(topic) });
  }
  for (const { tag } of post.postTags) {
    const gc = tagGroupMap.get(tag.group);
    labels.push({
      text: tag.name,
      colorHex: tag.colorHex ?? gc?.colorHex ?? DEFAULT_COLOR,
      colorHex2: tag.colorHex ? (tag.colorHex2 ?? null) : (gc?.colorHex2 ?? null),
      gradientDir: gc?.gradientDir ?? "to bottom",
      gradientStop: gc?.gradientStop ?? 150,
      textColorHex: tag.textColorHex ?? gc?.textColorHex ?? DEFAULT_TEXT,
    });
  }

  const visible = labels.slice(0, 3);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {visible.map((label, i) => (
        <span
          key={i}
          className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none"
          style={{ background: labelBackground(label), color: label.textColorHex }}
        >
          {label.text}
        </span>
      ))}
    </div>
  );
}

function PostListItem({ post, tagGroupMap }: { post: ExplorePost; tagGroupMap: TagGroupColorMap }) {
  return (
    <Link
      href={`/posts/${post.slug}`}
      className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
    >
      {/* 썸네일 */}
      <div className="relative size-[88px] shrink-0 rounded-lg overflow-hidden bg-muted">
        {post.thumbnailUrl ? (
          <Image
            src={post.thumbnailUrl}
            alt={post.titleEn}
            fill
            className="object-cover"
            sizes="88px"
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm line-clamp-2 leading-snug">{post.titleEn}</p>
        {post.subtitleEn && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{post.subtitleEn}</p>
        )}
        <PostLabels post={post} tagGroupMap={tagGroupMap} />
      </div>

      {/* 북마크 아이콘 */}
      <Bookmark className="size-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}

function RecreeshotInlineSection({
  shots,
}: {
  shots: { id: string; imageUrl: string; matchScore: number | null; showBadge: boolean }[];
}) {
  if (shots.length === 0) return null;
  return (
    <div className="py-4 border-b border-border/50">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-sm">See How They reCreated</p>
        <Link
          href="/explore?tab=hall"
          className="text-xs text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
        >
          more <ChevronRight className="size-3" />
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {shots.map((shot) => (
          <div key={shot.id} className="snap-start shrink-0 w-[90px]">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
              <Image
                src={shot.imageUrl}
                alt="recreeshot"
                fill
                className="object-cover"
                sizes="90px"
              />
              {shot.matchScore != null && shot.showBadge && (
                <span className="absolute top-1.5 right-1.5 bg-brand text-black text-[10px] font-bold px-1 py-0.5 rounded-full leading-none">
                  {Math.round(shot.matchScore)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "posts" } = await searchParams;

  const [tagGroupConfigs, recreeshots] = await Promise.all([
    prisma.tagGroupConfig.findMany({
      select: { group: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true },
    }),
    prisma.reCreeshot.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: { id: true, imageUrl: true, matchScore: true, showBadge: true },
    }),
  ]);

  const tagGroupMap: TagGroupColorMap = new Map(tagGroupConfigs.map((c) => [c.group, c]));

  const posts = tab === "posts" ? await getExplorePosts() : [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* 탭 */}
      <div className="flex border-b border-border sticky top-0 bg-background z-10">
        <Link
          href="?tab=posts"
          className={`flex-1 text-center py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "posts"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Posts
        </Link>
        <Link
          href="?tab=hall"
          className={`flex-1 text-center py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "hall"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Hall
        </Link>
      </div>

      {/* Posts 탭 */}
      {tab === "posts" && (
        <div className="px-4">
          {posts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              아직 포스트가 없습니다.
            </div>
          ) : (
            <>
              {/* 처음 3개 포스트 */}
              {posts.slice(0, 3).map((post) => (
                <PostListItem key={post.id} post={post} tagGroupMap={tagGroupMap} />
              ))}

              {/* 리크리샷 인라인 섹션 */}
              {recreeshots.length > 0 && (
                <RecreeshotInlineSection shots={recreeshots.slice(0, 6)} />
              )}

              {/* 나머지 포스트 */}
              {posts.slice(3).map((post) => (
                <PostListItem key={post.id} post={post} tagGroupMap={tagGroupMap} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Hall 탭 */}
      {tab === "hall" && (
        <div className="px-4 py-4">
          {recreeshots.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
              아직 리크리샷이 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {recreeshots.map((shot) => (
                <div key={shot.id} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={shot.imageUrl}
                    alt="recreeshot"
                    fill
                    className="object-cover"
                    sizes="(max-width: 672px) 50vw, 336px"
                  />
                  {shot.matchScore != null && shot.showBadge && (
                    <span className="absolute top-2 right-2 bg-brand text-black text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {Math.round(shot.matchScore)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
