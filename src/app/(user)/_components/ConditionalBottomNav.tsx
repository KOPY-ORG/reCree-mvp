"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

export function ConditionalBottomNav() {
  const pathname = usePathname();
  if (
    pathname === "/search" ||
    pathname === "/explore/hall/new" ||
    pathname.endsWith("/edit") ||
    pathname.startsWith("/policy/")
  ) return null;
  return <BottomNav />;
}
