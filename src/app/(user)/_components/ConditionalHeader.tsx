"use client";

import { usePathname } from "next/navigation";

const SLIM_PATHS = ["/explore", "/category"];

export function ConditionalHeader({
  fullHeader,
  slimHeader,
}: {
  fullHeader: React.ReactNode;
  slimHeader: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/posts/")) return null;
  if (SLIM_PATHS.includes(pathname)) return <>{slimHeader}</>;
  return <>{fullHeader}</>;
}
