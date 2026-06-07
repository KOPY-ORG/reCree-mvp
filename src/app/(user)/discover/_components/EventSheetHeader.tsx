"use client";

import { EVENT_RED } from "@/lib/event-format";

interface Props {
  collectionName: string;
  eventCount: number;
}

export function EventSheetHeader({ collectionName, eventCount }: Props) {
  return (
    <div className="flex items-center justify-between px-4 pt-2 pb-3">
      <div className="flex flex-col min-w-0 flex-1">
        <p
          className="text-[10px] font-black tracking-[.08em] uppercase font-[family-name:var(--font-inter)]"
          style={{ color: EVENT_RED }}
        >
          Event
        </p>
        <h2 className="text-[17px] font-black leading-tight tracking-[-0.01em] text-foreground truncate font-[family-name:var(--font-inter)]">
          {collectionName}
        </h2>
      </div>
      <span className="text-sm text-muted-foreground shrink-0 ml-3">
        {eventCount} {eventCount === 1 ? "event" : "events"}
      </span>
    </div>
  );
}
