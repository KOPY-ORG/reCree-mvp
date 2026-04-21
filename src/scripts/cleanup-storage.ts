/**
 * R2 스토리지 좀비 파일 정리 스크립트
 *
 * R2에는 있지만 DB에 없는 파일을 탐지하고 삭제합니다.
 * 대상 버킷: place-images, post-images, recreeshot-images, profile-images
 *
 * 사용법:
 *   npx tsx src/scripts/cleanup-storage.ts           # dry-run (목록만 출력)
 *   npx tsx src/scripts/cleanup-storage.ts --execute  # 실제 삭제
 */

import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local이 없으면 무시
}

const BUCKETS = ["place-images", "post-images", "recreeshot-images", "profile-images"] as const;
type Bucket = (typeof BUCKETS)[number];

const BATCH_SIZE = 100;

// ── R2 유틸 ────────────────────────────────────────────────────────────────

function toCdnUrl(cdnUrl: string, key: string): string {
  return `${cdnUrl}/${key}`;
}

/**
 * R2에서 특정 prefix로 시작하는 모든 파일 키를 수집합니다.
 * ContinuationToken으로 페이징 처리합니다.
 */
async function listAllR2Files(r2: S3Client, bucketName: string, prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const res: ListObjectsV2CommandOutput = await r2.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

// ── 메인 로직 ───────────────────────────────────────────────────────────────

async function main() {
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME;
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;
  const databaseUrl = process.env.DATABASE_URL;

  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName || !cdnUrl || !databaseUrl) {
    console.error(
      "❌ 환경변수가 설정되지 않았습니다. .env.local에 아래 값이 필요합니다:\n" +
        "   R2_ACCOUNT_ID\n" +
        "   R2_ACCESS_KEY_ID\n" +
        "   R2_SECRET_ACCESS_KEY\n" +
        "   R2_BUCKET_NAME\n" +
        "   NEXT_PUBLIC_CDN_URL\n" +
        "   DATABASE_URL",
    );
    process.exit(1);
  }

  const isDryRun = !process.argv.includes("--execute");

  console.log("━".repeat(60));
  console.log(`🧹 R2 스토리지 좀비 파일 정리  [${isDryRun ? "DRY RUN" : "⚡ EXECUTE"}]`);
  console.log(`📦 대상 버킷: ${BUCKETS.join(", ")}`);
  console.log("━".repeat(60));

  const r2 = new S3Client({
    region: "us-east-1",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2AccessKeyId, secretAccessKey: r2SecretAccessKey },
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    // ── 1. DB에서 모든 이미지 CDN URL 수집 ──────────────────────────────────
    console.log("\n📋 DB 이미지 URL 수집 중...");

    const [
      placeImageRows,
      postImageRows,
      postRecreeRows,
      reCreeshotRows,
      userProfileRows,
    ] = await Promise.all([
      prisma.placeImage.findMany({ select: { url: true } }),
      prisma.postImage.findMany({ select: { url: true, originalUrl: true } }),
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
      ...postImageRows.flatMap((r) => [r.url, r.originalUrl].filter((u): u is string => u != null)),
      ...postRecreeRows.map((r) => r.recreePhotoUrl!),
      ...reCreeshotRows.flatMap((r) =>
        [r.imageUrl, r.referencePhotoUrl].filter((u): u is string => !!u),
      ),
      ...userProfileRows.map((r) => r.profileImageUrl!),
    ]);

    console.log(`  PlaceImage           : ${placeImageRows.length}개`);
    console.log(`  PostImage            : ${postImageRows.length}개`);
    console.log(`  Post.recreePhoto     : ${postRecreeRows.length}개`);
    console.log(`  ReCreeshot 이미지    : ${reCreeshotRows.length}개 (imageUrl + referencePhotoUrl)`);
    console.log(`  User.profileImage    : ${userProfileRows.length}개`);
    console.log(`  총 DB URL            : ${dbUrls.size}개`);

    // ── 2. 버킷별 좀비 파일 탐지 ─────────────────────────────────────────
    let totalZombies = 0;
    const zombiesByBucket = new Map<Bucket, string[]>();

    for (const bucket of BUCKETS) {
      console.log(`\n🪣  [${bucket}] R2 파일 목록 조회 중...`);

      const r2Keys = await listAllR2Files(r2, r2BucketName, `${bucket}/`);
      console.log(`  R2 파일 수: ${r2Keys.length}개`);

      const zombies = r2Keys.filter(
        (key) => !dbUrls.has(toCdnUrl(cdnUrl, key)),
      );

      zombiesByBucket.set(bucket, zombies);
      totalZombies += zombies.length;

      if (zombies.length === 0) {
        console.log(`  ✅ 좀비 파일 없음`);
      } else {
        console.log(`  ⚠️  좀비 파일 ${zombies.length}개:`);
        zombies.forEach((k) => console.log(`    - ${k}`));
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
        const { Deleted, Errors } = await r2.send(
          new DeleteObjectsCommand({
            Bucket: r2BucketName,
            Delete: { Objects: batch.map((Key) => ({ Key })) },
          }),
        );
        deletedCount += Deleted?.length ?? 0;
        if (Errors?.length) {
          console.error(`  ❌ [${bucket}] 삭제 오류:`, Errors);
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
