import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RecreeshotTable, type RecreeshotRow } from "./_components/RecreeshotTable";
import { ReportList, type ReportRow } from "./_components/ReportList";
import type { ReCreeshotStatus } from "@prisma/client";

const STATUS_TABS = [
  { label: "전체", value: "all" },
  { label: "활성", value: "ACTIVE" },
  { label: "신고됨", value: "REPORTED" },
  { label: "숨김", value: "HIDDEN" },
  { label: "신고 내역", value: "reports" },
] as const;

export default async function AdminRecreeshotsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;

  // 신고 내역 탭
  if (status === "reports") {
    const reports = await prisma.report.findMany({
      where: { reCreeshotId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        reporter: { select: { email: true } },
        reCreeshot: { select: { id: true, imageUrl: true } },
      },
    });

    const [totalCounts, pendingCount] = await Promise.all([
      prisma.reCreeshot.groupBy({ by: ["status"], _count: true }),
      prisma.report.count({ where: { reCreeshotId: { not: null }, status: "PENDING" } }),
    ]);

    const countMap = new Map(totalCounts.map((c) => [c.status, c._count]));
    const totalActive = countMap.get("ACTIVE") ?? 0;
    const totalReported = countMap.get("REPORTED") ?? 0;
    const totalHidden = countMap.get("HIDDEN") ?? 0;
    const totalAll = totalActive + totalReported + totalHidden;

    const tabCountMap: Record<string, number> = {
      all: totalAll,
      ACTIVE: totalActive,
      REPORTED: totalReported,
      HIDDEN: totalHidden,
      reports: pendingCount,
    };

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
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">recreeshot 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            사용자가 올린 리크리샷을 검토하고 관리합니다.
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
              {tabCountMap[value] > 0 && (
                <span className={`text-xs font-normal ${value === "reports" && status !== "reports" ? "text-orange-500 font-semibold" : "text-muted-foreground"}`}>
                  ({tabCountMap[value]})
                </span>
              )}
            </Link>
          ))}
        </div>

        <ReportList rows={rows} />
      </div>
    );
  }

  // 기존 리크리샷 목록 탭
  const where =
    status === "all"
      ? { status: { not: "DELETED" as ReCreeshotStatus } }
      : { status: status as ReCreeshotStatus };

  const [recreeshots, totalCounts, pendingReportCount] = await Promise.all([
    prisma.reCreeshot.findMany({
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
        reCreeshotTopics: {
          select: { topic: { select: { nameEn: true } } },
        },
        reCreeshotTags: {
          select: { tag: { select: { name: true } } },
        },
      },
    }),
    prisma.reCreeshot.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.report.count({ where: { reCreeshotId: { not: null }, status: "PENDING" } }),
  ]);

  const linkedPostIds = recreeshots
    .map((r) => r.linkedPostId)
    .filter((id): id is string => id !== null);

  const linkedPosts =
    linkedPostIds.length > 0
      ? await prisma.post.findMany({
          where: { id: { in: linkedPostIds } },
          select: { id: true, titleKo: true },
        })
      : [];

  const postMap = new Map(linkedPosts.map((p) => [p.id, p]));

  const countMap = new Map(totalCounts.map((c) => [c.status, c._count]));
  const totalActive = countMap.get("ACTIVE") ?? 0;
  const totalReported = countMap.get("REPORTED") ?? 0;
  const totalHidden = countMap.get("HIDDEN") ?? 0;
  const totalAll = totalActive + totalReported + totalHidden;

  const tabCountMap: Record<string, number> = {
    all: totalAll,
    ACTIVE: totalActive,
    REPORTED: totalReported,
    HIDDEN: totalHidden,
    reports: pendingReportCount,
  };

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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">recreeshot 관리</h1>
        <p className="text-sm text-muted-foreground mt-1">
          사용자가 올린 리크리샷을 검토하고 관리합니다.
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
            {tabCountMap[value] > 0 && (
              <span className={`text-xs font-normal ${value === "reports" && status !== "reports" ? "text-orange-500 font-semibold" : "text-muted-foreground"}`}>
                ({tabCountMap[value]})
              </span>
            )}
          </Link>
        ))}
      </div>

      <RecreeshotTable rows={rows} />
    </div>
  );
}
