"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function TopicsHeader() {
  const router = useRouter();
  return (
    <header className="app-header">
      <div className="h-12 flex items-center gap-1 px-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center h-8 w-8 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <p className="text-base font-semibold">Browse Topics</p>
      </div>
    </header>
  );
}
