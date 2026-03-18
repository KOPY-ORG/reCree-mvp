"use client";

import { useState, useTransition, useEffect } from "react";
import { CheckCircle } from "lucide-react";
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

type DialogState = "form" | "success" | "already_reported" | "own_content" | "error";

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
  const [dialogState, setDialogState] = useState<DialogState>("form");

  useEffect(() => {
    if (!open) {
      setSelectedReason(null);
      setDescription("");
      setDialogState("form");
    }
  }, [open]);

  // 성공 시 1.8초 후 자동 닫기
  useEffect(() => {
    if (dialogState === "success") {
      const timer = setTimeout(() => onClose(), 1800);
      return () => clearTimeout(timer);
    }
  }, [dialogState, onClose]);

  if (!open) return null;

  function handleSubmit() {
    if (!selectedReason) return;
    startTransition(async () => {
      const result = await createReport({
        reason: selectedReason!,
        description: description.trim() || undefined,
        postId,
        reCreeshotId,
      });

      if (result.error === "own_content") {
        setDialogState("own_content");
      } else if (result.error === "already_reported") {
        setDialogState("already_reported");
      } else if (result.error) {
        setDialogState("error");
      } else {
        setDialogState("success");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center px-4 pb-6 sm:pb-0">
      <div className="absolute inset-0 bg-black/50" onClick={dialogState === "form" ? onClose : undefined} />
      <div className="relative bg-background rounded-2xl w-full max-w-sm p-5 flex flex-col gap-4">

        {/* Success */}
        {dialogState === "success" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="size-10 text-foreground" strokeWidth={1.5} />
            <p className="font-semibold text-base text-center">Report submitted.</p>
            <p className="text-sm text-muted-foreground text-center">Thank you. We'll review it shortly.</p>
          </div>
        )}

        {/* Own content */}
        {dialogState === "own_content" && (
          <div className="flex flex-col gap-4">
            <p className="font-semibold text-base">Report</p>
            <p className="text-sm text-muted-foreground text-center py-4">You can't report your own content.</p>
            <button type="button" onClick={onClose} className="w-full py-2.5 rounded-full text-sm font-medium border border-border">
              Close
            </button>
          </div>
        )}

        {/* Already reported */}
        {dialogState === "already_reported" && (
          <div className="flex flex-col gap-4">
            <p className="font-semibold text-base">Report</p>
            <p className="text-sm text-muted-foreground text-center py-4">You've already reported this content.</p>
            <button type="button" onClick={onClose} className="w-full py-2.5 rounded-full text-sm font-medium border border-border">
              Close
            </button>
          </div>
        )}

        {/* Error */}
        {dialogState === "error" && (
          <div className="flex flex-col gap-4">
            <p className="font-semibold text-base">Report</p>
            <p className="text-sm text-muted-foreground text-center py-4">Something went wrong. Please try again.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-full text-sm font-medium border border-border"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setDialogState("form")}
                className="flex-1 py-2.5 rounded-full text-sm font-semibold bg-foreground text-background"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* 기본 폼 */}
        {dialogState === "form" && (
          <>
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
                onClick={onClose}
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
          </>
        )}

      </div>
    </div>
  );
}
