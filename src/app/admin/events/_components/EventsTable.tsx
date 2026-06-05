"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Loader2, MoreHorizontal, Pencil } from "lucide-react";
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
  bannerImageUrl: string | null;
  places: { place: { nameKo: string | null; nameEn: string | null } }[];
  translations: { name: string }[];
};

interface Props {
  events: EventRow[];
  isFiltered: boolean;
  collectionId: string;
}

function formatDateRange(start: Date, end: Date): string {
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

export function EventsGallery({ events, isFiltered, collectionId }: Props) {
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

  if (events.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-zinc-200 p-16 text-center text-sm text-muted-foreground">
        {isFiltered
          ? "조건에 맞는 이벤트가 없습니다."
          : "등록된 이벤트가 없습니다. 첫 이벤트를 만들어보세요."}
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => {
          const name = event.translations[0]?.name ?? "(제목 없음)";
          return (
            <div
              key={event.id}
              className="flex flex-col overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm"
            >
              {/* 배너 이미지 */}
              <div className="relative aspect-[16/9] shrink-0 bg-zinc-100">
                {event.bannerImageUrl ? (
                  <img
                    src={event.bannerImageUrl}
                    alt={name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-zinc-300">
                    <ImageIcon className="h-8 w-8" />
                    <span className="text-xs">
                      {EVENT_CATEGORY_LABELS[event.category]}
                    </span>
                  </div>
                )}
                {/* 상태 뱃지 */}
                <span
                  className={`absolute right-2 top-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${EVENT_STATUS_COLORS[event.status]}`}
                >
                  {EVENT_STATUS_LABELS[event.status]}
                </span>
              </div>

              {/* 카드 하단 */}
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-snug">
                      {name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {EVENT_CATEGORY_LABELS[event.category]}
                      {event.places.length > 0 && (
                        <>
                          {" · "}
                          {event.places[0].place.nameKo ?? event.places[0].place.nameEn}
                          {event.places.length > 1 && ` +${event.places.length - 1}`}
                        </>
                      )}
                    </p>
                  </div>
                  {/* 액션 */}
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
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
                          className="h-7 w-7"
                          disabled={isPending}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget({ id: event.id, name })}
                        >
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateRange(event.startDate, event.endDate)}
                </p>
              </div>
            </div>
          );
        })}
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
