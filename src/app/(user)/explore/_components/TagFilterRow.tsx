"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Tag = {
  id: string;
  name: string;
  colorHex: string | null;
  textColorHex: string | null;
};

type TagGroup = {
  group: string;
  nameEn: string;
  colorHex: string;
  colorHex2: string | null;
  gradientDir: string;
  gradientStop: number;
  textColorHex: string;
  tags: Tag[];
};

export function TagFilterRow({ tagGroups }: { tagGroups: TagGroup[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tagId = searchParams.get("tagId");
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const activeGroup = tagGroups.find((g) => g.tags.some((t) => t.id === tagId));
  const activeTag = activeGroup?.tags.find((t) => t.id === tagId);
  const openGroupData = openGroup
    ? tagGroups.find((g) => g.group === openGroup)
    : null;

  function navigate(newTagId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (newTagId) {
      params.set("tagId", newTagId);
    } else {
      params.delete("tagId");
    }
    params.delete("tab");
    router.push(`/explore?${params.toString()}`);
    setOpenGroup(null);
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-3">
        <button
          onClick={() => navigate(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !tagId
              ? "bg-foreground text-background border-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          All
        </button>

        {tagGroups.map((group) => {
          const isActive = activeGroup?.group === group.group;
          const label =
            isActive && activeTag
              ? `${group.nameEn} / ${activeTag.name}`
              : group.nameEn;

          return (
            <button
              key={group.group}
              onClick={() => setOpenGroup(group.group)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? "border-transparent"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              }`}
              style={
                isActive
                  ? { backgroundColor: group.colorHex, color: group.textColorHex }
                  : undefined
              }
            >
              {label}
              {isActive && (
                <X
                  className="size-3 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(null);
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <Sheet
        open={!!openGroup}
        onOpenChange={(v) => !v && setOpenGroup(null)}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl max-h-[70vh] pb-8"
        >
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">{openGroupData?.nameEn}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-wrap gap-2 px-4 pb-2 overflow-y-auto">
            <button
              onClick={() => navigate(null)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
            >
              All
            </button>

            {openGroupData?.tags.map((tag) => {
              const isActive = tagId === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => navigate(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    isActive
                      ? "border-transparent"
                      : "border-border text-muted-foreground hover:border-foreground"
                  }`}
                  style={
                    isActive
                      ? {
                          backgroundColor:
                            tag.colorHex ?? openGroupData.colorHex,
                          color:
                            tag.textColorHex ?? openGroupData.textColorHex,
                        }
                      : undefined
                  }
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
