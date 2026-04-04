"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function HallDetailBackButton() {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} className="p-2 rounded-full">
      <ChevronLeft className="size-5 text-black" />
    </button>
  );
}
