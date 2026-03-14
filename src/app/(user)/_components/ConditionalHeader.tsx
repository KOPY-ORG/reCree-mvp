"use client";

import { usePathname } from "next/navigation";

const NO_HEADER_PATHS = ["/category", "/search", "/my-trip"];
const EXPLORE_PATHS = ["/explore"];

export function ConditionalHeader({
  header,
  exploreHeader,
}: {
  header: React.ReactNode;
  exploreHeader: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/posts/")) return null;
  if (NO_HEADER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  if (EXPLORE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return <>{exploreHeader}</>;
  return <>{header}</>;
}
