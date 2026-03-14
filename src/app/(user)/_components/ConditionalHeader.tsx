"use client";

import { usePathname } from "next/navigation";

const NO_HEADER_PATHS = ["/category", "/search"];
const SLIM_PATHS = ["/explore"];

export function ConditionalHeader({
  fullHeader,
  slimHeader,
}: {
  fullHeader: React.ReactNode;
  slimHeader: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/posts/")) return null;
  if (NO_HEADER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  if (SLIM_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return <>{slimHeader}</>;
  return <>{fullHeader}</>;
}
