"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { isExternalImage } from "@/lib/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { setRecreeshotStatus, adminDeleteRecreeshot } from "../_actions/recreeshot-actions";
import { RECREESHOT_STATUS_BADGE, RECREESHOT_STATUS_LABEL } from "../_constants";
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

export function RecreeshotTable({ rows }: { rows: RecreeshotRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [localRows, setLocalRows] = useState(rows);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

  function handleDelete(id: string) {
    setDeleteTarget(null);
    setLocalRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => adminDeleteRecreeshot(id));
  }

  return (
    <div className="mt-4 rounded-xl overflow-hidden shadow-sm bg-white">
      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-background rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-base">리크리샷을 삭제하시겠습니까?</p>
              <p className="text-sm text-muted-foreground">이미지 파일도 함께 삭제되며 복구할 수 없습니다.</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-0"
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
              >
                삭제
              </Button>
            </div>
          </div>
        </div>
      )}
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
                  <Link href={`/discover/hall/${row.id}`} target="_blank" rel="noopener noreferrer">
                    <div className="relative w-10 aspect-[4/5] rounded overflow-hidden bg-muted hover:opacity-80 transition-opacity">
                      <Image src={row.imageUrl} alt="recreeshot" fill unoptimized={isExternalImage(row.imageUrl)} className="object-cover" sizes="40px" />
                    </div>
                  </Link>
                </td>

                {/* 상태 — 앞으로 이동해 한눈에 파악 */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${RECREESHOT_STATUS_BADGE[row.status]}`}>
                    {RECREESHOT_STATUS_LABEL[row.status]}
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
                  <div className="flex items-center justify-end gap-1.5">
                    {row.status === "ACTIVE" && (
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
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => setDeleteTarget(row.id)}
                      className="text-xs h-7 px-2.5 bg-red-50 hover:bg-red-100 text-red-600 border-0"
                    >
                      삭제
                    </Button>
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
