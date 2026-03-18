"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { setRecreeshotStatus } from "../_actions/recreeshot-actions";
import type { ReCreeshotStatus } from "@prisma/client";

export type RecreeshotRow = {
  id: string;
  imageUrl: string;
  matchScore: number | null;
  showBadge: boolean;
  status: ReCreeshotStatus;
  createdAt: Date;
  user: { email: string } | null;
  place: { nameKo: string } | null;
  linkedPost: { id: string; titleKo: string } | null;
  labelNames: string[];
};

const STATUS_BADGE: Record<ReCreeshotStatus, string> = {
  ACTIVE:       "bg-green-100 text-green-700",
  REPORTED:     "bg-orange-100 text-orange-700",
  HIDDEN:       "bg-zinc-100 text-zinc-500",
  REPORT_HIDDEN:"bg-red-100 text-red-600",
  DELETED:      "bg-zinc-100 text-zinc-400",
};

const STATUS_LABEL: Record<ReCreeshotStatus, string> = {
  ACTIVE:       "공개",
  REPORTED:     "신고됨",
  HIDDEN:       "숨김",
  REPORT_HIDDEN:"신고로 숨김",
  DELETED:      "삭제됨",
};

export function RecreeshotTable({ rows }: { rows: RecreeshotRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [localRows, setLocalRows] = useState(rows);

  function optimisticUpdate(id: string, status: ReCreeshotStatus) {
    setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  function handleHide(id: string) {
    optimisticUpdate(id, "HIDDEN");
    startTransition(() => setRecreeshotStatus(id, "HIDDEN"));
  }

  function handleRestore(id: string) {
    optimisticUpdate(id, "ACTIVE");
    startTransition(() => setRecreeshotStatus(id, "ACTIVE"));
  }

  return (
    <div className="mt-4 rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[72px]">이미지</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">상태</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">사용자</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">장소</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">포스트</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">라벨</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap w-[90px]">점수</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">등록일</th>
              <th className="w-28 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {localRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-sm text-muted-foreground">
                  해당 상태의 리크리샷이 없습니다.
                </td>
              </tr>
            )}
            {localRows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-zinc-100 last:border-b-0 transition-colors hover:bg-zinc-50"
              >
                {/* 썸네일 */}
                <td className="px-4 py-3">
                  <Link href={`/explore/hall/${row.id}`} target="_blank" rel="noopener noreferrer">
                    <div className="relative w-10 aspect-[4/5] rounded overflow-hidden bg-muted hover:opacity-80 transition-opacity">
                      <Image src={row.imageUrl} alt="recreeshot" fill className="object-cover" sizes="40px" />
                    </div>
                  </Link>
                </td>

                {/* 상태 — 앞으로 이동해 한눈에 파악 */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE[row.status]}`}>
                    {STATUS_LABEL[row.status]}
                  </span>
                  {row.status === "REPORTED" && (
                    <p className="text-[10px] text-orange-500 mt-0.5 whitespace-nowrap">신고 처리 탭에서 조치</p>
                  )}
                </td>

                {/* 사용자 */}
                <td className="px-4 py-3 text-xs text-muted-foreground">{row.user?.email ?? "—"}</td>

                {/* 장소 */}
                <td className="px-4 py-3 min-w-[120px]">
                  {row.place ? (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {row.place.nameKo}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>

                {/* 포스트 */}
                <td className="px-4 py-3 min-w-[160px]">
                  {row.linkedPost ? (
                    <Link
                      href={`/admin/posts/${row.linkedPost.id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline line-clamp-1 max-w-[180px] block"
                      title={row.linkedPost.titleKo}
                    >
                      {row.linkedPost.titleKo}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>

                {/* 라벨 */}
                <td className="px-4 py-3 min-w-[120px]">
                  <div className="flex flex-wrap gap-1">
                    {row.labelNames.length > 0 ? (
                      row.labelNames.slice(0, 3).map((name) => (
                        <span key={name} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                    {row.labelNames.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{row.labelNames.length - 3}</span>
                    )}
                  </div>
                </td>

                {/* matchScore */}
                <td className="px-4 py-3">
                  {row.matchScore != null && row.showBadge ? (
                    <span className="inline-flex items-center bg-brand text-black text-xs font-bold px-2 py-0.5 rounded-full">
                      {Math.round(row.matchScore)}%
                    </span>
                  ) : row.matchScore != null ? (
                    <span className="text-xs text-muted-foreground">{Math.round(row.matchScore)}%</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </td>

                {/* 등록일 */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(row.createdAt)}</td>

                {/* 액션 */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end">
                    {(row.status === "ACTIVE" || row.status === "REPORTED") && (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleHide(row.id)}
                        className="text-xs h-7 px-2.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 border-0"
                      >
                        숨김 처리
                      </Button>
                    )}
                    {(row.status === "HIDDEN" || row.status === "REPORT_HIDDEN") && (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRestore(row.id)}
                        className="text-xs h-7 px-2.5 bg-green-100 hover:bg-green-200 text-green-700 border-0"
                      >
                        공개 복원
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
