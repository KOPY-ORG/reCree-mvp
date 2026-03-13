"use client";

import { useRouter, useSearchParams } from "next/navigation";

type SidebarItem =
  | { kind: "topic"; id: string; nameEn: string; colorHex: string | null }
  | { kind: "group"; group: string; nameEn: string; colorHex: string };

export function CategorySidebar({ items }: { items: SidebarItem[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get("topicId");
  const groupId = searchParams.get("groupId");

  return (
    <div className="flex flex-col py-2 overflow-y-auto h-full">
      {items.map((item) => {
        const isActive =
          item.kind === "topic"
            ? item.id === topicId
            : item.group === groupId;

        const href =
          item.kind === "topic"
            ? `/category?topicId=${item.id}`
            : `/category?groupId=${item.group}`;

        const colorHex = item.colorHex ?? "#C8FF09";

        return (
          <button
            key={item.kind === "topic" ? item.id : item.group}
            onClick={() => router.push(href)}
            className={`w-full px-3 py-3 text-left text-xs font-medium transition-colors border-l-2 ${
              isActive
                ? "border-l-foreground"
                : "border-l-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
            style={
              isActive
                ? { backgroundColor: colorHex + "22", color: "inherit" }
                : undefined
            }
          >
            {item.nameEn}
          </button>
        );
      })}
    </div>
  );
}
