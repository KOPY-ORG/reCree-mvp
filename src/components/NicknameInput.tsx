"use client";

import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { NicknameStatus } from "@/hooks/use-nickname-check";

interface NicknameInputProps {
  value: string;
  onChange: (value: string) => void;
  status: NicknameStatus;
  placeholder?: string;
  className?: string;
}

export function NicknameInput({
  value,
  onChange,
  status,
  placeholder = "Your nickname",
  className = "",
}: NicknameInputProps) {
  return (
    <div>
      <div className="relative">
        <input
          id="nickname"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={30}
          className={`w-full text-sm bg-transparent border rounded-lg px-3 py-2.5 pr-9 outline-none transition-colors placeholder:text-muted-foreground/50 ${
            status === "taken"
              ? "border-destructive focus:border-destructive"
              : status === "available"
              ? "border-green-500 focus:border-green-500"
              : "border-border focus:border-foreground"
          } ${className}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === "checking" && (
            <Loader2 className="size-4 text-muted-foreground animate-spin" />
          )}
          {status === "available" && (
            <CheckCircle2 className="size-4 text-green-500" />
          )}
          {status === "taken" && (
            <XCircle className="size-4 text-destructive" />
          )}
        </div>
      </div>
      {status === "taken" && (
        <p className="mt-1.5 text-xs text-destructive">
          This nickname is already taken.
        </p>
      )}
      {status === "available" && (
        <p className="mt-1.5 text-xs text-green-500">Available!</p>
      )}
    </div>
  );
}
