"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { showError } from "@/lib/toast";
import { copyCourse } from "@/app/(user)/_actions/course-actions";
import { INK, SUB } from "../_constants";

/**
 * 시안 journeyView 하단 CTA. 남의 공개 코스에서만 보인다.
 * 미로그인은 서버 왕복 전에 막고 토스트로 유도한다 (FollowButton.tsx:29 패턴).
 */
export function CopyCourseButton({
  courseId,
  isLoggedIn,
  dayLabel,
}: {
  courseId: string;
  isLoggedIn: boolean;
  /** "2 days" — 캡션 문구에 그대로 들어간다 */
  dayLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isLoggedIn) {
      showError("Sign in to make this journey yours.");
      return;
    }

    startTransition(async () => {
      const result = await copyCourse(courseId);

      if (result.error === "unauthenticated") {
        showError("Session expired. Sign in again.");
        return;
      }
      if (result.error === "not_found") {
        showError("This journey is no longer available.");
        return;
      }
      if (result.error === "forbidden") {
        showError("This journey is not public.");
        return;
      }
      if (result.error || !result.id) {
        showError("Something went wrong. Try again.");
        return;
      }

      router.push(`/journeys/${result.id}/edit`);
    });
  }

  return (
    <div
      className="shrink-0 bg-background px-[18px] pt-3 pb-[26px]"
      style={{ boxShadow: "0 -8px 24px rgba(0,0,0,.07)" }}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex h-[54px] w-full items-center justify-center gap-[9px] rounded-[27px] transition-opacity disabled:opacity-60"
        style={{ background: INK }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C8FF09" strokeWidth="2.2">
          <rect x="8" y="8" width="12" height="12" rx="3" />
          <path d="M16 5H6.5A2.5 2.5 0 004 7.5V16" />
        </svg>
        <span className="text-[15px] font-bold leading-none text-white">Make it mine</span>
      </button>
      <p
        className="mt-[9px] text-center text-[10.5px] font-medium leading-[1.4]"
        style={{ color: SUB }}
      >
        Copies all {dayLabel} into a private journey you can edit.
      </p>
    </div>
  );
}
