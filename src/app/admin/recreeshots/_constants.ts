import type { ReCreeshotStatus } from "@prisma/client";

export const RECREESHOT_STATUS_BADGE: Record<ReCreeshotStatus, string> = {
  ACTIVE:        "bg-green-100 text-green-700",
  REPORTED:      "bg-orange-100 text-orange-700",
  HIDDEN:        "bg-zinc-100 text-zinc-500",
  REPORT_HIDDEN: "bg-red-100 text-red-600",
  DELETED:       "bg-red-50 text-red-400",
};

export const RECREESHOT_STATUS_LABEL: Record<ReCreeshotStatus, string> = {
  ACTIVE:        "공개",
  REPORTED:      "신고됨",
  HIDDEN:        "숨김",
  REPORT_HIDDEN: "신고로 숨김",
  DELETED:       "삭제됨",
};
