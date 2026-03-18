import { prisma } from "@/lib/prisma";
import { PostReportTable, type PostReportRow } from "./_components/PostReportTable";
import { ReportTabs } from "./_components/ReportTabs";
import type { ReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { label: "미처리",    value: "PENDING" },
  { label: "신고 기각", value: "DISMISSED" },
  { label: "비공개 처리됨", value: "RESOLVED" },
] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "PENDING" } = await searchParams;

  const [reports, counts] = await Promise.all([
    prisma.report.findMany({
      where: {
        postId: { not: null },
        status: status as ReportStatus,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
        reporter: { select: { email: true } },
        post: { select: { id: true, titleKo: true, slug: true, status: true } },
      },
    }),
    prisma.report.groupBy({
      by: ["status"],
      where: { postId: { not: null } },
      _count: true,
    }),
  ]);

  const countMap = new Map(counts.map((c) => [c.status, c._count]));

  const tabs = STATUS_TABS.map(({ label, value }) => ({
    label,
    value,
    count: countMap.get(value as ReportStatus) ?? 0,
    highlight: value === "PENDING",
  }));

  const rows: PostReportRow[] = reports.map((r) => ({
    id: r.id,
    reason: r.reason,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt,
    reporter: r.reporter,
    post: r.post,
  }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">포스트 신고 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          사용자가 신고한 포스트를 검토하고 처리합니다.
        </p>
      </div>

      <ReportTabs tabs={tabs} current={status} />
      {status === "PENDING" && (countMap.get("PENDING") ?? 0) > 0 && (
        <div className="mt-3 inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-lg">
          미처리 신고 {countMap.get("PENDING")}건이 있습니다.
        </div>
      )}
      <PostReportTable rows={rows} />
    </div>
  );
}
