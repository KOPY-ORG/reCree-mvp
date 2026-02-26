"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { deletePost, publishPost, unpublishPost } from "../_actions/post-actions";
import type { PostStatus } from "@prisma/client";

export type PostRow = {
  id: string;
  titleKo: string;
  titleEn: string;
  slug: string;
  status: PostStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  postTopics: { topic: { id: string; nameKo: string } }[];
  postTags: { tag: { id: string; nameKo: string; colorHex: string | null } }[];
  postPlaces: { place: { id: string; nameKo: string } }[];
};

interface Props {
  posts: PostRow[];
  isFiltered: boolean;
}

const STATUS_LABELS: Record<PostStatus, string> = {
  IMPORTED: "가져옴",
  AI_DRAFTED: "AI 초안",
  DRAFT: "임시저장",
  PUBLISHED: "발행됨",
};

const STATUS_COLORS: Record<PostStatus, string> = {
  IMPORTED: "bg-blue-100 text-blue-700",
  AI_DRAFTED: "bg-purple-100 text-purple-700",
  DRAFT: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
};

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export function PostsTable({ posts, isFiltered }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const handlePublishToggle = (post: PostRow) => {
    startTransition(async () => {
      const fn = post.status === "PUBLISHED" ? unpublishPost : publishPost;
      const result = await fn(post.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          post.status === "PUBLISHED" ? "발행이 취소되었습니다." : "발행되었습니다.",
        );
      }
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deletePost(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("포스트가 삭제되었습니다.");
        setDeleteTarget(null);
      }
    });
  };

  return (
    <>
      <div className="mt-6 border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  제목
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  상태
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  장소
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  토픽
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  생성일
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">
                  수정일
                </th>
                <th className="w-24 px-2 py-3" />
              </tr>
            </thead>
            <tbody>
              {posts.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-16 text-center text-sm text-muted-foreground"
                  >
                    {isFiltered
                      ? "조건에 맞는 포스트가 없습니다."
                      : "등록된 포스트가 없습니다. 첫 포스트를 작성해보세요."}
                  </td>
                </tr>
              )}
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="border-b last:border-b-0 transition-colors hover:bg-muted/30"
                >
                  {/* 제목 */}
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="font-medium leading-tight">{post.titleKo}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                      {post.titleEn}
                    </div>
                  </td>

                  {/* 상태 */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[post.status]}`}
                    >
                      {STATUS_LABELS[post.status]}
                    </span>
                    {post.publishedAt && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(post.publishedAt)}
                      </div>
                    )}
                  </td>

                  {/* 장소 */}
                  <td className="px-4 py-3 min-w-[120px]">
                    {post.postPlaces.length > 0 ? (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {post.postPlaces[0].place.nameKo}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* 토픽 */}
                  <td className="px-4 py-3 min-w-[100px]">
                    <div className="flex flex-wrap gap-1">
                      {post.postTopics.slice(0, 2).map(({ topic }) => (
                        <span
                          key={topic.id}
                          className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                        >
                          {topic.nameKo}
                        </span>
                      ))}
                      {post.postTopics.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{post.postTopics.length - 2}
                        </span>
                      )}
                      {post.postTopics.length === 0 && (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>
                  </td>

                  {/* 생성일 */}
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(post.createdAt)}
                  </td>

                  {/* 수정일 */}
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(post.updatedAt)}
                  </td>

                  {/* 액션 */}
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          router.push(`/admin/posts/${post.id}/edit`)
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
                          <DropdownMenuItem
                            onClick={() => handlePublishToggle(post)}
                          >
                            {post.status === "PUBLISHED"
                              ? "발행 취소"
                              : "발행하기"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                id: post.id,
                                title: post.titleKo,
                              })
                            }
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
            <DialogTitle>포스트 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {deleteTarget?.title}
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
