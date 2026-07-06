"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/app/(user)/_actions/feedback-actions";

type Status = "idle" | "submitting" | "success" | "error";

interface Props {
  source: "feed" | "discover";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FeedbackForm({ source }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const trimmedEmail = email.trim();
  const trimmedContent = content.trim();
  const emailValid = !trimmedEmail || EMAIL_RE.test(trimmedEmail);
  const contentValid = trimmedContent.length >= 10 && trimmedContent.length <= 500;
  const canSubmit = contentValid && emailValid && status === "idle";

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value);
    if (status === "error") setStatus("idle");
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value);
    if (status === "error") setStatus("idle");
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setStatus("submitting");
    const res = await submitFeedback({
      content: trimmedContent,
      email: trimmedEmail || null,
      source,
    });
    if ("error" in res) {
      setStatus("error");
      setErrorMsg(res.error);
    } else {
      setStatus("success");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
        Thanks for your feedback! 🙌
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Help us make reCree better — share your thoughts.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setExpanded(true)}
          className="shrink-0 rounded-full"
        >
          Give feedback
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background px-4 py-4">
      <p className="text-sm font-medium">Share your thoughts</p>

      <div className="space-y-1">
        <Input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={handleEmailChange}
          disabled={status === "submitting"}
          className="text-sm"
        />
        {!emailValid && (
          <p className="text-xs text-destructive">Invalid email address.</p>
        )}
      </div>

      <div className="space-y-1">
        <Textarea
          placeholder="What's on your mind? (10–500 characters)"
          value={content}
          onChange={handleContentChange}
          disabled={status === "submitting"}
          rows={4}
          maxLength={500}
          className="resize-none text-sm"
        />
        <div className="flex items-center justify-between">
          <span
            className={`text-xs ${
              content.length > 500
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {content.length}/500
          </span>
          {status === "error" && (
            <span className="text-xs text-destructive">{errorMsg}</span>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setExpanded(false);
            if (status === "error") setStatus("idle");
          }}
          disabled={status === "submitting"}
          className="rounded-full"
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="rounded-full bg-brand text-black hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
