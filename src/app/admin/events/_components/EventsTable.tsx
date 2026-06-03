"use client";

import { useState, useTransition } from "react";
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
import { deleteEvent } from "../_actions/event-actions";
import type { EventStatus, EventCategory } from "@prisma/client";
import {
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
  EVENT_CATEGORY_LABELS,
} from "../_constants";

export type EventRow = {
  id: string;
  status: EventStatus;
  category: EventCategory;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  place: { nameKo: string } | null;
  translations: { name: string }[];
};

interface Props {
  events: EventRow[];
  isFiltered: boolean;
  collectionId: string;
}

function formatDateRange(start: Date, end: Date): string {
  const s = formatDate(start);
  const e = formatDate(end);
  return `${s} ~ ${e}`;
}

export function EventsTable({ events, isFiltered, collectionId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteEvent(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("이벤트가 삭제되었습니다.");
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
                  이벤트명 (ko)
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  카테고리
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  장소
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  기간
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
              {events.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-sm text-muted-foreground"
                  >
                    {isFiltered
                      ? "조건에 맞는 이벤트가 없습니다."
                      : "등록된 이벤트가 없습니다. 첫 이벤트를 만들어보세요."}
                  </td>
                </tr>
              )}
              {events.map((event) => {
                const name = event.translations[0]?.name ?? "—";
                return (
                  <tr
                    key={event.id}
                    className="border-b border-zinc-100 last:border-b-0 transition-colors hover:bg-zinc-50"
                  >
                    {/* 이벤트명 */}
                    <td className="px-4 py-3 min-w-[200px] font-medium">
                      {name}
                    </td>

                    {/* 카테고리 */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {EVENT_CATEGORY_LABELS[event.category]}
                    </td>

                    {/* 장소 */}
                    <td className="px-4 py-3 min-w-[120px]">
                      {event.place ? (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {event.place.nameKo}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* 기간 */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateRange(event.startDate, event.endDate)}
                    </td>

                    {/* 상태 */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${EVENT_STATUS_COLORS[event.status]}`}
                      >
                        {EVENT_STATUS_LABELS[event.status]}
                      </span>
                    </td>

                    {/* 생성일 */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(event.createdAt)}
                    </td>

                    {/* 액션 */}
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            router.push(
                              `/admin/events/${collectionId}/${event.id}/edit`,
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
                                setDeleteTarget({ id: event.id, name })
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
            <DialogTitle>이벤트 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {deleteTarget?.name}
            </span>
            을(를) 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
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
