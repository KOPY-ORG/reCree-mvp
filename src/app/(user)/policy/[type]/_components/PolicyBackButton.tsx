"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function PolicyBackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="flex items-center justify-center size-8"
    >
      <ChevronLeft className="size-5" />
    </button>
  );
}
