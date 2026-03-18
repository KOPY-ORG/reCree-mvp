import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PostReportTable, type PostReportRow } from "./_components/PostReportTable";
import type { ReportStatus } from "@prisma/client";

const STATUS_TABS = [
  { label: "미처리", value: "PENDING" },
  { label: "기각됨", value: "DISMISSED" },
  { label: "처리완료", value: "RESOLVED" },
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
        post: { select: { id: true, titleKo: true, slug: true } },
      },
    }),
    prisma.report.groupBy({
      by: ["status"],
      where: { postId: { not: null } },
      _count: true,
    }),
  ]);

  const countMap = new Map(counts.map((c) => [c.status, c._count]));

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

      <div className="flex border-b border-zinc-200">
        {STATUS_TABS.map(({ label, value }) => (
          <Link
            key={value}
            href={`?status=${value}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
              status === value
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-400 hover:text-zinc-700"
            }`}
          >
            {label}
            {(countMap.get(value as ReportStatus) ?? 0) > 0 && (
              <span className={`text-xs font-normal ${value === "PENDING" && status !== "PENDING" ? "text-orange-500 font-semibold" : "text-muted-foreground"}`}>
                ({countMap.get(value as ReportStatus) ?? 0})
              </span>
            )}
          </Link>
        ))}
      </div>

      <PostReportTable rows={rows} />
    </div>
  );
}
