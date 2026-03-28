/**
 * Supabase Storage 좀비 파일 정리 스크립트
 *
 * Storage에는 있지만 DB에 없는 파일을 탐지하고 삭제합니다.
 * 대상 버킷: place-images, post-images, recreeshot-images, profile-images
 *
 * 사용법:
 *   npx tsx src/scripts/cleanup-storage.ts           # dry-run (목록만 출력)
 *   npx tsx src/scripts/cleanup-storage.ts --execute  # 실제 삭제
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// tsx는 .env.local을 자동으로 읽지 않으므로 명시적으로 로드
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local이 없으면 무시 (환경변수가 직접 주입된 경우)
}

const BUCKETS = ["place-images", "post-images", "recreeshot-images", "profile-images"] as const;
type Bucket = (typeof BUCKETS)[number];

const BATCH_SIZE = 100; // Storage.remove() 한 번에 처리할 파일 수

// ── Storage 유틸 ────────────────────────────────────────────────────────────

function toPublicUrl(supabaseUrl: string, bucket: string, path: string): string {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * 버킷 내 모든 파일 경로를 재귀적으로 수집합니다.
 * Supabase Storage는 파일을 flat하게 저장하지만 가상 폴더 구조를 가집니다.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function listAllFiles(
  supabase: SupabaseClient<any, any, any>,
  bucket: string,
  prefix = "",
): Promise<string[]> {
  const PAGE_SIZE = 1000;
  let offset = 0;
  const result: string[] = [];

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: PAGE_SIZE, offset });

    if (error) {
      throw new Error(`Storage 목록 조회 실패 [${bucket}/${prefix || ""}]: ${error.message}`);
    }
    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      // id가 null이면 가상 폴더 → 재귀 탐색
      if (item.id === null) {
        const children = await listAllFiles(supabase, bucket, fullPath);
        result.push(...children);
      } else {
        result.push(fullPath);
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return result;
}

// ── 메인 로직 ───────────────────────────────────────────────────────────────

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
    console.error(
      "❌ 환경변수가 설정되지 않았습니다. .env.local에 아래 값이 필요합니다:\n" +
        "   NEXT_PUBLIC_SUPABASE_URL\n" +
        "   SUPABASE_SERVICE_ROLE_KEY\n" +
        "   DATABASE_URL",
    );
    process.exit(1);
  }

  const isDryRun = !process.argv.includes("--execute");

  console.log("━".repeat(60));
  console.log(`🧹 Storage 좀비 파일 정리  [${isDryRun ? "DRY RUN" : "⚡ EXECUTE"}]`);
  console.log(`📦 대상 버킷: ${BUCKETS.join(", ")}`);
  console.log("━".repeat(60));

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    // ── 1. DB에서 모든 이미지 URL 수집 ──────────────────────────────────
    console.log("\n📋 DB 이미지 URL 수집 중...");

    const [
      placeImageRows,
      postImageRows,
      postRecreeRows,
      reCreeshotRows,
      userProfileRows,
    ] = await Promise.all([
      prisma.placeImage.findMany({ select: { url: true } }),
      prisma.postImage.findMany({ select: { url: true } }),
      prisma.post.findMany({
        where: { recreePhotoUrl: { not: null } },
        select: { recreePhotoUrl: true },
      }),
      prisma.reCreeshot.findMany({
        select: { imageUrl: true, referencePhotoUrl: true },
      }),
      prisma.user.findMany({
        where: { profileImageUrl: { not: null } },
        select: { profileImageUrl: true },
      }),
    ]);

    const dbUrls = new Set<string>([
      ...placeImageRows.map((r) => r.url),
      ...postImageRows.map((r) => r.url),
      ...postRecreeRows.map((r) => r.recreePhotoUrl!),
      ...reCreeshotRows.flatMap((r) =>
        [r.imageUrl, r.referencePhotoUrl].filter((u): u is string => !!u),
      ),
      ...userProfileRows.map((r) => r.profileImageUrl!),
    ]);

    console.log(`  PlaceImage           : ${placeImageRows.length}개`);
    console.log(`  PostImage            : ${postImageRows.length}개`);
    console.log(`  Post.recreePhoto     : ${postRecreeRows.length}개`);
    console.log(`  ReCreeshot 이미지     : ${reCreeshotRows.length}개 (imageUrl + referencePhotoUrl)`);
    console.log(`  User.profileImage    : ${userProfileRows.length}개`);
    console.log(`  총 DB URL            : ${dbUrls.size}개`);

    // ── 2. 버킷별 좀비 파일 탐지 ─────────────────────────────────────────
    let totalZombies = 0;
    const zombiesByBucket = new Map<Bucket, string[]>();

    for (const bucket of BUCKETS) {
      console.log(`\n🪣  [${bucket}] Storage 목록 조회 중...`);

      const storagePaths = await listAllFiles(supabase, bucket);
      console.log(`  Storage 파일 수: ${storagePaths.length}개`);

      const zombies = storagePaths.filter(
        (path) => !dbUrls.has(toPublicUrl(supabaseUrl, bucket, path)),
      );

      zombiesByBucket.set(bucket, zombies);
      totalZombies += zombies.length;

      if (zombies.length === 0) {
        console.log(`  ✅ 좀비 파일 없음`);
      } else {
        console.log(`  ⚠️  좀비 파일 ${zombies.length}개:`);
        zombies.forEach((p) => console.log(`    - ${p}`));
      }
    }

    // ── 3. 결과 요약 ──────────────────────────────────────────────────────
    console.log("\n" + "━".repeat(60));
    console.log(`📊 총 좀비 파일: ${totalZombies}개`);

    if (totalZombies === 0) {
      console.log("🎉 정리할 파일이 없습니다.");
      return;
    }

    if (isDryRun) {
      console.log("\n💡 실제 삭제하려면 --execute 플래그를 추가하세요:");
      console.log("   npx tsx src/scripts/cleanup-storage.ts --execute");
      return;
    }

    // ── 4. 실제 삭제 ──────────────────────────────────────────────────────
    console.log("\n🗑️  파일 삭제 중...");

    for (const bucket of BUCKETS) {
      const zombies = zombiesByBucket.get(bucket)!;
      if (zombies.length === 0) continue;

      let deletedCount = 0;

      for (let i = 0; i < zombies.length; i += BATCH_SIZE) {
        const batch = zombies.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.storage.from(bucket).remove(batch);
        if (error) {
          console.error(`  ❌ [${bucket}] 배치 삭제 실패 (offset ${i}): ${error.message}`);
        } else {
          deletedCount += batch.length;
        }
      }

      console.log(`  ✅ [${bucket}] ${deletedCount}/${zombies.length}개 삭제 완료`);
    }

    console.log("\n🎉 정리 완료!");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("💥 오류 발생:", e);
  process.exit(1);
});
