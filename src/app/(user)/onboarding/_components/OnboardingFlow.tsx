"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { completeOnboarding } from "../_actions/onboarding-actions";
import { useNicknameCheck } from "@/hooks/use-nickname-check";
import { NicknameInput } from "@/components/NicknameInput";

export function OnboardingFlow({
  emailPrefix,
  isExistingUser,
}: {
  emailPrefix: string;
  isExistingUser: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [agreed, setAgreed] = useState(false);
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nicknameStatus = useNicknameCheck(nickname);

  function handleAgree() {
    if (!agreed) return;
    if (isExistingUser) {
      startTransition(async () => {
        await completeOnboarding({ nickname: "", bio: "" });
      });
    } else {
      setStep(2);
    }
  }

  function handleSubmit() {
    if (nicknameStatus === "taken") return;
    setSubmitError(null);
    startTransition(async () => {
      const result = await completeOnboarding({ nickname, bio });
      if (result?.error) setSubmitError(result.error);
    });
  }

  const canSubmit =
    !!nickname.trim() &&
    nicknameStatus === "available" &&
    !isPending;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 헤더 */}
      <div className="flex items-center justify-center h-14 px-4">
        <span className="font-bold text-base tracking-tight">reCree</span>
      </div>

      {/* 스텝 인디케이터 (신규 회원만) */}
      {!isExistingUser && (
        <div className="flex items-center justify-center gap-2 pb-8">
          <div className={`size-2 rounded-full transition-colors ${step === 1 ? "bg-foreground" : "bg-foreground/20"}`} />
          <div className={`size-2 rounded-full transition-colors ${step === 2 ? "bg-foreground" : "bg-foreground/20"}`} />
        </div>
      )}

      <div className="flex-1 flex flex-col px-6 max-w-sm mx-auto w-full">
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold mb-2">Welcome to reCree</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Before you start, please review and agree to our terms.
            </p>

            {/* 약관 링크 카드 */}
            <div className="border border-border rounded-2xl overflow-hidden mb-6">
              <Link
                href="/policy/terms"
                className="flex items-center justify-between px-4 py-4 hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">Terms of Service</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
              <div className="h-px bg-border" />
              <Link
                href="/policy/privacy"
                className="flex items-center justify-between px-4 py-4 hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium">Privacy Policy</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </div>

            {/* 동의 체크박스 */}
            <button
              type="button"
              onClick={() => setAgreed((v) => !v)}
              className="flex items-start gap-3 mb-8 text-left"
            >
              <div className={`mt-0.5 size-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                agreed ? "bg-foreground border-foreground" : "border-border"
              }`}>
                {agreed && <Check className="size-3 text-background stroke-[3]" />}
              </div>
              <span className="text-sm text-muted-foreground leading-snug">
                I have read and agree to the Terms of Service and Privacy Policy.
              </span>
            </button>

            <button
              type="button"
              onClick={handleAgree}
              disabled={!agreed || isPending}
              className="w-full py-3.5 rounded-xl font-semibold text-sm bg-brand text-black disabled:opacity-30 transition-opacity"
            >
              {isPending ? "Please wait..." : "Continue"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold mb-2">Set up your profile</h1>
            <p className="text-sm text-muted-foreground mb-8">
              You can always change this later in your profile settings.
            </p>

            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Nickname <span className="text-destructive">*</span>
                </label>
                <NicknameInput
                  value={nickname}
                  onChange={setNickname}
                  status={nicknameStatus}
                  placeholder={emailPrefix}
                  className="h-11 px-4 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Bio <span className="text-muted-foreground/50">(optional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a little about yourself..."
                  maxLength={150}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-foreground transition-colors resize-none"
                />
                <p className="text-right text-xs text-muted-foreground mt-1">{bio.length}/150</p>
              </div>
            </div>

            {submitError && (
              <p className="mb-4 text-sm text-destructive text-center">{submitError}</p>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full py-3.5 rounded-xl font-semibold text-sm bg-brand text-black disabled:opacity-30 transition-opacity"
            >
              {isPending ? "Setting up..." : "Get Started"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
