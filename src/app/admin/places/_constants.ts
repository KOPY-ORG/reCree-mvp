import type { PlaceStatus } from "@prisma/client";

export const STATUS_LABELS: Record<PlaceStatus, string> = {
  OPEN: "영업중",
  CLOSED_TEMP: "임시휴업",
  CLOSED_PERMANENT: "폐업",
};

export const STATUS_COLORS: Record<PlaceStatus, string> = {
  OPEN: "bg-green-100 text-green-700",
  CLOSED_TEMP: "bg-amber-100 text-amber-700",
  CLOSED_PERMANENT: "bg-red-100 text-red-600",
};
