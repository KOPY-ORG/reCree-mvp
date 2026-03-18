"use client";

import { useState, useEffect, useRef } from "react";
import { checkNicknameAvailable } from "@/lib/actions/user-actions";

export type NicknameStatus = "idle" | "checking" | "available" | "taken";

export function useNicknameCheck(nickname: string, currentNickname?: string) {
  const [status, setStatus] = useState<NicknameStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const trimmed = nickname.trim();

    // 현재 닉네임과 동일하면 체크 불필요
    if (currentNickname !== undefined && trimmed === currentNickname.trim()) {
      setStatus("idle");
      return;
    }

    if (!trimmed) {
      setStatus("idle");
      return;
    }

    setStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const available = await checkNicknameAvailable(trimmed);
      setStatus(available ? "available" : "taken");
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [nickname, currentNickname]);

  return status;
}
