"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  async function handleGoogleLogin() {
    const supabase = createClient();
    const origin = window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-6">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="뒤로가기"
      >
        <ArrowLeft className="size-5" />
      </button>

      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* 로고 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">reCree</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            recreate your travel memories
          </p>
        </div>

        {/* Google 로그인 */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-semibold text-black bg-brand hover:opacity-90 active:scale-95 transition-all"
        >
          <GoogleIcon />
          Google로 계속하기
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
