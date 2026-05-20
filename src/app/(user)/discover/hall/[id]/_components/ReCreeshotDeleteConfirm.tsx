"use client";

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function ReCreeshotDeleteConfirm({ onConfirm, onCancel, isDeleting }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-background rounded-2xl w-full max-w-xs p-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-base">Delete recreeshot?</p>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-full text-sm font-medium border border-border"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-red-500 text-white disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
