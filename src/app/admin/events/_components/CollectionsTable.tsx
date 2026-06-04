"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteCollection } from "../_actions/collection-actions";
import type { EventStatus } from "@prisma/client";
import { EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from "../_constants";

export type CollectionRow = {
  id: string;
  slug: string;
  status: EventStatus;
  createdAt: Date;
  translations: { name: string }[];
  _count: { events: number };
};

interface Props {
  collections: CollectionRow[];
}

export function CollectionsTable({ collections }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteCollection(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("컬렉션이 삭제되었습니다.");
        setDeleteTarget(null);
      }
    });
  };

  return (
    <>
      <div className="mt-4 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  컬렉션명 (ko)
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  슬러그
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  이벤트 수
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  상태
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  생성일
                </th>
                <th className="w-24 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {collections.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-sm text-muted-foreground"
                  >
                    등록된 컬렉션이 없습니다.{" "}
                    <Link
                      href="/admin/events/collections/new"
                      className="underline"
                    >
                      첫 컬렉션 만들기
                    </Link>
                  </td>
                </tr>
              )}
              {collections.map((col) => {
                const name = col.translations[0]?.name ?? col.slug;
                return (
                  <tr
                    key={col.id}
                    className="border-b border-zinc-100 last:border-b-0 transition-colors hover:bg-zinc-50 cursor-pointer"
                    onClick={() => router.push(`/admin/events/${col.id}`)}
                  >
                    {/* 컬렉션명 */}
                    <td className="px-4 py-3 min-w-[200px] font-medium">
                      {name}
                    </td>

                    {/* 슬러그 */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {col.slug}
                      </span>
                    </td>

                    {/* 이벤트 수 */}
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {col._count.events}개
                    </td>

                    {/* 상태 */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${EVENT_STATUS_COLORS[col.status]}`}
                      >
                        {EVENT_STATUS_LABELS[col.status]}
                      </span>
                    </td>

                    {/* 생성일 */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(col.createdAt)}
                    </td>

                    {/* 액션 */}
                    <td
                      className="px-2 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            router.push(
                              `/admin/events/collections/${col.id}/edit`,
                            )
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isPending}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setDeleteTarget({ id: col.id, name })
                              }
                            >
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 삭제 확인 Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isPending) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>컬렉션 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>
            을(를) 삭제하시겠습니까?
            <br />
            이벤트가 연결된 컬렉션은 삭제할 수 없습니다.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              삭제
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
