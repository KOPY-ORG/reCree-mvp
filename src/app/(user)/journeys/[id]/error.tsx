"use client";

import { useEffect } from "react";

// 프로젝트 첫 error.tsx 다. 최소 형태로 둔다 —
// 문구 한 줄 + 재시도 버튼. 에러 내용은 화면에 노출하지 않고 콘솔로만 남긴다.
export default function CourseDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <p className="text-base font-semibold">Something went wrong</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold transition-opacity hover:opacity-80"
      >
        Try again
      </button>
    </div>
  );
}
