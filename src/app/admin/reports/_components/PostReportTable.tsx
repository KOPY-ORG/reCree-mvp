"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { dismissPostReport, resolvePostReport, restorePostReport } from "../_actions/report-actions";
import { REASON_LABEL, REPORT_STATUS_BADGE } from "@/lib/report-constants";
import type { ReportReason, ReportStatus, PostStatus } from "@prisma/client";

export type PostReportRow = {
  id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: Date;
  reporter: { email: string } | null;
  post: { id: string; titleKo: string; slug: string; status: PostStatus } | null;
};

const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: "미처리",
  DISMISSED: "신고 기각",
  RESOLVED: "비공개 처리됨",
};

const POST_STATUS_BADGE: Record<PostStatus, string> = {
  PUBLISHED: "bg-green-50 text-green-600",
  DRAFT: "bg-zinc-100 text-zinc-500",
};

const POST_STATUS_LABEL: Record<PostStatus, string> = {
  PUBLISHED: "공개",
  DRAFT: "비공개 (숨김)",
};

export function PostReportTable({ rows }: { rows: PostReportRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [localRows, setLocalRows] = useState(rows);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function optimisticUpdate(id: string, updates: Partial<PostReportRow>) {
    setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function handleDismiss(id: string) {
    optimisticUpdate(id, { status: "DISMISSED" });
    startTransition(() => dismissPostReport(id));
  }

  function handleResolveConfirm(id: string) {
    setConfirmingId(null);
    optimisticUpdate(id, {
      status: "RESOLVED",
      post: localRows.find((r) => r.id === id)?.post
        ? { ...localRows.find((r) => r.id === id)!.post!, status: "DRAFT" }
        : null,
    });
    startTransition(() => resolvePostReport(id));
  }

  function handleRestore(id: string) {
    const row = localRows.find((r) => r.id === id);
    optimisticUpdate(id, {
      status: "PENDING",
      post: row?.post && row.status === "RESOLVED"
        ? { ...row.post, status: "PUBLISHED" }
        : row?.post ?? null,
    });
    startTransition(() => restorePostReport(id));
  }

  return (
    <div className="mt-4 rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">포스트</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">콘텐츠 상태</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">신고자</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">신고 사유</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">상세 내용</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">신고일</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">신고 상태</th>
              <th className="px-4 py-3 w-[180px]" />
            </tr>
          </thead>
          <tbody>
            {localRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  신고 내역이 없습니다.
                </td>
              </tr>
            )}
            {localRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-zinc-100 last:border-b-0 transition-colors hover:bg-zinc-50"
              >
                {/* 포스트 */}
                <td className="px-4 py-3 min-w-[180px]">
                  {row.post ? (
                    <div className="flex flex-col gap-0.5">
                      <Link
                        href={`/admin/posts/${row.post.id}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline line-clamp-2 max-w-[220px] block"
                        title={row.post.titleKo}
                      >
                        {row.post.titleKo}
                      </Link>
                      <Link
                        href={`/posts/${row.post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-muted-foreground hover:underline"
                      >
                        사용자 페이지 보기
                      </Link>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>

                {/* 콘텐츠 현재 상태 */}
                <td className="px-4 py-3">
                  {row.post ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${POST_STATUS_BADGE[row.post.status]}`}>
                      {POST_STATUS_LABEL[row.post.status]}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>

                {/* 신고자 */}
                <td className="px-4 py-3 text-xs text-muted-foreground">{row.reporter?.email ?? "—"}</td>

                {/* 신고 사유 */}
                <td className="px-4 py-3">
                  <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {REASON_LABEL[row.reason]}
                  </span>
                </td>

                {/* 상세 내용 */}
                <td className="px-4 py-3 max-w-[180px]">
                  {row.description
                    ? <p className="text-xs text-muted-foreground line-clamp-2">{row.description}</p>
                    : <span className="text-xs text-muted-foreground/40">—</span>
                  }
                </td>

                {/* 신고일 */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(row.createdAt)}</td>

                {/* 신고 상태 */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${REPORT_STATUS_BADGE[row.status]}`}>
                    {REPORT_STATUS_LABEL[row.status]}
                  </span>
                </td>

                {/* 액션 */}
                <td className="px-4 py-3">
                  {row.status === "PENDING" && (
                    confirmingId === row.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xs text-zinc-500 mr-1">포스트가 비공개로 전환됩니다.</span>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-500 bg-zinc-100 hover:bg-zinc-200 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleResolveConfirm(row.id)}
                          className="px-2.5 py-1.5 rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          확인
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDismiss(row.id)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-500 bg-zinc-100 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                        >
                          기각
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(row.id)}
                          className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors"
                        >
                          숨김 처리
                        </button>
                      </div>
                    )
                  )}
                  {(row.status === "DISMISSED" || row.status === "RESOLVED") && (
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRestore(row.id)}
                        className="px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-500 bg-zinc-100 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                      >
                        {row.status === "RESOLVED" ? "미처리로 되돌리기 (공개 복원)" : "미처리로 되돌리기"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
