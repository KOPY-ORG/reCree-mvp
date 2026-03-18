import { prisma } from "@/lib/prisma";
import { RecreeshotTable, type RecreeshotRow } from "./_components/RecreeshotTable";
import { ReportList, type ReportRow } from "./_components/ReportList";
import { RecreeshotTabs } from "./_components/RecreeshotTabs";
import type { ReCreeshotStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

// 탭: 전체 / 활성 / 숨김(HIDDEN+REPORT_HIDDEN) / 신고 처리
const STATUS_TABS = [
  { label: "전체",    value: "all" },
  { label: "활성",    value: "ACTIVE" },
  { label: "숨김",    value: "hidden" },
  { label: "신고 처리", value: "reports" },
] as const;

export default async function AdminRecreeshotsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;

  const [totalCounts, pendingReportCount] = await Promise.all([
    prisma.reCreeshot.groupBy({ by: ["status"], _count: true }),
    prisma.report.count({ where: { reCreeshotId: { not: null }, status: "PENDING" } }),
  ]);

  const countMap = new Map(totalCounts.map((c) => [c.status, c._count]));
  const totalActive       = countMap.get("ACTIVE") ?? 0;
  const totalReported     = countMap.get("REPORTED") ?? 0;
  const totalHidden       = countMap.get("HIDDEN") ?? 0;
  const totalReportHidden = countMap.get("REPORT_HIDDEN") ?? 0;
  const totalAll          = totalActive + totalReported + totalHidden + totalReportHidden;

  const tabCountMap: Record<string, number> = {
    all:     totalAll,
    ACTIVE:  totalActive,
    hidden:  totalHidden + totalReportHidden,
    reports: pendingReportCount,
  };

  const tabs = STATUS_TABS.map(({ label, value }) => ({
    label,
    value,
    count: tabCountMap[value] ?? 0,
    highlight: value === "reports",
  }));

  const header = (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">리크리샷 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          사용자가 올린 리크리샷을 검토하고 관리합니다.
        </p>
      </div>
      <RecreeshotTabs tabs={tabs} current={status} />
    </div>
  );

  // 신고 처리 탭
  if (status === "reports") {
    const reports = await prisma.report.findMany({
      where: { reCreeshotId: { not: null } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }], // 미처리 먼저
      take: 100,
      select: {
        id: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        reporter: { select: { email: true } },
        reCreeshot: { select: { id: true, imageUrl: true, status: true } },
      },
    });

    const rows: ReportRow[] = reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      reporter: r.reporter,
      reCreeshot: r.reCreeshot,
    }));

    return (
      <div>
        {header}
        <div className="px-8 -mt-4">
          {pendingReportCount > 0 && (
            <div className="mb-3 inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-lg">
              미처리 신고 {pendingReportCount}건이 있습니다.
            </div>
          )}
          <ReportList rows={rows} />
        </div>
      </div>
    );
  }

  // 콘텐츠 목록 탭 (전체 / 활성 / 숨김)
  let where: { status: ReCreeshotStatus | { not: ReCreeshotStatus } | { in: ReCreeshotStatus[] } };
  if (status === "all") {
    where = { status: { not: "DELETED" } };
  } else if (status === "hidden") {
    where = { status: { in: ["HIDDEN", "REPORT_HIDDEN"] } };
  } else {
    where = { status: status as ReCreeshotStatus };
  }

  const recreeshots = await prisma.reCreeshot.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      imageUrl: true,
      matchScore: true,
      showBadge: true,
      status: true,
      createdAt: true,
      linkedPostId: true,
      user: { select: { email: true } },
      place: { select: { nameKo: true } },
      reCreeshotTopics: { select: { topic: { select: { nameEn: true } } } },
      reCreeshotTags: { select: { tag: { select: { name: true } } } },
    },
  });

  const linkedPostIds = recreeshots
    .map((r) => r.linkedPostId)
    .filter((id): id is string => id !== null);

  const linkedPosts = linkedPostIds.length > 0
    ? await prisma.post.findMany({
        where: { id: { in: linkedPostIds } },
        select: { id: true, titleKo: true },
      })
    : [];

  const postMap = new Map(linkedPosts.map((p) => [p.id, p]));

  const rows: RecreeshotRow[] = recreeshots.map((r) => ({
    id: r.id,
    imageUrl: r.imageUrl,
    matchScore: r.matchScore,
    showBadge: r.showBadge,
    status: r.status,
    createdAt: r.createdAt,
    user: r.user,
    place: r.place,
    linkedPost: r.linkedPostId ? (postMap.get(r.linkedPostId) ?? null) : null,
    labelNames: [
      ...r.reCreeshotTopics.map((t) => t.topic.nameEn),
      ...r.reCreeshotTags.map((t) => t.tag.name),
    ],
  }));

  return (
    <div>
      {header}
      <div className="px-8 -mt-4">
        <RecreeshotTable rows={rows} />
      </div>
    </div>
  );
}
