/**
 * recreeshot-images 버킷에서 DB에 기록 없는 고아 파일을 삭제합니다.
 * 실행: pnpm tsx scripts/cleanup-orphaned-images.ts
 */

process.loadEnvFile(".env.local");

import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const BUCKET = "recreeshot-images";
const DRY_RUN = process.argv.includes("--dry-run"); // --dry-run 플래그 시 실제 삭제 안 함

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN 모드 (실제 삭제 없음)\n" : "🗑️  실제 삭제 모드\n");

  // Supabase admin 클라이언트
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Prisma 클라이언트
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // 1. DB에서 실제 사용 중인 URL 수집 (DELETED 제외)
  const recreeshots = await prisma.reCreeshot.findMany({
    where: { status: { not: "DELETED" } },
    select: { imageUrl: true, referencePhotoUrl: true },
  });

  const usedUrls = new Set<string>();
  for (const r of recreeshots) {
    if (r.imageUrl) usedUrls.add(r.imageUrl);
    if (r.referencePhotoUrl) usedUrls.add(r.referencePhotoUrl);
  }
  console.log(`DB에서 사용 중인 파일: ${usedUrls.size}개\n`);

  // 2. Storage에서 유저 폴더 목록 조회
  const { data: folders } = await supabase.storage.from(BUCKET).list();
  if (!folders) { console.log("버킷이 비어있습니다."); return; }

  const orphaned: string[] = [];

  for (const folder of folders) {
    const { data: files } = await supabase.storage.from(BUCKET).list(folder.name);
    if (!files) continue;

    for (const file of files) {
      const path = `${folder.name}/${file.name}`;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = data.publicUrl;

      if (!usedUrls.has(publicUrl)) {
        orphaned.push(path);
        console.log(`  고아 파일: ${path}`);
      }
    }
  }

  console.log(`\n총 고아 파일: ${orphaned.length}개`);

  if (orphaned.length === 0) {
    console.log("삭제할 파일이 없습니다.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  if (!DRY_RUN) {
    const { error } = await supabase.storage.from(BUCKET).remove(orphaned);
    if (error) {
      console.error("삭제 오류:", error.message);
    } else {
      console.log(`✅ ${orphaned.length}개 파일 삭제 완료`);
    }
  } else {
    console.log("\n실제로 삭제하려면: pnpm tsx scripts/cleanup-orphaned-images.ts");
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
