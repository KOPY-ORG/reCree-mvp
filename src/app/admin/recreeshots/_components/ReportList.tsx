"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { dismissReport, resolveReport, restoreReport } from "../_actions/recreeshot-actions";
import { REASON_LABEL, REPORT_STATUS_BADGE } from "@/lib/report-constants";
import type { ReportReason, ReportStatus, ReCreeshotStatus } from "@prisma/client";

export type ReportRow = {
  id: string;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  reporter: { email: string } | null;
  reCreeshot: {
    id: string;
    imageUrl: string;
    status: ReCreeshotStatus;
  } | null;
};

const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING:   "미처리",
  DISMISSED: "신고 기각",
  RESOLVED:  "숨김 처리됨",
};

const SHOT_STATUS_BADGE: Record<ReCreeshotStatus, string> = {
  ACTIVE:       "bg-green-50 text-green-600",
  REPORTED:     "bg-orange-50 text-orange-600",
  HIDDEN:       "bg-zinc-100 text-zinc-500",
  REPORT_HIDDEN:"bg-red-100 text-red-600",
  DELETED:      "bg-zinc-100 text-zinc-400",
};

const SHOT_STATUS_LABEL: Record<ReCreeshotStatus, string> = {
  ACTIVE:       "공개",
  REPORTED:     "신고됨",
  HIDDEN:       "숨김",
  REPORT_HIDDEN:"신고로 숨김",
  DELETED:      "삭제됨",
};

export function ReportList({ rows }: { rows: ReportRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [localRows, setLocalRows] = useState(rows);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function optimisticUpdate(id: string, updates: Partial<ReportRow>) {
    setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function handleDismiss(id: string) {
    optimisticUpdate(id, { status: "DISMISSED", resolvedAt: new Date() });
    startTransition(() => dismissReport(id));
  }

  function handleResolveConfirm(id: string) {
    setConfirmingId(null);
    optimisticUpdate(id, {
      status: "RESOLVED",
      resolvedAt: new Date(),
      reCreeshot: localRows.find((r) => r.id === id)?.reCreeshot
        ? { ...localRows.find((r) => r.id === id)!.reCreeshot!, status: "REPORT_HIDDEN" }
        : null,
    });
    startTransition(() => resolveReport(id));
  }

  function handleRestore(id: string) {
    optimisticUpdate(id, {
      status: "PENDING",
      resolvedAt: null,
      reCreeshot: localRows.find((r) => r.id === id)?.reCreeshot
        ? { ...localRows.find((r) => r.id === id)!.reCreeshot!, status: "REPORTED" }
        : null,
    });
    startTransition(() => restoreReport(id));
  }

  return (
    <div className="mt-4 rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[72px]">리크리샷</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">콘텐츠 상태</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">신고자</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">신고 사유</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">상세 내용</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">신고일</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">처리일</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">처리 상태</th>
              <th className="px-4 py-3 w-[220px]" />
            </tr>
          </thead>
          <tbody>
            {localRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  신고 내역이 없습니다.
                </td>
              </tr>
            )}
            {localRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-zinc-100 last:border-b-0 transition-colors hover:bg-zinc-50"
              >
                {/* 리크리샷 썸네일 */}
                <td className="px-4 py-3">
                  {row.reCreeshot ? (
                    <Link href={`/explore/hall/${row.reCreeshot.id}`} target="_blank" rel="noopener noreferrer">
                      <div className="relative w-10 aspect-[4/5] rounded overflow-hidden bg-muted hover:opacity-80 transition-opacity">
                        <Image src={row.reCreeshot.imageUrl} alt="recreeshot" fill className="object-cover" sizes="40px" />
                      </div>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>

                {/* 콘텐츠 현재 상태 */}
                <td className="px-4 py-3">
                  {row.reCreeshot ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${SHOT_STATUS_BADGE[row.reCreeshot.status]}`}>
                      {SHOT_STATUS_LABEL[row.reCreeshot.status]}
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

                {/* 처리일 */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {row.resolvedAt ? formatDate(row.resolvedAt) : <span className="text-muted-foreground/40">—</span>}
                </td>

                {/* 처리 상태 */}
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
                        <span className="text-xs text-zinc-500 mr-1">콘텐츠가 숨김 처리됩니다.</span>
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
                          숨김 확인
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
                          신고 기각
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
                        title={row.status === "RESOLVED" ? "미처리로 되돌리기 (콘텐츠 공개 복원)" : "미처리로 되돌리기"}
                      >
                        미처리로 되돌리기
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
