"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  ACTIVE: "bg-green-100 text-green-700",
  REPORTED: "bg-orange-100 text-orange-700",
  HIDDEN: "bg-zinc-100 text-zinc-500",
  DELETED: "bg-red-100 text-red-600",
};

const STATUS_LABEL: Record<ReCreeshotStatus, string> = {
  ACTIVE: "활성",
  REPORTED: "신고됨",
  HIDDEN: "숨김",
  DELETED: "삭제됨",
};

function formatDate(d: Date) {
  const date = new Date(d);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
}

export function RecreeshotTable({ rows }: { rows: RecreeshotRow[] }) {
  const [, startTransition] = useTransition();
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">사용자</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">장소</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">포스트</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">라벨</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap w-[90px]">점수</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">등록일</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">상태</th>
              <th className="w-20 px-2 py-3" />
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
                      <Image
                        src={row.imageUrl}
                        alt="recreeshot"
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                  </Link>
                </td>

                {/* 사용자 */}
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {row.user?.email ?? "—"}
                </td>

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

                {/* 태그 */}
                <td className="px-4 py-3 min-w-[120px]">
                  <div className="flex flex-wrap gap-1">
                    {row.labelNames.length > 0 ? (
                      row.labelNames.slice(0, 3).map((name) => (
                        <span
                          key={name}
                          className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                        >
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
                  <div className="flex items-center justify-end gap-1">
                    {row.status === "ACTIVE" || row.status === "REPORTED" ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleHide(row.id)}
                        title="숨김 처리"
                      >
                        <EyeOff className="size-3.5" />
                      </Button>
                    ) : row.status === "HIDDEN" ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleRestore(row.id)}
                        title="복원"
                      >
                        <RotateCcw className="size-3.5" />
                      </Button>
                    ) : null}
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
