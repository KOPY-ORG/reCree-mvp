import type { PostStatus } from "@prisma/client";

export const STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: "비공개",
  PUBLISHED: "발행됨",
};

export const STATUS_COLORS: Record<PostStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
};
