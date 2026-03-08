"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Trash2, EyeOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setRecreeshotStatus, deleteRecreeshot } from "../_actions/recreeshot-actions";
import type { ReCreeshotStatus } from "@prisma/client";

export type RecreeshotRow = {
  id: string;
  imageUrl: string;
  matchScore: number | null;
  showBadge: boolean;
  status: ReCreeshotStatus;
  createdAt: Date;
  user: { email: string } | null;
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
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));
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

  function handleDelete(id: string) {
    setLocalRows((prev) => prev.filter((r) => r.id !== id));
    startTransition(() => deleteRecreeshot(id));
  }

  if (localRows.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-muted-foreground border border-dashed rounded-lg mt-4">
        해당 상태의 리크리샷이 없습니다.
      </div>
    );
  }

  return (
    <div className="mt-4 border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[80px]">이미지</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">사용자</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[100px]">점수</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[140px]">등록일</th>
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-[80px]">상태</th>
            <th className="px-4 py-2.5 w-[100px]" />
          </tr>
        </thead>
        <tbody>
          {localRows.map((row) => (
            <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
              {/* 썸네일 */}
              <td className="px-4 py-3">
                <a href={row.imageUrl} target="_blank" rel="noopener noreferrer">
                  <div className="relative w-10 aspect-[3/4] rounded overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity">
                    <Image
                      src={row.imageUrl}
                      alt="recreeshot"
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>
                </a>
              </td>

              {/* 사용자 */}
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {row.user?.email ?? "-"}
              </td>

              {/* matchScore */}
              <td className="px-4 py-3">
                {row.matchScore != null && row.showBadge ? (
                  <span className="inline-block bg-brand text-black text-xs font-bold px-2 py-0.5 rounded-full">
                    {Math.round(row.matchScore)}%
                  </span>
                ) : row.matchScore != null ? (
                  <span className="text-xs text-muted-foreground">{Math.round(row.matchScore)}%</span>
                ) : (
                  <span className="text-xs text-muted-foreground/40">-</span>
                )}
              </td>

              {/* 등록일 */}
              <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(row.createdAt)}</td>

              {/* 상태 */}
              <td className="px-4 py-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status]}`}>
                  {STATUS_LABEL[row.status]}
                </span>
              </td>

              {/* 액션 */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                  {row.status === "ACTIVE" || row.status === "REPORTED" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => handleHide(row.id)}
                      title="숨김"
                    >
                      <EyeOff className="size-3.5" />
                    </Button>
                  ) : row.status === "HIDDEN" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => handleRestore(row.id)}
                      title="복원"
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(row.id)}
                    title="삭제"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
