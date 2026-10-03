"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function TopicDetailHeader() {
  const router = useRouter();

  return (
    // lg 는 상단 바가 길을 잡는다 — 히어로 위 뒤로 화살표는 이중 헤더라 숨긴다
    <div className="fixed top-0 left-0 right-0 z-50 h-12 lg:hidden">
      <div className="max-w-[var(--app-col-w)] mx-auto h-full flex items-center px-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center h-8 w-8"
        >
          <ArrowLeft className="h-5 w-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
        </button>
      </div>
    </div>
  );
}
