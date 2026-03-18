"use client";

import { useState } from "react";

type Toast = { message: string; key: number };

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(message: string) {
    const key = Date.now();
    setToast({ message, key });
    setTimeout(() => setToast((t) => (t?.key === key ? null : t)), 2000);
  }

  return { toast, showToast };
}
