"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { dismissReport, resolveReport } from "../_actions/recreeshot-actions";
import type { ReportReason, ReportStatus } from "@prisma/client";

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
  } | null;
};

const REASON_LABEL: Record<ReportReason, string> = {
  SPAM: "스팸",
  INAPPROPRIATE: "부적절한 콘텐츠",
  HARASSMENT: "괴롭힘/욕설",
  FALSE_INFORMATION: "허위 정보",
  COPYRIGHT: "저작권 침해",
  OTHER: "기타",
};

const STATUS_BADGE: Record<ReportStatus, string> = {
  PENDING: "bg-orange-100 text-orange-700",
  DISMISSED: "bg-zinc-100 text-zinc-500",
  RESOLVED: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  PENDING: "미처리",
  DISMISSED: "기각",
  RESOLVED: "처리완료",
};

export function ReportList({ rows }: { rows: ReportRow[] }) {
  const [, startTransition] = useTransition();
  const [localRows, setLocalRows] = useState(rows);

  function optimisticUpdate(id: string, status: ReportStatus) {
    setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  function handleDismiss(id: string) {
    optimisticUpdate(id, "DISMISSED");
    startTransition(() => dismissReport(id));
  }

  function handleResolve(id: string) {
    optimisticUpdate(id, "RESOLVED");
    startTransition(() => resolveReport(id));
  }

  return (
    <div className="mt-4 rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[72px]">리크리샷</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">신고자</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">신고 사유</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">상세 내용</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">신고일</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">상태</th>
              <th className="w-24 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {localRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">
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
                        <Image
                          src={row.reCreeshot.imageUrl}
                          alt="recreeshot"
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>

                {/* 신고자 */}
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {row.reporter?.email ?? "—"}
                </td>

                {/* 신고 사유 */}
                <td className="px-4 py-3">
                  <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                    {REASON_LABEL[row.reason]}
                  </span>
                </td>

                {/* 상세 내용 */}
                <td className="px-4 py-3 max-w-[200px]">
                  {row.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">{row.description}</p>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>

                {/* 신고일 */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(row.createdAt)}
                </td>

                {/* 상태 */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE[row.status]}`}>
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>

                {/* 액션 */}
                <td className="px-2 py-3">
                  {row.status === "PENDING" && (
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleDismiss(row.id)}
                        title="기각"
                      >
                        <X className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600 hover:text-green-700"
                        onClick={() => handleResolve(row.id)}
                        title="처리완료 (숨김)"
                      >
                        <Check className="size-3.5" />
                      </Button>
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
