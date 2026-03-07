"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PostForm } from "@/app/admin/posts/_components/PostForm";
import { getPostEditData } from "@/app/admin/posts/_actions/post-actions";

type PostEditData = Awaited<ReturnType<typeof getPostEditData>>;

export function PostEditSheet({
  postId,
  onClose,
}: {
  postId: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<PostEditData>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!postId) {
      setData(null);
      return;
    }
    startTransition(async () => {
      const result = await getPostEditData(postId);
      setData(result);
    });
  }, [postId]);

  return (
    <Dialog open={!!postId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[calc(100vw-240px)] sm:max-w-[calc(100vw-240px)] h-[calc(100vh-48px)] p-0 overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>포스트 편집</DialogTitle>
        </DialogHeader>
        {postId && !data && (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            불러오는 중...
          </div>
        )}
        {data && (
          <PostForm
            mode="edit"
            postId={data.post.id}
            initialData={data.initialData}
            allTags={data.allTags}
            allTopics={data.allTopics}
            tagGroups={data.tagGroups}
            onSuccess={onClose}
            isEmbedded
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
