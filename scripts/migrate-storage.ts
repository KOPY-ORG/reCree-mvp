/**
 * Supabase Storage → Cloudflare R2 마이그레이션 스크립트
 *
 * 사용법:
 *   pnpm tsx scripts/migrate-storage.ts          # 실제 마이그레이션
 *   pnpm tsx scripts/migrate-storage.ts --dry-run # 드라이런 (DB/R2 변경 없음)
 *
 * 환경변수: .env.local 자동 로드
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// .env.local 로드 (CLI는 자동 로드 안 됨)
process.loadEnvFile(".env.local");

// ─── 설정 ────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL!;

// 마이그레이션 대상 Supabase 버킷 목록
const SUPABASE_BUCKETS = ["recreeshot-images", "post-images", "profile-images"];

// ─── 클라이언트 초기화 ────────────────────────────────────────────────────────

function validateEnv() {
  const required = {
    NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_KEY,
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME,
    NEXT_PUBLIC_CDN_URL: CDN_URL,
    DATABASE_URL: process.env.DATABASE_URL,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    console.error("❌ 누락된 환경변수:", missing.join(", "));
    process.exit(1);
  }
}

const supabase = () =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

const r2 = () =>
  new S3Client({
    region: "us-east-1",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

const prismaClient = () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
};

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function supabasePublicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

function cdnUrl(bucket: string, path: string): string {
  return `${CDN_URL}/${bucket}/${path}`;
}

/** Supabase URL에서 버킷 내 경로 추출 */
function extractPath(url: string, bucket: string): string | null {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
  if (url.startsWith(prefix)) return url.slice(prefix.length);
  return null;
}

/** R2에 이미 파일이 존재하는지 확인 */
async function existsInR2(client: S3Client, bucket: string, path: string): Promise<boolean> {
  try {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: `${bucket}/${path}`,
        MaxKeys: 1,
      }),
    );
    return (result.Contents?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

// ─── 파일 마이그레이션 ─────────────────────────────────────────────────────────

interface MigrateResult {
  bucket: string;
  total: number;
  copied: number;
  skipped: number;
  failed: string[];
}

async function migrateFilesInBucket(
  supa: ReturnType<typeof createClient>,
  r2Client: S3Client,
  bucket: string,
): Promise<MigrateResult> {
  console.log(`\n📦 버킷 처리 중: ${bucket}`);

  // Supabase Storage에서 파일 목록 조회 (폴더 재귀)
  const allPaths = await listAllFiles(supa, bucket, "");
  console.log(`  → 총 ${allPaths.length}개 파일 발견`);

  const result: MigrateResult = { bucket, total: allPaths.length, copied: 0, skipped: 0, failed: [] };

  for (const path of allPaths) {
    // R2에 이미 존재하면 건너뜀
    const alreadyExists = await existsInR2(r2Client, bucket, path);
    if (alreadyExists) {
      result.skipped++;
      process.stdout.write(".");
      continue;
    }

    if (DRY_RUN) {
      result.copied++;
      process.stdout.write("d");
      continue;
    }

    try {
      // Supabase에서 다운로드
      const { data, error } = await supa.storage.from(bucket).download(path);
      if (error || !data) throw new Error(error?.message ?? "다운로드 실패");

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = data.type || "application/octet-stream";

      // R2에 업로드
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: `${bucket}/${path}`,
          Body: buffer,
          ContentType: contentType,
        }),
      );

      result.copied++;
      process.stdout.write("✓");
    } catch (e) {
      result.failed.push(path);
      process.stdout.write("✗");
      console.error(`\n  ⚠️  실패: ${path}`, e instanceof Error ? e.message : e);
    }
  }

  console.log(); // 줄바꿈
  return result;
}

/** Supabase Storage 버킷의 모든 파일 경로 재귀 조회 */
async function listAllFiles(
  supa: ReturnType<typeof createClient>,
  bucket: string,
  folder: string,
): Promise<string[]> {
  const { data, error } = await supa.storage.from(bucket).list(folder, { limit: 1000 });
  if (error || !data) return [];

  const paths: string[] = [];
  for (const item of data) {
    const fullPath = folder ? `${folder}/${item.name}` : item.name;
    if (item.id === null) {
      // 폴더
      const children = await listAllFiles(supa, bucket, fullPath);
      paths.push(...children);
    } else {
      // 파일
      paths.push(fullPath);
    }
  }
  return paths;
}

// ─── DB URL 업데이트 ──────────────────────────────────────────────────────────

interface DbUpdateResult {
  table: string;
  field: string;
  bucket: string;
  updated: number;
}

async function updateDbUrls(prisma: PrismaClient): Promise<DbUpdateResult[]> {
  const results: DbUpdateResult[] = [];

  // ReCreeShot.imageUrl (recreeshot-images)
  {
    const bucket = "recreeshot-images";
    const prefix = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
    const shots = await prisma.reCreeshot.findMany({
      where: { imageUrl: { startsWith: prefix } },
      select: { id: true, imageUrl: true },
    });
    console.log(`  ReCreeShot.imageUrl: ${shots.length}개 업데이트 필요`);
    if (!DRY_RUN) {
      for (const shot of shots) {
        const path = extractPath(shot.imageUrl, bucket)!;
        await prisma.reCreeshot.update({
          where: { id: shot.id },
          data: { imageUrl: cdnUrl(bucket, path) },
        });
      }
    }
    results.push({ table: "ReCreeShot", field: "imageUrl", bucket, updated: shots.length });
  }

  // ReCreeShot.referencePhotoUrl (recreeshot-images)
  {
    const bucket = "recreeshot-images";
    const prefix = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
    const shots = await prisma.reCreeshot.findMany({
      where: { referencePhotoUrl: { startsWith: prefix } },
      select: { id: true, referencePhotoUrl: true },
    });
    console.log(`  ReCreeShot.referencePhotoUrl: ${shots.length}개 업데이트 필요`);
    if (!DRY_RUN) {
      for (const shot of shots) {
        const path = extractPath(shot.referencePhotoUrl!, bucket)!;
        await prisma.reCreeshot.update({
          where: { id: shot.id },
          data: { referencePhotoUrl: cdnUrl(bucket, path) },
        });
      }
    }
    results.push({ table: "ReCreeShot", field: "referencePhotoUrl", bucket, updated: shots.length });
  }

  // PostImage.url (post-images)
  {
    const bucket = "post-images";
    const prefix = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
    const postImages = await prisma.postImage.findMany({
      where: { url: { startsWith: prefix } },
      select: { id: true, url: true },
    });
    console.log(`  PostImage.url: ${postImages.length}개 업데이트 필요`);
    if (!DRY_RUN) {
      for (const img of postImages) {
        const path = extractPath(img.url, bucket)!;
        await prisma.postImage.update({
          where: { id: img.id },
          data: { url: cdnUrl(bucket, path) },
        });
      }
    }
    results.push({ table: "PostImage", field: "url", bucket, updated: postImages.length });
  }

  // Post.recreePhotoUrl (post-images)
  {
    const bucket = "post-images";
    const prefix = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
    const posts = await prisma.post.findMany({
      where: { recreePhotoUrl: { startsWith: prefix } },
      select: { id: true, recreePhotoUrl: true },
    });
    console.log(`  Post.recreePhotoUrl: ${posts.length}개 업데이트 필요`);
    if (!DRY_RUN) {
      for (const post of posts) {
        const path = extractPath(post.recreePhotoUrl!, bucket)!;
        await prisma.post.update({
          where: { id: post.id },
          data: { recreePhotoUrl: cdnUrl(bucket, path) },
        });
      }
    }
    results.push({ table: "Post", field: "recreePhotoUrl", bucket, updated: posts.length });
  }

  // User.profileImageUrl (profile-images)
  {
    const bucket = "profile-images";
    const prefix = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
    const users = await prisma.user.findMany({
      where: { profileImageUrl: { startsWith: prefix } },
      select: { id: true, profileImageUrl: true },
    });
    console.log(`  User.profileImageUrl: ${users.length}개 업데이트 필요`);
    if (!DRY_RUN) {
      for (const user of users) {
        const path = extractPath(user.profileImageUrl!, bucket)!;
        await prisma.user.update({
          where: { id: user.id },
          data: { profileImageUrl: cdnUrl(bucket, path) },
        });
      }
    }
    results.push({ table: "User", field: "profileImageUrl", bucket, updated: users.length });
  }

  return results;
}

// ─── 검증 ─────────────────────────────────────────────────────────────────────

async function verifyMigration(prisma: PrismaClient) {
  console.log("\n🔍 마이그레이션 검증 중...");
  const supabasePrefix = `${SUPABASE_URL}/storage/v1/object/public/`;

  const remaining = {
    "ReCreeShot.imageUrl": await prisma.reCreeshot.count({ where: { imageUrl: { startsWith: supabasePrefix } } }),
    "ReCreeShot.referencePhotoUrl": await prisma.reCreeshot.count({ where: { referencePhotoUrl: { startsWith: supabasePrefix } } }),
    "PostImage.url": await prisma.postImage.count({ where: { url: { startsWith: supabasePrefix } } }),
    "Post.recreePhotoUrl": await prisma.post.count({ where: { recreePhotoUrl: { startsWith: supabasePrefix } } }),
    "User.profileImageUrl": await prisma.user.count({ where: { profileImageUrl: { startsWith: supabasePrefix } } }),
  };

  const totalRemaining = Object.values(remaining).reduce((a, b) => a + b, 0);
  if (totalRemaining === 0) {
    console.log("  ✅ 모든 DB URL이 CDN URL로 변환되었습니다.");
  } else {
    console.log("  ⚠️  아직 Supabase URL이 남아있는 레코드:");
    for (const [key, count] of Object.entries(remaining)) {
      if (count > 0) console.log(`    - ${key}: ${count}개`);
    }
  }
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  validateEnv();

  console.log("═══════════════════════════════════════════════════════");
  console.log("  Supabase Storage → Cloudflare R2 마이그레이션");
  console.log(DRY_RUN ? "  모드: DRY-RUN (실제 변경 없음)" : "  모드: 실제 마이그레이션");
  console.log("═══════════════════════════════════════════════════════\n");

  const supa = supabase();
  const r2Client = r2();
  const prisma = prismaClient();

  try {
    // 1단계: 파일 복사
    console.log("📁 1단계: 파일 복사 (Supabase → R2)");
    const fileResults: MigrateResult[] = [];
    for (const bucket of SUPABASE_BUCKETS) {
      const result = await migrateFilesInBucket(supa, r2Client, bucket);
      fileResults.push(result);
    }

    // 파일 복사 요약
    console.log("\n📊 파일 복사 요약:");
    let totalCopied = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    for (const r of fileResults) {
      console.log(`  ${r.bucket}: 총 ${r.total}개 | 복사 ${r.copied} | 스킵 ${r.skipped} | 실패 ${r.failed.length}`);
      totalCopied += r.copied;
      totalSkipped += r.skipped;
      totalFailed += r.failed.length;
      if (r.failed.length > 0) {
        console.log("    실패 목록:", r.failed.join(", "));
      }
    }
    console.log(`  합계: 복사 ${totalCopied} | 스킵 ${totalSkipped} | 실패 ${totalFailed}`);

    if (totalFailed > 0) {
      console.log("\n⚠️  일부 파일 복사에 실패했습니다. DB 업데이트를 계속하시겠습니까?");
      // 실패한 파일이 있어도 계속 진행 (실패한 URL은 Supabase URL로 유지됨)
    }

    // 2단계: DB URL 업데이트
    console.log("\n🗄️  2단계: DB URL 업데이트 (Supabase URL → CDN URL)");
    const dbResults = await updateDbUrls(prisma);

    console.log("\n📊 DB 업데이트 요약:");
    for (const r of dbResults) {
      const label = DRY_RUN ? "업데이트 예정" : "업데이트됨";
      console.log(`  ${r.table}.${r.field}: ${r.updated}개 ${label}`);
    }

    // 3단계: 검증 (드라이런이 아닌 경우)
    if (!DRY_RUN) {
      await verifyMigration(prisma);
    }

    console.log("\n✅ 마이그레이션 완료!");
    if (DRY_RUN) {
      console.log("   실제 마이그레이션을 실행하려면 --dry-run 플래그 없이 실행하세요.");
    } else {
      console.log("   다음 단계:");
      console.log("   1. 앱에서 이미지가 정상 표시되는지 확인");
      console.log("   2. Supabase Storage 버킷 삭제 (선택 사항)");
      console.log("   3. next.config.ts에서 Supabase remotePatterns 제거 (선택 사항)");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ 마이그레이션 실패:", e);
  process.exit(1);
});
