"use client";

import { usePathname } from "next/navigation";

const NO_HEADER_PATHS = ["/search", "/profile", "/policy", "/onboarding", "/topics", "/discover"];

const SAVED_PATHS = ["/saved"];

export function ConditionalHeader({
  header,
  savedHeader,
}: {
  header: React.ReactNode;
  savedHeader: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/posts/")) return null;
  if (pathname.startsWith("/topics/")) return null;
  if (pathname.startsWith("/discover/hall/")) return null;
  if (NO_HEADER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  if (SAVED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return <>{savedHeader}</>;
  return <>{header}</>;
}
