"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function GAPageViewTracker({ id }: { id: string }) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    if (typeof window === "undefined" || !window.gtag) return;
    window.gtag("config", id, { page_path: pathname });
  }, [pathname, id]);

  return null;
}
