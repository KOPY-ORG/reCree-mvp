/**
 * DB에 남아있는 broken Supabase Storage URL 정리 스크립트
 *
 * 대상:
 *   - ReCreeshot.referencePhotoUrl: Supabase URL → null로 업데이트
 *     (post-images 버킷 → 이미 R2로 마이그레이션됐으나 R2에 파일 없음 = broken)
 *
 * 주의:
 *   - PostImage.url (place-images 버킷)은 Step 2 마이그레이션 완료 후 별도 처리
 *
 * 사용법:
 *   pnpm tsx scripts/cleanup-db-supabase-urls.ts          # 실제 실행
 *   pnpm tsx scripts/cleanup-db-supabase-urls.ts --dry-run # 드라이런 (DB 변경 없음)
 *
 * 환경변수: .env.local 자동 로드
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

process.loadEnvFile(".env.local");

const DRY_RUN = process.argv.includes("--dry-run");

function isSupabaseUrl(url: string): boolean {
  return url.includes(".supabase.co/storage/");
}

const prismaClient = () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
};

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL 환경변수가 없습니다.");
    process.exit(1);
  }

  console.log(DRY_RUN ? "🔍 드라이런 모드 (DB 변경 없음)\n" : "🚀 실제 실행 모드\n");

  const prisma = prismaClient();

  try {
    // ─── 1. ReCreeshot.referencePhotoUrl ──────────────────────────────────────
    console.log("── Step 1: ReCreeshot.referencePhotoUrl ──");

    const reCreeShotsWithSupabaseRef = await prisma.reCreeshot.findMany({
      where: { referencePhotoUrl: { not: null } },
      select: { id: true, referencePhotoUrl: true },
    });

    const reCreeShotsToNull = reCreeShotsWithSupabaseRef.filter(
      (r) => r.referencePhotoUrl && isSupabaseUrl(r.referencePhotoUrl),
    );

    console.log(`  대상: ${reCreeShotsToNull.length}개`);
    reCreeShotsToNull.forEach((r) => console.log(`  - ${r.id}: ${r.referencePhotoUrl}`));

    if (!DRY_RUN && reCreeShotsToNull.length > 0) {
      const result = await prisma.reCreeshot.updateMany({
        where: { id: { in: reCreeShotsToNull.map((r) => r.id) } },
        data: { referencePhotoUrl: null },
      });
      console.log(`  ✅ ${result.count}개 → null로 업데이트 완료`);
    } else if (DRY_RUN) {
      console.log(`  (드라이런) ${reCreeShotsToNull.length}개를 null로 업데이트할 예정`);
    }

    // ─── 요약 ─────────────────────────────────────────────────────────────────
    console.log("\n── 요약 ──");
    console.log(`  ReCreeshot.referencePhotoUrl null 처리: ${reCreeShotsToNull.length}개`);
    console.log("  PostImage.url (place-images 버킷): Step 2 마이그레이션 완료 후 처리 예정");
    if (DRY_RUN) console.log("\n✅ 드라이런 완료. --dry-run 없이 실행하면 실제 변경됩니다.");
    else console.log("\n✅ 완료.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
