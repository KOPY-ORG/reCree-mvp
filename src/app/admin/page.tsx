import Link from "next/link";
import { FileText, MapPin, Tag, Hash, ArrowRight, Users, Camera, Flag, Search, Bookmark, Heart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";

const STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: "임시저장",
  PUBLISHED: "발행됨",
};

const STATUS_COLORS: Record<PostStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
};

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  accent,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  href?: string;
  accent?: boolean;
}) {
  const content = (
    <div className="bg-white rounded-xl shadow-sm p-4 h-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 font-medium">{label}</p>
          <p className={`text-2xl font-bold tabular-nums mt-0.5 ${accent ? "text-red-500" : "text-zinc-900"}`}>
            {value.toLocaleString()}
          </p>
          {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${accent ? "bg-red-50" : "bg-zinc-100"}`}>
          <Icon className={`size-4 ${accent ? "text-red-400" : "text-zinc-500"}`} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block hover:opacity-80 transition-opacity h-full">{content}</Link>;
  }
  return content;
}

function SectionCard({ title, href, linkLabel, children }: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 shrink-0">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors">
            {linkLabel ?? "전체 보기"}
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export default async function AdminPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    totalPosts, publishedPosts,
    totalPlaces, totalTopics, totalTags,
    totalUsers, newUsersToday,
    totalRecreeshots,
    pendingReports,
    popularSearches,
    recentPosts,
    dauRaw,
    topSavedPosts,
    topSavedRecreeshots,
    topLikedRecreeshots,
  ] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    prisma.place.count(),
    prisma.topic.count(),
    prisma.tag.count(),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.reCreeshot.count({ where: { status: "ACTIVE" } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.popularSearch.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      take: 8,
    }),
    prisma.post.findMany({
      select: { id: true, titleKo: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.dailyActiveUser.groupBy({
      by: ["date"],
      _count: { userId: true },
      where: { date: { gte: sevenDaysAgo } },
      orderBy: { date: "asc" },
    }),
    prisma.post.findMany({
      where: { status: "PUBLISHED", saveCount: { gt: 0 } },
      select: { id: true, titleKo: true, saveCount: true },
      orderBy: { saveCount: "desc" },
      take: 5,
    }),
    prisma.reCreeshot.findMany({
      where: { status: "ACTIVE", saveCount: { gt: 0 } },
      select: { id: true, locationName: true, saveCount: true, user: { select: { nickname: true } } },
      orderBy: { saveCount: "desc" },
      take: 5,
    }),
    prisma.reCreeshot.findMany({
      where: { status: "ACTIVE", likeCount: { gt: 0 } },
      select: { id: true, locationName: true, likeCount: true, user: { select: { nickname: true } } },
      orderBy: { likeCount: "desc" },
      take: 5,
    }),
  ]);

  // 7일치 DAU 배열 생성 (빈 날짜는 0으로 채움)
  const dauMap = new Map(dauRaw.map((r) => [r.date.toISOString().slice(0, 10), r._count.userId]));
  const dauDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { label: `${d.getMonth() + 1}/${d.getDate()}`, count: dauMap.get(key) ?? 0 };
  });
  const dauMax = Math.max(...dauDays.map((d) => d.count), 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">대시보드</h1>
        <p className="text-sm text-zinc-500 mt-0.5">콘텐츠 및 사용자 현황을 한눈에 확인하세요.</p>
      </div>

      {/* 스탯 카드 2줄 */}
      <div className="grid grid-cols-8 gap-3">
        <StatCard label="전체 사용자" value={totalUsers} sub={`오늘 신규 ${newUsersToday}명`} icon={Users} href="/admin/users" />
        <StatCard label="리크리샷 (활성)" value={totalRecreeshots} icon={Camera} href="/admin/recreeshots" />
        <StatCard label="처리 대기 신고" value={pendingReports} sub={pendingReports > 0 ? "확인 필요" : "신고 없음"} icon={Flag} href="/admin/reports" accent={pendingReports > 0} />
        <StatCard label="인기 검색어" value={popularSearches.length} sub="활성 키워드 수" icon={Search} href="/admin/popular-searches" />
        <StatCard label="전체 포스트" value={totalPosts} sub={`발행됨 ${publishedPosts}개`} icon={FileText} href="/admin/posts" />
        <StatCard label="전체 장소" value={totalPlaces} icon={MapPin} href="/admin/places" />
        <StatCard label="토픽" value={totalTopics} icon={Tag} href="/admin/topics" />
        <StatCard label="태그" value={totalTags} icon={Hash} href="/admin/tags" />
      </div>

      {/* DAU 차트 + 스크랩 많은 포스트 */}
      <div className="grid grid-cols-3 gap-4">
        {/* DAU 차트 (2/3) */}
        <div className="col-span-2">
          <SectionCard title="일별 활성 사용자 (최근 7일)">
            <div className="px-5 py-5">
              <div className="flex items-end gap-3" style={{ height: "120px" }}>
                {dauDays.map((day) => (
                  <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-zinc-500 tabular-nums">{day.count}</span>
                    <div className="w-full rounded-t-md bg-zinc-100 flex items-end overflow-hidden" style={{ height: "80px" }}>
                      <div
                        className="w-full rounded-t-md bg-[#C8FF09]"
                        style={{ height: `${(day.count / dauMax) * 100}%`, minHeight: day.count > 0 ? "4px" : "0" }}
                      />
                    </div>
                    <span className="text-[11px] text-zinc-400">{day.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* 스크랩 많은 포스트 (1/3) */}
        <SectionCard title="스크랩 많은 포스트" href="/admin/posts" linkLabel="전체 보기">
          {topSavedPosts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">데이터 없음</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {topSavedPosts.map((post, idx) => (
                <Link
                  key={post.id}
                  href={`/admin/posts/${post.id}/edit`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-xs font-bold text-zinc-300 w-4 tabular-nums shrink-0">{idx + 1}</span>
                  <span className="text-sm text-zinc-800 truncate flex-1">{post.titleKo ?? "(제목 없음)"}</span>
                  <span className="text-xs font-semibold text-zinc-500 shrink-0 flex items-center gap-0.5">
                    <Bookmark className="size-3" />
                    {post.saveCount}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* 스크랩 많은 리크리샷 / 좋아요 많은 리크리샷 / 인기 검색어 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 스크랩 많은 리크리샷 */}
        <SectionCard title="스크랩 많은 리크리샷" href="/admin/recreeshots" linkLabel="전체 보기">
          {topSavedRecreeshots.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">데이터 없음</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {topSavedRecreeshots.map((shot, idx) => (
                <Link
                  key={shot.id}
                  href={`/explore/hall/${shot.id}`}
                  target="_blank"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-xs font-bold text-zinc-300 w-4 tabular-nums shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-800 truncate block">{shot.locationName ?? "(장소 없음)"}</span>
                    <span className="text-xs text-zinc-400">{shot.user.nickname ?? "익명"}</span>
                  </div>
                  <span className="text-xs font-semibold text-zinc-500 shrink-0 flex items-center gap-0.5">
                    <Bookmark className="size-3" />
                    {shot.saveCount}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* 좋아요 많은 리크리샷 */}
        <SectionCard title="좋아요 많은 리크리샷" href="/admin/recreeshots" linkLabel="전체 보기">
          {topLikedRecreeshots.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">데이터 없음</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {topLikedRecreeshots.map((shot, idx) => (
                <Link
                  key={shot.id}
                  href={`/explore/hall/${shot.id}`}
                  target="_blank"
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-xs font-bold text-zinc-300 w-4 tabular-nums shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-800 truncate block">{shot.locationName ?? "(장소 없음)"}</span>
                    <span className="text-xs text-zinc-400">{shot.user.nickname ?? "익명"}</span>
                  </div>
                  <span className="text-xs font-semibold text-rose-400 shrink-0 flex items-center gap-0.5">
                    <Heart className="size-3" />
                    {shot.likeCount}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* 인기 검색어 */}
        <SectionCard title="인기 검색어" href="/admin/popular-searches" linkLabel="관리">
          {popularSearches.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-400">등록된 검색어가 없습니다</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {popularSearches.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs font-bold text-zinc-300 w-4 tabular-nums">{idx + 1}</span>
                  <span className="text-sm text-zinc-800">{item.keyword}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* 최근 포스트 */}
      <SectionCard title="최근 포스트" href="/admin/posts" linkLabel="전체 보기">
        {recentPosts.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-zinc-400">등록된 포스트가 없습니다</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/admin/posts/${post.id}/edit`}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 transition-colors"
              >
                <span className="text-sm text-zinc-800 truncate flex-1 mr-4">{post.titleKo ?? "(제목 없음)"}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[post.status]}`}>
                    {STATUS_LABELS[post.status]}
                  </span>
                  <span className="text-xs text-zinc-400">{formatDate(post.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
