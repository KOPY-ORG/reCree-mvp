"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, MoreHorizontal, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { generateAIDraft, generateAIDraftsBulk } from "../_actions/draft-actions";
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
  postTopics: {
    displayOrder: number;
    topic: {
      id: string;
      nameEn: string;
      colorHex: string | null;
      colorHex2: string | null;
      gradientDir: string;
      gradientStop: number;
      textColorHex: string | null;
    };
  }[];
  postTags: {
    displayOrder: number;
    tag: {
      id: string;
      name: string;
      colorHex: string | null;
      colorHex2: string | null;
      textColorHex: string | null;
      group: string;
      effectiveColorHex: string;
      effectiveColorHex2: string | null;
      effectiveGradientDir: string;
      effectiveGradientStop: number;
      effectiveTextColorHex: string;
    };
  }[];
  postPlaces: { place: { id: string; nameKo: string } }[];
};

interface Props {
  posts: PostRow[];
  isFiltered: boolean;
}

type DraftingState = "idle" | "single" | "bulk";

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
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [draftingState, setDraftingState] = useState<DraftingState>("idle");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handlePublishToggle = (post: PostRow) => {
    startTransition(async () => {
      if (post.status === "PUBLISHED") {
        const result = await unpublishPost(post.id);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("발행이 취소되었습니다.");
        }
      } else {
        const result = await publishPost(post.id);
        if (result.error) {
          toast.error(result.error);
        } else if (result.missing && result.missing.length > 0) {
          toast.error(`발행 불가: ${result.missing.join(", ")} 필요`);
        } else {
          toast.success("발행되었습니다.");
        }
      }
    });
  };

  const importedPosts = posts.filter((p) => p.status === "IMPORTED");
  const allImportedSelected =
    importedPosts.length > 0 &&
    importedPosts.every((p) => selectedIds.has(p.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllImported = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(importedPosts.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleGenerateDraft = (postId: string) => {
    setDraftingId(postId);
    setDraftingState("single");
    startTransition(async () => {
      const result = await generateAIDraft(postId);
      setDraftingId(null);
      setDraftingState("idle");
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("AI 초안이 생성되었습니다.");
      }
    });
  };

  const handleGenerateDraftsBulk = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setDraftingState("bulk");
    startTransition(async () => {
      const result = await generateAIDraftsBulk(ids);
      setDraftingState("idle");
      setSelectedIds(new Set());
      if (result.success > 0) {
        toast.success(`${result.success}개 AI 초안 생성 완료`);
      }
      result.errors.forEach((e) => toast.error(`${e.id}: ${e.error}`));
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
      {/* 일괄 AI 초안 생성 바 */}
      {selectedIds.size > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-white shadow-sm px-4 py-2.5">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size}개 선택됨
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={draftingState === "bulk"}
            onClick={handleGenerateDraftsBulk}
          >
            {draftingState === "bulk" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            선택 항목 AI 초안 생성
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => setSelectedIds(new Set())}
          >
            선택 해제
          </Button>
        </div>
      )}

      <div className="mt-4 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-100">
              <tr>
                <th className="px-4 py-3 w-10">
                  {importedPosts.length > 0 && (
                    <Checkbox
                      checked={allImportedSelected}
                      onCheckedChange={(v) => toggleSelectAllImported(!!v)}
                      aria-label="IMPORTED 전체 선택"
                    />
                  )}
                </th>
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
                  라벨
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
                    colSpan={8}
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
                  className="border-b border-zinc-100 last:border-b-0 transition-colors hover:bg-zinc-50"
                >
                  {/* 체크박스 (IMPORTED만) */}
                  <td className="px-4 py-3">
                    {post.status === "IMPORTED" && (
                      <Checkbox
                        checked={selectedIds.has(post.id)}
                        onCheckedChange={() => toggleSelect(post.id)}
                        aria-label={`${post.titleKo} 선택`}
                      />
                    )}
                  </td>

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

                  {/* 라벨 (visible 토픽+태그 통합, displayOrder 순) */}
                  <td className="px-4 py-3 min-w-[120px]">
                    {(() => {
                      const topicLabels = post.postTopics.map(({ displayOrder, topic }) => ({
                        id: `topic-${topic.id}`,
                        displayOrder,
                        label: topic.nameEn,
                        style: topic.colorHex2
                          ? { background: `linear-gradient(${topic.gradientDir}, ${topic.colorHex} 0%, ${topic.colorHex2} ${topic.gradientStop}%)`, color: topic.textColorHex ?? "#000" }
                          : topic.colorHex
                            ? { backgroundColor: topic.colorHex, color: topic.textColorHex ?? "#000" }
                            : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" },
                      }));
                      const tagLabels = post.postTags.map(({ displayOrder, tag }) => ({
                        id: `tag-${tag.id}`,
                        displayOrder,
                        label: tag.name,
                        style: tag.effectiveColorHex2
                          ? { background: `linear-gradient(${tag.effectiveGradientDir}, ${tag.effectiveColorHex} 0%, ${tag.effectiveColorHex2} ${tag.effectiveGradientStop}%)`, color: tag.effectiveTextColorHex }
                          : { backgroundColor: tag.effectiveColorHex, color: tag.effectiveTextColorHex },
                      }));
                      const allLabels = [...topicLabels, ...tagLabels].sort((a, b) => a.displayOrder - b.displayOrder);
                      const MAX = 3;
                      return (
                        <div className="flex flex-wrap gap-1">
                          {allLabels.slice(0, MAX).map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium"
                              style={item.style}
                            >
                              {item.label}
                            </span>
                          ))}
                          {allLabels.length > MAX && (
                            <span className="text-xs text-muted-foreground">
                              +{allLabels.length - MAX}
                            </span>
                          )}
                          {allLabels.length === 0 && (
                            <span className="text-xs text-muted-foreground/40">—</span>
                          )}
                        </div>
                      );
                    })()}
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
                          {post.status === "IMPORTED" && (
                            <>
                              <DropdownMenuItem
                                disabled={draftingState !== "idle"}
                                onClick={() => handleGenerateDraft(post.id)}
                              >
                                {draftingState === "single" && draftingId === post.id ? (
                                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                                )}
                                AI 초안 생성
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
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
