import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * 서버 컴포넌트/라우트 핸들러에서 현재 로그인된 유저를 조회합니다.
 * Supabase 세션으로 user.id를 획득한 뒤 Prisma users 테이블에서 조회합니다.
 *
 * @returns Prisma User 객체 또는 null (비로그인 시)
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return prisma.user.findUnique({ where: { id: user.id } });
}
