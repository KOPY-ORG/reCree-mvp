"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  FileText,
  Camera,
  Bookmark,
  CheckCircle,
  XCircle,
  Pencil,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deletePlace } from "../actions";
import type { PlaceStatus, PlaceSource } from "@prisma/client";

export type PlaceRow = {
  id: string;
  nameKo: string;
  nameEn: string | null;
  country: string;
  city: string | null;
  status: PlaceStatus;
  source: PlaceSource;
  isVerified: boolean;
  createdAt: Date;
  placeTags: { tag: { id: string; nameKo: string; colorHex: string | null } }[];
  placeTopics: { topic: { id: string; nameKo: string } }[];
  _count: { postPlaces: number; reCreeshots: number };
  saveCount: number;
};

interface Props {
  places: PlaceRow[];
  isFiltered: boolean;
}

const STATUS_LABELS: Record<PlaceStatus, string> = {
  OPEN: "영업중",
  CLOSED_TEMP: "임시휴업",
  CLOSED_PERMANENT: "폐업",
};

const STATUS_COLORS: Record<PlaceStatus, string> = {
  OPEN: "bg-green-100 text-green-700",
  CLOSED_TEMP: "bg-amber-100 text-amber-700",
  CLOSED_PERMANENT: "bg-red-100 text-red-600",
};

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function PlacesTable({ places, isFiltered }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleDeleteClick = (place: PlaceRow) => {
    if (place._count.postPlaces > 0) {
      toast.error(
        `이 장소를 사용 중인 포스트가 ${place._count.postPlaces}개 있습니다. 먼저 연결을 해제해주세요.`,
      );
      return;
    }
    setDeleteTarget({ id: place.id, name: place.nameKo });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deletePlace(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("장소가 삭제되었습니다.");
        setDeleteTarget(null);
      }
    });
  };

  return (
    <>
      <div className="mt-6 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  장소명
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  태그
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  토픽
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  상태
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  출처
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                  인증
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  포스트
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  리크리샷
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  스크랩
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  등록일
                </th>
                <th className="w-24 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {places.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-16 text-center text-sm text-muted-foreground"
                  >
                    {isFiltered
                      ? "조건에 맞는 장소가 없습니다."
                      : "등록된 장소가 없습니다. 첫 장소를 등록해보세요."}
                  </td>
                </tr>
              )}
              {places.map((place) => (
                <tr
                  key={place.id}
                  className="border-b border-zinc-100 last:border-b-0 transition-colors hover:bg-zinc-50"
                >
                  {/* 장소명 */}
                  <td className="px-4 py-3 min-w-[160px]">
                    <div className="font-medium leading-tight">{place.nameKo}</div>
                    {place.nameEn && (
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                        {place.nameEn}
                      </div>
                    )}
                  </td>

                  {/* 태그 */}
                  <td className="px-4 py-3 min-w-[120px]">
                    <div className="flex flex-wrap gap-1">
                      {place.placeTags.slice(0, 3).map(({ tag }) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                          style={
                            tag.colorHex
                              ? {
                                  backgroundColor: tag.colorHex + "22",
                                  color: tag.colorHex,
                                }
                              : undefined
                          }
                        >
                          {tag.nameKo}
                        </span>
                      ))}
                      {place.placeTags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{place.placeTags.length - 3}
                        </span>
                      )}
                      {place.placeTags.length === 0 && (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>
                  </td>

                  {/* 토픽 */}
                  <td className="px-4 py-3 min-w-[100px]">
                    <div className="flex flex-wrap gap-1">
                      {place.placeTopics.slice(0, 2).map(({ topic }) => (
                        <span
                          key={topic.id}
                          className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                        >
                          {topic.nameKo}
                        </span>
                      ))}
                      {place.placeTopics.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{place.placeTopics.length - 2}
                        </span>
                      )}
                      {place.placeTopics.length === 0 && (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>
                  </td>

                  {/* 상태 */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[place.status]}`}
                    >
                      {STATUS_LABELS[place.status]}
                    </span>
                  </td>

                  {/* 출처 */}
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {place.source}
                  </td>

                  {/* 인증 */}
                  <td className="px-4 py-3 text-center">
                    {place.isVerified ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                    )}
                  </td>

                  {/* 포스트 */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs tabular-nums">
                        {place._count.postPlaces}
                      </span>
                    </div>
                  </td>

                  {/* 리크리샷 */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Camera className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs tabular-nums">
                        {place._count.reCreeshots}
                      </span>
                    </div>
                  </td>

                  {/* 스크랩 */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Bookmark className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-xs tabular-nums">{place.saveCount}</span>
                    </div>
                  </td>

                  {/* 등록일 */}
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(place.createdAt)}
                  </td>

                  {/* 액션 */}
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          router.push(`/admin/places/${place.id}/edit`)
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeleteClick(place)}
                          >
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>장소 삭제</DialogTitle>
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
