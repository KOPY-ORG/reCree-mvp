"use client";

import { usePathname } from "next/navigation";

const NO_HEADER_PATHS = ["/category", "/search", "/my-map", "/profile", "/policy", "/onboarding"];
const EXPLORE_PATHS = ["/explore"];

const SAVED_PATHS = ["/saved"];

export function ConditionalHeader({
  header,
  exploreHeader,
  savedHeader,
}: {
  header: React.ReactNode;
  exploreHeader: React.ReactNode;
  savedHeader: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/posts/")) return null;
  if (pathname.startsWith("/explore/hall/")) return null;
  if (NO_HEADER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  if (EXPLORE_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return <>{exploreHeader}</>;
  if (SAVED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return <>{savedHeader}</>;
  return <>{header}</>;
}
