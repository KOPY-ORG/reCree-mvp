import Link from "next/link";
import { FileText, MapPin, Tag, Hash, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PostStatus } from "@prisma/client";

const STATUS_LABELS: Record<PostStatus, string> = {
  IMPORTED: "가져옴",
  AI_DRAFTED: "AI 초안",
  DRAFT: "임시저장",
  PUBLISHED: "발행됨",
};

const STATUS_COLORS: Record<PostStatus, string> = {
  IMPORTED: "bg-blue-100 text-blue-700",
  AI_DRAFTED: "bg-purple-100 text-purple-700",
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
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-zinc-900 tabular-nums mt-1">
            {value.toLocaleString()}
          </p>
          {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
        </div>
        <div className="size-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
          <Icon className="size-5 text-zinc-500" />
        </div>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const [totalPosts, publishedPosts, totalPlaces, totalTopics, totalTags, recentPosts] =
    await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.place.count(),
      prisma.topic.count(),
      prisma.tag.count(),
      prisma.post.findMany({
        select: { id: true, titleKo: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">대시보드</h1>
        <p className="text-sm text-zinc-500 mt-1">콘텐츠 현황을 한눈에 확인하세요.</p>
      </div>

      {/* 스탯 카드 */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="전체 포스트"
          value={totalPosts}
          sub={`발행됨 ${publishedPosts}개`}
          icon={FileText}
        />
        <StatCard label="전체 장소" value={totalPlaces} icon={MapPin} />
        <StatCard label="토픽" value={totalTopics} icon={Tag} />
        <StatCard label="태그" value={totalTags} icon={Hash} />
      </div>

      {/* 최근 포스트 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">최근 포스트</h2>
          <Link
            href="/admin/posts"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            전체 보기
            <ArrowRight className="size-3" />
          </Link>
        </div>

        {recentPosts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-400">
            등록된 포스트가 없습니다
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/admin/posts/${post.id}/edit`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors"
              >
                <span className="text-sm text-zinc-800 truncate flex-1 mr-4">
                  {post.titleKo ?? "(제목 없음)"}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[post.status]}`}
                  >
                    {STATUS_LABELS[post.status]}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {formatDate(post.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
