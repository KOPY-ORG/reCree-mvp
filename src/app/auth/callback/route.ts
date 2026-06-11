import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const { user } = data.session;

  // Prisma users 테이블에 upsert + Google 프로필 사진 URL 정리 병렬 실행
  const [dbUser] = await Promise.all([
    prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email!,
      },
      update: {
        email: user.email!,
      },
    }),
    prisma.user.updateMany({
      where: {
        id: user.id,
        profileImageUrl: { contains: "googleusercontent.com" },
      },
      data: { profileImageUrl: null },
    }),
  ]);

  // 온보딩 미완료 유저 → /onboarding
  if (!dbUser.termsAcceptedAt) {
    return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
