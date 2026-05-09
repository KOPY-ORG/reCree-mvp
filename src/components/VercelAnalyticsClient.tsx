"use client";

import { Analytics } from "@vercel/analytics/react";

export function VercelAnalyticsClient() {
  return (
    <Analytics
      beforeSend={(event) => {
        try {
          const { pathname } = new URL(event.url);
          if (pathname.startsWith("/admin")) return null;
        } catch {
          // URL 파싱 실패 시 안전하게 통과
        }
        return event;
      }}
    />
  );
}
