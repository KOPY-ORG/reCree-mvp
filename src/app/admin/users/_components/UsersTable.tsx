"use client";

import { useState, useTransition } from "react";
import { Loader2, MoreHorizontal, Camera, Bookmark } from "lucide-react";
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
import { deleteUser } from "../_actions/user-actions";
import { formatDate } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  nickname: string | null;
  createdAt: Date;
  _count: {
    reCreeshots: number;
    saves: number;
  };
}

export function UsersTable({ users }: { users: User[] }) {
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteUser(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("사용자가 삭제되었습니다.");
        setDeleteTarget(null);
      }
    });
  }

  return (
    <>
      <div className="mt-4 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  이메일
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  닉네임
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  가입일
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  recreeshots
                </th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  저장
                </th>
                <th className="w-16 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-sm text-muted-foreground"
                  >
                    사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-100 last:border-b-0 transition-colors hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3 font-medium">{user.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.nickname ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Camera className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs tabular-nums">
                          {user._count.reCreeshots}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Bookmark className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs tabular-nums">
                          {user._count.saves}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() =>
                                setDeleteTarget({ id: user.id, email: user.email })
                              }
                            >
                              강제 탈퇴
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
            <DialogTitle>사용자 강제 탈퇴</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {deleteTarget?.email}
            </span>{" "}
            사용자를 강제 탈퇴시키겠습니까?
            <br />
            모든 데이터가 삭제되며 되돌릴 수 없습니다.
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
              탈퇴
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
