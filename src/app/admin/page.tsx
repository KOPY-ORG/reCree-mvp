import Link from "next/link";
import {
  ArrowRight, Search, Bookmark, Heart, Eye, ExternalLink, Star,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { PostStatus } from "@prisma/client";
import { DashboardTrendChart } from "./_components/DashboardTrendChart";

export const dynamic = "force-dynamic";

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC Date → KST 날짜 문자열 (YYYY-MM-DD) */
function toKSTDateKey(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

function groupByDate(items: { createdAt: Date }[], base: Date, days = 7) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = toKSTDateKey(item.createdAt);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const kst = new Date(d.getTime() + KST_OFFSET_MS);
    const key = kst.toISOString().slice(0, 10);
    const label = `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`;
    return { label, count: map.get(key) ?? 0 };
  });
}

// ─── UI 컴포넌트 ──────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PostStatus, string> = { DRAFT: "임시저장", PUBLISHED: "발행됨" };
const STATUS_COLORS: Record<PostStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
};

function KpiCard({
  label, value, sub, href, danger,
}: {
  label: string; value: number | string; sub?: string;
  href?: string; danger?: boolean;
}) {
  const inner = (
    <div className={`bg-white rounded-xl border px-4 py-3 ${danger ? "border-red-200 bg-red-50/20" : "border-zinc-100"}`}>
      <p className={`text-sm font-semibold mb-2 ${danger ? "text-red-600" : "text-zinc-700"}`}>{label}</p>
      <p className={`text-2xl font-bold tabular-nums leading-none ${danger ? "text-red-500" : "text-zinc-900"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub && <p className="text-xs text-zinc-500 mt-1.5">{sub}</p>}
    </div>
  );
  if (href) return <Link href={href} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">{inner}</Link>;
  return <div className="flex-1 min-w-0">{inner}</div>;
}

function SectionCard({ title, href, linkLabel, children, right }: {
  title: string; href?: string; linkLabel?: string;
  children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <div className="flex items-center gap-3">
          {right}
          {href && (
            <Link href={href} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors">
              {linkLabel ?? "전체 보기"} <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function RankList({ items, icon: Icon, countColor }: {
  items: { id: string; name: string; sub?: string; count: number; href?: string }[];
  icon: React.ElementType; countColor: string;
}) {
  if (items.length === 0) {
    return <div className="px-5 py-8 text-center text-sm text-zinc-500">데이터 없음</div>;
  }
  return (
    <div className="divide-y divide-zinc-50">
      {items.map((item, idx) => {
        const row = (
          <div className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50/80 transition-colors">
            <span className={`text-xs font-bold w-4 tabular-nums shrink-0 ${idx < 3 ? "text-zinc-700" : "text-zinc-400"}`}>
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-800 truncate">{item.name}</p>
              {item.sub && <p className="text-xs text-zinc-500 truncate">{item.sub}</p>}
            </div>
            <span className={`text-xs font-semibold shrink-0 flex items-center gap-1 ${countColor}`}>
              <Icon className="size-3" />
              {item.count.toLocaleString()}
            </span>
          </div>
        );
        return item.href ? (
          <Link key={item.id} href={item.href} target="_blank">{row}</Link>
        ) : (
          <div key={item.id}>{row}</div>
        );
      })}
    </div>
  );
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  // KST 기준 오늘 자정을 UTC Date로 계산
  const nowKST = new Date(Date.now() + KST_OFFSET_MS);
  const kstYear = nowKST.getUTCFullYear();
  const kstMonth = nowKST.getUTCMonth();
  const kstDate = nowKST.getUTCDate();

  const today = new Date(Date.UTC(kstYear, kstMonth, kstDate) - KST_OFFSET_MS);
  const sevenDaysAgo = new Date(Date.UTC(kstYear, kstMonth, kstDate - 6) - KST_OFFSET_MS);
  const thirtyDaysAgo = new Date(Date.UTC(kstYear, kstMonth, kstDate - 29) - KST_OFFSET_MS);

  const [
    totalUsers, newUsersToday,
    totalRecreeshots, newRecreeshotsWeek,
    pendingReports,
    publishedPosts,
    dauRaw,
    wauRaw,
    mauRaw,
    newUsersRaw, savesRaw, likesRaw,
    topViewedPosts, topSavedPosts,
    topSavedRecreeshots, topLikedRecreeshots,
    topScrapedEvents, topFollowedTopicsGrouped,
    topSearches,
    recentPosts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.reCreeshot.count({ where: { status: "ACTIVE" } }),
    prisma.reCreeshot.count({ where: { status: "ACTIVE", createdAt: { gte: sevenDaysAgo } } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.dailyActiveUser.groupBy({
      by: ["date"],
      _count: { userId: true },
      where: { date: { gte: sevenDaysAgo } },
      orderBy: { date: "asc" },
    }),
    // WAU: 최근 7일 순 사용자 수
    prisma.dailyActiveUser.groupBy({
      by: ["userId"],
      where: { date: { gte: sevenDaysAgo } },
    }),
    // MAU: 최근 30일 순 사용자 수
    prisma.dailyActiveUser.groupBy({
      by: ["userId"],
      where: { date: { gte: thirtyDaysAgo } },
    }),
    prisma.user.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
    prisma.save.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
    prisma.reCreeshotLike.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
    prisma.post.findMany({
      where: { status: "PUBLISHED", viewCount: { gt: 0 } },
      select: { id: true, titleEn: true, viewCount: true },
      orderBy: { viewCount: "desc" }, take: 5,
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED", saveCount: { gt: 0 } },
      select: { id: true, titleEn: true, saveCount: true },
      orderBy: { saveCount: "desc" }, take: 5,
    }),
    prisma.reCreeshot.findMany({
      where: { status: "ACTIVE", saveCount: { gt: 0 } },
      select: { id: true, locationName: true, saveCount: true, user: { select: { nickname: true } } },
      orderBy: { saveCount: "desc" }, take: 5,
    }),
    prisma.reCreeshot.findMany({
      where: { status: "ACTIVE", likeCount: { gt: 0 } },
      select: { id: true, locationName: true, likeCount: true, user: { select: { nickname: true } } },
      orderBy: { likeCount: "desc" }, take: 5,
    }),
    prisma.event.findMany({
      where: { saveCount: { gt: 0 } },
      select: {
        id: true, slug: true, saveCount: true, eventCollectionId: true,
        translations: { where: { locale: "en" }, select: { name: true } },
      },
      orderBy: { saveCount: "desc" }, take: 5,
    }),
    prisma.topicFollow.groupBy({
      by: ["topicId"],
      _count: { topicId: true },
      orderBy: { _count: { topicId: "desc" } },
      take: 5,
    }),
    prisma.searchLog.groupBy({
      by: ["query"],
      _count: { query: true },
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { _count: { query: "desc" } },
      take: 10,
    }),
    prisma.post.findMany({
      select: { id: true, titleEn: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" }, take: 6,
    }),
  ]);

  // ── 팔로우 Top 토픽: groupBy(topicId) 결과에 Topic.nameEn 조인 (순서는 groupBy 기준 보존) ──
  const followedTopicIds = topFollowedTopicsGrouped.map((g) => g.topicId);
  const followedTopics = followedTopicIds.length === 0
    ? []
    : await prisma.topic.findMany({
        where: { id: { in: followedTopicIds } },
        select: { id: true, nameEn: true },
      });
  const topicNameMap = new Map(followedTopics.map((t) => [t.id, t.nameEn]));
  const topFollowedTopics = topFollowedTopicsGrouped.map((g) => ({
    id: g.topicId,
    name: topicNameMap.get(g.topicId) ?? g.topicId,
    count: g._count.topicId,
  }));

  // ── 차트 데이터 ──
  const dauMap = new Map(dauRaw.map((r) => [toKSTDateKey(r.date), r._count.userId]));
  const dauDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const kst = new Date(d.getTime() + KST_OFFSET_MS);
    const key = kst.toISOString().slice(0, 10);
    return { label: `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`, count: dauMap.get(key) ?? 0 };
  });
  const newUsersDays = groupByDate(newUsersRaw, sevenDaysAgo);
  const savesDays = groupByDate(savesRaw, sevenDaysAgo);
  const likesDays = groupByDate(likesRaw, sevenDaysAgo);

  const chartLabels = dauDays.map((d) => d.label);
  const trendTabs = [
    {
      key: "dau", label: "DAU", color: "#a3e635",
      total: dauDays[dauDays.length - 1]?.count ?? 0,
      unit: "명",
      values: dauDays.map((d) => d.count),
    },
    {
      key: "signup", label: "신규 가입 (7일)", color: "#a78bfa",
      total: newUsersDays.reduce((s, d) => s + d.count, 0),
      unit: "명",
      values: newUsersDays.map((d) => d.count),
    },
    {
      key: "save", label: "스크랩 (7일)", color: "#38bdf8",
      total: savesDays.reduce((s, d) => s + d.count, 0),
      unit: "건",
      values: savesDays.map((d) => d.count),
    },
    {
      key: "like", label: "리크리샷 좋아요 (7일)", color: "#fb7185",
      total: likesDays.reduce((s, d) => s + d.count, 0),
      unit: "건",
      values: likesDays.map((d) => d.count),
    },
  ];

  // ── KPI 집계 ──
  const dauToday = dauDays[dauDays.length - 1]?.count ?? 0;
  const wau = wauRaw.length;
  const mau = mauRaw.length;
  const dauMauRatio = mau > 0 ? Math.round((dauToday / mau) * 100) : 0;
  const newUsersWeekTotal = newUsersDays.reduce((s, d) => s + d.count, 0);

  const todayLabel = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
    timeZone: "Asia/Seoul",
  });

  const externalTools = [
    { href: "https://analytics.google.com", label: "Google Analytics", color: "text-orange-500" },
    { href: "https://search.google.com/search-console", label: "Search Console", color: "text-blue-500" },
    { href: "https://vercel.com/analytics", label: "Vercel Analytics", color: "text-zinc-600" },
  ];

  return (
    <div className="p-6 space-y-5">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">대시보드</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{todayLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          {externalTools.map((t) => (
            <a
              key={t.href}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${t.color} hover:bg-zinc-100 transition-colors`}
            >
              {t.label}
              <ExternalLink className="size-3 opacity-50" />
            </a>
          ))}
        </div>
      </div>

      {/* ── KPI 카드 ── */}
      <div className="flex gap-2">
        <KpiCard label="전체 사용자" value={totalUsers} sub={`오늘 신규 +${newUsersToday}`} href="/admin/users" />
        <KpiCard label="DAU" value={dauToday} sub="오늘 활성 사용자" />
        <KpiCard label="WAU" value={wau} sub="최근 7일 활성" />
        <KpiCard label="MAU" value={mau} sub="최근 30일 활성" />
        <KpiCard label="DAU / MAU" value={`${dauMauRatio}%`} sub={dauMauRatio >= 20 ? "참여도 양호" : dauMauRatio >= 10 ? "참여도 보통" : "참여도 낮음"} />
        <KpiCard label="주간 신규 가입" value={newUsersWeekTotal} sub="최근 7일" />
        <KpiCard label="활성 리크리샷" value={totalRecreeshots} sub={`이번 주 +${newRecreeshotsWeek}`} href="/admin/recreeshots" />
        <KpiCard label="신고 대기" value={pendingReports} sub={pendingReports > 0 ? "즉시 확인 필요" : "이상 없음"} href="/admin/recreeshots?status=reports" danger={pendingReports > 0} />
        <KpiCard label="발행 포스트" value={publishedPosts} sub="Published" href="/admin/posts" />
      </div>

      {/* ── 활동 추이 ── */}
      <SectionCard title="활동 추이 — 최근 7일">
        <DashboardTrendChart tabs={trendTabs} labels={chartLabels} />
      </SectionCard>

      {/* ── 랭킹 6종 (3열 x 2행) ── */}
      <div className="grid grid-cols-3 gap-4">
        <SectionCard title="조회수 Top 포스트" href="/admin/posts" linkLabel="전체">
          <RankList
            items={topViewedPosts.map((p) => ({
              id: p.id, name: p.titleEn ?? "(제목 없음)", count: p.viewCount,
              href: `/admin/posts/${p.id}/edit`,
            }))}
            icon={Eye} countColor="text-amber-500"
          />
        </SectionCard>

        <SectionCard title="스크랩 Top 포스트" href="/admin/posts" linkLabel="전체">
          <RankList
            items={topSavedPosts.map((p) => ({
              id: p.id, name: p.titleEn ?? "(제목 없음)", count: p.saveCount,
              href: `/admin/posts/${p.id}/edit`,
            }))}
            icon={Bookmark} countColor="text-sky-500"
          />
        </SectionCard>

        <SectionCard title="스크랩 Top 리크리샷" href="/admin/recreeshots" linkLabel="전체">
          <RankList
            items={topSavedRecreeshots.map((s) => ({
              id: s.id, name: s.locationName ?? "(장소 없음)",
              sub: s.user.nickname ?? "익명", count: s.saveCount,
              href: `/recreeshot/${s.id}`,
            }))}
            icon={Bookmark} countColor="text-sky-500"
          />
        </SectionCard>

        <SectionCard title="좋아요 Top 리크리샷" href="/admin/recreeshots" linkLabel="전체">
          <RankList
            items={topLikedRecreeshots.map((s) => ({
              id: s.id, name: s.locationName ?? "(장소 없음)",
              sub: s.user.nickname ?? "익명", count: s.likeCount,
              href: `/recreeshot/${s.id}`,
            }))}
            icon={Heart} countColor="text-rose-500"
          />
        </SectionCard>

        <SectionCard title="스크랩 Top 이벤트" href="/admin/events" linkLabel="전체">
          <RankList
            items={topScrapedEvents.map((e) => ({
              id: e.id, name: e.translations[0]?.name ?? e.slug, count: e.saveCount,
              href: `/admin/events/${e.eventCollectionId}/${e.id}/edit`,
            }))}
            icon={Bookmark} countColor="text-sky-500"
          />
        </SectionCard>

        <SectionCard title="팔로우 Top 토픽" href="/admin/categories?tab=topic" linkLabel="전체">
          <RankList
            items={topFollowedTopics.map((t) => ({
              id: t.id, name: t.name, count: t.count,
            }))}
            icon={Star} countColor="text-violet-500"
          />
        </SectionCard>
      </div>

      {/* ── 하단: 검색어 + 최근 포스트 ── */}
      <div className="grid grid-cols-3 gap-4">
        <SectionCard title="인기 검색어 (30일)">
          {topSearches.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-zinc-500">
              검색 기록이 없습니다
            </div>
          ) : (
            <div className="divide-y divide-zinc-50 py-1">
              {topSearches.map((item, idx) => (
                <div key={item.query} className="flex items-center gap-3 px-5 py-2.5">
                  <span className={`text-xs font-bold w-4 tabular-nums shrink-0 ${idx < 3 ? "text-zinc-700" : "text-zinc-400"}`}>
                    {idx + 1}
                  </span>
                  <span className="text-sm text-zinc-800 flex-1 truncate">{item.query}</span>
                  <span className="text-xs text-zinc-500 shrink-0 flex items-center gap-1">
                    <Search className="size-3" />
                    {item._count.query}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="col-span-2">
          <SectionCard title="최근 포스트" href="/admin/posts" linkLabel="전체 보기">
            {recentPosts.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-zinc-500">포스트 없음</div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {recentPosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/admin/posts/${post.id}/edit`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50/80 transition-colors"
                  >
                    <span className="text-sm text-zinc-800 truncate flex-1 mr-4">
                      {post.titleEn ?? "(제목 없음)"}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[post.status]}`}>
                        {STATUS_LABELS[post.status]}
                      </span>
                      <span className="text-xs text-zinc-500">{formatDate(post.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

    </div>
  );
}
