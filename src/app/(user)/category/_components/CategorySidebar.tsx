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
    <div className="flex flex-col overflow-y-auto h-full">
      {items.map((item) => {
        const isActive =
          item.kind === "topic"
            ? item.id === topicId
            : item.group === groupId;

        const href =
          item.kind === "topic"
            ? `/category?topicId=${item.id}`
            : `/category?groupId=${item.group}`;

        return (
          <button
            key={item.kind === "topic" ? item.id : item.group}
            onClick={() => router.push(href)}
            className={`w-full px-3 py-3 text-left text-xs font-medium transition-colors ${
              isActive
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.nameEn}
          </button>
        );
      })}
    </div>
  );
}
