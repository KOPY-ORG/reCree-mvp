"use client";

import { usePathname } from "next/navigation";

const NO_HEADER_PATHS = ["/profile", "/policy", "/onboarding", "/topics", "/discover"];

const SAVED_PATHS = ["/saved"];
const SHOP_PATHS = ["/shop"];

export function ConditionalHeader({
  header,
  savedHeader,
  shopHeader,
}: {
  header: React.ReactNode;
  savedHeader: React.ReactNode;
  shopHeader: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/posts/")) return null;
  if (pathname.startsWith("/topics/")) return null;
  if (pathname.startsWith("/recreeshot/")) return null;
  if (pathname.startsWith("/events/")) return null;
  if (NO_HEADER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;
  if (SAVED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return <>{savedHeader}</>;
  if (SHOP_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return <>{shopHeader}</>;
  return <>{header}</>;
}
