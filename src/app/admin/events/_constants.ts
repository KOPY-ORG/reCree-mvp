import type { EventStatus, EventCategory } from "@prisma/client";

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "임시저장",
  PUBLISHED: "발행됨",
  ENDED: "종료",
};

export const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  PUBLISHED: "bg-green-100 text-green-700",
  ENDED: "bg-zinc-100 text-zinc-500",
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  CONCERT: "콘서트",
  LANDMARK_LIGHTING: "랜드마크 조명",
  PROMOTION: "프로모션",
  ACTIVITY: "액티비티",
  SHOPPING: "쇼핑",
  MOBILITY: "모빌리티",
  FNB: "F&B",
  STAY: "숙박",
  WELCOME_KIT: "웰컴키트",
};
