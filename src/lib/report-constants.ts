import type { ReportReason, ReportStatus } from "@prisma/client";

export const REASON_LABEL: Record<ReportReason, string> = {
  SPAM: "스팸",
  INAPPROPRIATE: "부적절한 콘텐츠",
  HARASSMENT: "괴롭힘/욕설",
  FALSE_INFORMATION: "허위 정보",
  COPYRIGHT: "저작권 침해",
  OTHER: "기타",
};

export const REPORT_STATUS_BADGE: Record<ReportStatus, string> = {
  PENDING:   "bg-orange-100 text-orange-700",
  DISMISSED: "bg-zinc-100 text-zinc-500",
  RESOLVED:  "bg-red-100 text-red-600",
};
