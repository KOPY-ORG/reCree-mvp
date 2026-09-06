import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * 서버 컴포넌트/라우트 핸들러에서 현재 로그인된 유저를 조회합니다.
 * Supabase 세션으로 user.id를 획득한 뒤 Prisma users 테이블에서 조회합니다.
 *
 * React.cache 로 감싸 같은 요청 안에서는 한 번만 조회합니다.
 * (user)/layout.tsx 와 각 page.tsx 가 따로 호출해 Supabase 왕복이 매번 2회 이상 돌던 것을
 * 1회로 줄입니다. 요청이 다르면 다시 조회하므로 stale 위험은 없습니다.
 * dbUser 가 없을 때의 signOut() 도 요청당 한 번만 실행됩니다.
 *
 * @returns Prisma User 객체 또는 null (비로그인 시)
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

  if (!dbUser) {
    await supabase.auth.signOut();
    return null;
  }

  return dbUser;
});
