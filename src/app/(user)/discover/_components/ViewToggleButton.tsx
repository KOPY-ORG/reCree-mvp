"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Map, List } from "lucide-react";

export function ViewToggleButton() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isMapView = searchParams.get("view") === "map";

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (isMapView) {
      params.delete("view");
      params.delete("place");
    } else {
      params.set("view", "map");
    }
    const next = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(next);
  }

  return (
    <button
      onClick={toggle}
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background shadow-lg text-sm font-medium active:opacity-70"
    >
      {isMapView ? <List className="size-4" /> : <Map className="size-4" />}
      {isMapView ? "List" : "Map"}
    </button>
  );
}
