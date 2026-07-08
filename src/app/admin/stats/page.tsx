import { getCurrentUser } from "@/lib/auth";
import { getKpiStats } from "@/lib/stats-queries";

export const dynamic = "force-dynamic";

function KpiCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex-1 min-w-0 bg-white rounded-xl border border-zinc-100 px-4 py-3">
      <p className="text-sm font-semibold text-zinc-700 mb-2">{label}</p>
      <p className="text-2xl font-bold tabular-nums leading-none text-zinc-900">
        {value.toLocaleString()}
      </p>
      {sub && <p className="text-xs text-zinc-500 mt-1.5">{sub}</p>}
    </div>
  );
}

export default async function AdminStatsPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          접근 권한이 없습니다. 이 페이지는 관리자 전용입니다.
        </p>
      </div>
    );
  }

  let stats;
  try {
    stats = await getKpiStats();
  } catch {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-red-200">
          <p className="text-sm text-red-500">지표를 불러오는 데 실패했습니다.</p>
        </div>
      </div>
    );
  }

  const totalSaves = stats.savesByTarget.POST + stats.savesByTarget.RECREESHOT + stats.savesByTarget.EVENT;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">통계</h1>
        <p className="text-sm text-zinc-500 mt-0.5">전체 서비스 지표 총계</p>
      </div>

      <div className="flex gap-2">
        <KpiCard label="전체 사용자" value={stats.totalUsers} />
        <KpiCard label="전체 포스트" value={stats.totalPosts} />
        <KpiCard label="전체 좋아요" value={stats.totalLikes} />
        <KpiCard label="전체 댓글" value={stats.totalComments} />
        <KpiCard label="전체 조회수" value={stats.totalViews} />
        <KpiCard
          label="전체 저장"
          value={totalSaves}
          sub={`포스트 ${stats.savesByTarget.POST.toLocaleString()} · 리크리샷 ${stats.savesByTarget.RECREESHOT.toLocaleString()} · 이벤트 ${stats.savesByTarget.EVENT.toLocaleString()}`}
        />
      </div>
    </div>
  );
}
