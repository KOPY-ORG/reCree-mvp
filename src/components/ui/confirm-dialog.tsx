"use client";

import { useEffect } from "react";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-8"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-background rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-6 pb-4 text-center space-y-1.5">
          <p className="font-bold text-base">{title}</p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="border-t border-border/50">
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full py-3.5 text-sm font-semibold border-b border-border/50${
              destructive ? " text-red-500" : ""
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3.5 text-sm font-semibold"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
