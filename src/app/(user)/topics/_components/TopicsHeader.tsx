"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

export function TopicsHeader() {
  const router = useRouter();
  return (
    <header className="app-header">
      <div className="relative flex h-12 items-center justify-center px-2">
        <p className="text-base font-semibold">Your topics</p>
        {/* 되돌아가는 동작은 그대로다. 화살표에서 X 로 바뀐 것은 이 화면이 훑고 나가는
            시트에 가깝기 때문이고, 어디로 가는지는 달라지지 않았다 */}
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close"
          className="absolute right-1 flex size-9 items-center justify-center rounded-full transition-colors active:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
