"use client";

import { X } from "lucide-react";

interface Props {
  onClick: () => void;
  label?: string;
}

export function CloseButton({ onClick, label = "Close" }: Props) {
  const btnCls = "w-6 h-6";
  const iconCls = "size-3 text-muted-foreground";

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex items-center justify-center rounded-full bg-muted active:opacity-70 shrink-0 ${btnCls}`}
    >
      <X className={iconCls} />
    </button>
  );
}
