"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function PostDetailHeader() {
  const router = useRouter();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center h-12 px-3">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center justify-center h-8 w-8"
      >
        <ArrowLeft className="h-5 w-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
      </button>

    </div>
  );
}
