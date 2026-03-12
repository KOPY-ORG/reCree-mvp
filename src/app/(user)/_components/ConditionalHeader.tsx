"use client";

import { usePathname } from "next/navigation";

export function ConditionalHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/posts/")) return null;
  return <>{children}</>;
}
