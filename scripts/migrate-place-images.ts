/**
 * place-images 버킷 Supabase Storage → Cloudflare R2 마이그레이션 스크립트
 *
 * 대상 파일: Supabase place-images 버킷 전체
 * 대상 DB:
 *   - PlaceImage.url
 *   - Place.imageUrl
 *   - PostImage.url (place-images 버킷 참조분)
 *
 * 사용법:
 *   pnpm tsx scripts/migrate-place-images.ts          # 실제 마이그레이션
 *   pnpm tsx scripts/migrate-place-images.ts --dry-run # 드라이런 (DB/R2 변경 없음)
 *
 * 환경변수: .env.local 자동 로드
 */

import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

process.loadEnvFile(".env.local");

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL!;
const BUCKET = "place-images";

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
  const missing = Object.entries(required).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    console.error("❌ 누락된 환경변수:", missing.join(", "));
    process.exit(1);
  }
}

const supabase = () => createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const r2 = () => new S3Client({
  region: "us-east-1",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const prismaClient = () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
};

function extractPath(url: string): string | null {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

function cdnUrl(path: string): string {
  return `${CDN_URL}/${BUCKET}/${path}`;
}

async function existsInR2(r2Client: S3Client, path: string): Promise<boolean> {
  try {
    const result = await r2Client.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: `${BUCKET}/${path}`,
      MaxKeys: 1,
    }));
    return (result.Contents?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

async function listAllFiles(supa: ReturnType<typeof createClient>, folder: string): Promise<string[]> {
  const { data, error } = await supa.storage.from(BUCKET).list(folder, { limit: 1000 });
  if (error || !data) return [];

  const paths: string[] = [];
  for (const item of data) {
    const fullPath = folder ? `${folder}/${item.name}` : item.name;
    if (item.id === null) {
      paths.push(...await listAllFiles(supa, fullPath));
    } else {
      paths.push(fullPath);
    }
  }
  return paths;
}

async function migrateFiles(supa: ReturnType<typeof createClient>, r2Client: S3Client) {
  console.log(`\n📦 버킷 처리 중: ${BUCKET}`);
  const allPaths = await listAllFiles(supa, "");
  console.log(`  → 총 ${allPaths.length}개 파일 발견`);

  let copied = 0, skipped = 0;
  const failed: string[] = [];

  for (const path of allPaths) {
    if (await existsInR2(r2Client, path)) {
      skipped++;
      process.stdout.write(".");
      continue;
    }

    if (DRY_RUN) {
      copied++;
      process.stdout.write("d");
      continue;
    }

    try {
      const { data, error } = await supa.storage.from(BUCKET).download(path);
      if (error || !data) throw new Error(error?.message ?? "다운로드 실패");

      const buffer = Buffer.from(await data.arrayBuffer());
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: `${BUCKET}/${path}`,
        Body: buffer,
        ContentType: data.type || "application/octet-stream",
      }));

      copied++;
      process.stdout.write("✓");
    } catch (e) {
      failed.push(path);
      process.stdout.write("✗");
      console.error(`\n  ⚠️  실패: ${path}`, e instanceof Error ? e.message : e);
    }
  }

  console.log();
  console.log(`  복사 ${copied} | 스킵 ${skipped} | 실패 ${failed.length}`);
  if (failed.length > 0) console.log("  실패 목록:", failed.join(", "));
  return { copied, skipped, failed };
}

async function updateDbUrls(prisma: PrismaClient) {
  console.log("\n🗄️  DB URL 업데이트 중...");
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;

  // PlaceImage.url
  const placeImages = await prisma.placeImage.findMany({
    where: { url: { startsWith: prefix } },
    select: { id: true, url: true },
  });
  console.log(`  PlaceImage.url: ${placeImages.length}개`);
  if (!DRY_RUN) {
    for (const img of placeImages) {
      const path = extractPath(img.url)!;
      await prisma.placeImage.update({ where: { id: img.id }, data: { url: cdnUrl(path) } });
    }
  }

  // Place.imageUrl
  const places = await prisma.place.findMany({
    where: { imageUrl: { startsWith: prefix } },
    select: { id: true, imageUrl: true },
  });
  console.log(`  Place.imageUrl: ${places.length}개`);
  if (!DRY_RUN) {
    for (const place of places) {
      const path = extractPath(place.imageUrl!)!;
      await prisma.place.update({ where: { id: place.id }, data: { imageUrl: cdnUrl(path) } });
    }
  }

  // PostImage.url (place-images 버킷 참조분)
  const postImages = await prisma.postImage.findMany({
    where: { url: { startsWith: prefix } },
    select: { id: true, url: true },
  });
  console.log(`  PostImage.url (place-images 참조): ${postImages.length}개`);
  if (!DRY_RUN) {
    for (const img of postImages) {
      const path = extractPath(img.url)!;
      await prisma.postImage.update({ where: { id: img.id }, data: { url: cdnUrl(path) } });
    }
  }

  return {
    placeImages: placeImages.length,
    places: places.length,
    postImages: postImages.length,
  };
}

async function verify(prisma: PrismaClient) {
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  const remaining = {
    "PlaceImage.url": await prisma.placeImage.count({ where: { url: { startsWith: prefix } } }),
    "Place.imageUrl": await prisma.place.count({ where: { imageUrl: { startsWith: prefix } } }),
    "PostImage.url": await prisma.postImage.count({ where: { url: { startsWith: prefix } } }),
  };
  const total = Object.values(remaining).reduce((a, b) => a + b, 0);
  if (total === 0) {
    console.log("  ✅ 모든 place-images URL이 CDN URL로 변환됐습니다.");
  } else {
    console.log("  ⚠️  아직 Supabase URL이 남아있는 레코드:");
    for (const [k, v] of Object.entries(remaining)) {
      if (v > 0) console.log(`    - ${k}: ${v}개`);
    }
  }
}

async function main() {
  validateEnv();

  console.log("═══════════════════════════════════════════════════════");
  console.log("  place-images 버킷 Supabase → R2 마이그레이션");
  console.log(DRY_RUN ? "  모드: DRY-RUN" : "  모드: 실제 마이그레이션");
  console.log("═══════════════════════════════════════════════════════\n");

  const supa = supabase();
  const r2Client = r2();
  const prisma = prismaClient();

  try {
    console.log("📁 1단계: 파일 복사 (Supabase → R2)");
    await migrateFiles(supa, r2Client);

    console.log("\n📊 2단계: DB URL 업데이트");
    const dbResult = await updateDbUrls(prisma);

    console.log("\n── DB 업데이트 요약 ──");
    console.log(`  PlaceImage.url: ${dbResult.placeImages}개`);
    console.log(`  Place.imageUrl: ${dbResult.places}개`);
    console.log(`  PostImage.url:  ${dbResult.postImages}개`);

    if (!DRY_RUN) {
      console.log("\n🔍 검증 중...");
      await verify(prisma);
    }

    console.log("\n✅ 완료!");
    if (DRY_RUN) console.log("   실제 마이그레이션: --dry-run 플래그 없이 실행하세요.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ 마이그레이션 실패:", e);
  process.exit(1);
});
