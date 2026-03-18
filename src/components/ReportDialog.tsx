"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createReport } from "@/app/(user)/_actions/report-actions";
import type { ReportReason } from "@prisma/client";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "INAPPROPRIATE", label: "Inappropriate content" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "FALSE_INFORMATION", label: "False information" },
  { value: "COPYRIGHT", label: "Copyright violation" },
  { value: "OTHER", label: "Other" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  postId?: string;
  reCreeshotId?: string;
}

export function ReportDialog({ open, onClose, postId, reCreeshotId }: Props) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function handleClose() {
    onClose();
    setSelectedReason(null);
    setDescription("");
  }

  function handleSubmit() {
    if (!selectedReason) return;
    startTransition(async () => {
      const result = await createReport({
        reason: selectedReason!,
        description: description.trim() || undefined,
        postId,
        reCreeshotId,
      });

      if (result.error === "already_reported") {
        toast.error("You've already reported this content.");
      } else if (result.error === "unauthenticated") {
        toast.error("Please sign in to report content.");
      } else if (result.error) {
        toast.error("Failed to submit. Please try again.");
      } else {
        toast.success("Report submitted. Thank you.");
        handleClose();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-6 sm:pb-0">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-background rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4">
        <div>
          <p className="font-semibold text-base">Report</p>
          <p className="text-sm text-muted-foreground mt-0.5">Why are you reporting this?</p>
        </div>

        <div className="flex flex-col gap-1.5">
          {REASONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedReason(value)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                selectedReason === value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:bg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {selectedReason && (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Additional details (optional)"
            className="w-full resize-none text-sm border border-border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-foreground/20 placeholder:text-muted-foreground bg-background"
            rows={3}
          />
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 rounded-full text-sm font-medium border border-border"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedReason || isPending}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-foreground text-background disabled:opacity-40 transition-opacity"
          >
            {isPending ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
