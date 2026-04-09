/**
 * ReCreeshot.referencePhotoUrl 복구 스크립트
 *
 * 배경:
 *   이전 마이그레이션에서 referencePhotoUrl이 post-images 버킷을 참조하는 경우
 *   recreeshot-images 버킷만 처리했기 때문에 DB 업데이트가 누락됨.
 *   Step 1에서 null로 업데이트했지만, 파일은 R2에 이미 존재함 → CDN URL로 복구.
 *
 * 사용법:
 *   pnpm tsx scripts/restore-reference-photo-urls.ts          # 실제 실행
 *   pnpm tsx scripts/restore-reference-photo-urls.ts --dry-run # 드라이런
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

process.loadEnvFile(".env.local");

const DRY_RUN = process.argv.includes("--dry-run");
const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL!;

const prismaClient = () => {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
};

// null로 업데이트되기 전 ID → 원본 Supabase URL 매핑 (dry-run 출력에서 추출)
const SUPABASE_URL = "https://vwfojaivbltsdjttjhxw.supabase.co/storage/v1/object/public";
const RECORDS: { id: string; supabasePath: string }[] = [
  { id: "de6fa18e-5415-4fd4-b91b-351cc95b6a5e", supabasePath: "post-images/original/76789098-abf4-4c1a-a4ad-9a83bf2745ec/1773337107079-dy3c1hpjof5.jpg" },
  { id: "c5b47289-4307-4d4e-ba2c-3854273e53ce", supabasePath: "post-images/recree/951489e1-8ca9-45e8-8309-d2d46a053479/1773821802333.jpg" },
  { id: "0eb0a56a-f411-4b45-990b-0908f48d932f", supabasePath: "post-images/recree/951489e1-8ca9-45e8-8309-d2d46a053479/1773821802333.jpg" },
  { id: "3a8722fb-3486-459d-a1ed-8b844d5e0013", supabasePath: "post-images/recree/4d95eac9-d65a-409c-84dc-b163aed53184/1773845859050.jpg" },
  { id: "1985ef38-b70b-4c29-9dc3-26879c04ea41", supabasePath: "post-images/original/0c7ef351-1766-4316-a845-d7172e2c4eea/1773862033655-488vug1u0ga.png" },
  { id: "78fc25d2-cc79-4cc5-966e-27a4aaf327ba", supabasePath: "post-images/original/cbe1df9b-4e7a-446b-8d11-15115c5a0676/1773343754379-uyylcnfhak.png" },
  { id: "68e44120-81aa-46b7-a301-45834f3bd0a6", supabasePath: "post-images/original/2efb23f0-63c0-4d07-916b-b88216e6d0cf/1773342057407-q10qx3sgd.JPG" },
  { id: "b6bf9515-dfcf-4b18-872f-be91aaa4fa69", supabasePath: "post-images/original/cbe1df9b-4e7a-446b-8d11-15115c5a0676/1773343754379-uyylcnfhak.png" },
  { id: "2cc9b10f-ebb8-4c7d-b9ec-17838f177197", supabasePath: "post-images/original/4d95eac9-d65a-409c-84dc-b163aed53184/1773691060946-91yayepjdx5.png" },
  { id: "a2595b0c-8f2a-4fec-a0dd-842a658a9c2b", supabasePath: "post-images/recree/d2267828-9290-48f5-accc-41fd3261395f/1773862602688.jpg" },
  { id: "1fb4293c-84f8-493e-879c-a4659f19078e", supabasePath: "post-images/original/e25f6961-d95d-47b5-985d-863295f3eb9f/1773501553455-vo1x3by3rep.png" },
  { id: "7619feaf-54e6-4d4b-980d-b4e3cece33d9", supabasePath: "post-images/original/76789098-abf4-4c1a-a4ad-9a83bf2745ec/1773337107079-dy3c1hpjof5.jpg" },
  { id: "f408e9ae-8836-448c-9ba6-e92b66660b87", supabasePath: "post-images/original/b701df2e-33c6-409d-98ea-35bbe445c3e9/1773397405253-x9zqr4bgsqa.png" },
  { id: "c414c377-8cf6-47b7-b319-62809e4391c6", supabasePath: "post-images/original/0fc8caa6-95ca-47b1-9e60-4041db2a767d/1773896965454-9lbsr18h8p.png" },
  { id: "5dbe92a9-ed21-4fad-99f5-f66d720642ba", supabasePath: "post-images/original/76789098-abf4-4c1a-a4ad-9a83bf2745ec/1773337107079-dy3c1hpjof5.jpg" },
  { id: "a32a42da-9a70-41ac-9e7d-8e549e774673", supabasePath: "post-images/recree/4d95eac9-d65a-409c-84dc-b163aed53184/1773845859050.jpg" },
];

async function main() {
  if (!CDN_URL || !process.env.DATABASE_URL) {
    console.error("❌ 환경변수 누락: NEXT_PUBLIC_CDN_URL, DATABASE_URL");
    process.exit(1);
  }

  console.log(DRY_RUN ? "🔍 드라이런 모드\n" : "🚀 실제 실행 모드\n");

  const prisma = prismaClient();

  try {
    for (const { id, supabasePath } of RECORDS) {
      const cdnUrl = `${CDN_URL}/${supabasePath}`;
      console.log(`  ${id}`);
      console.log(`    Supabase: ${SUPABASE_URL}/${supabasePath}`);
      console.log(`    CDN:      ${cdnUrl}`);

      if (!DRY_RUN) {
        await prisma.reCreeshot.update({
          where: { id },
          data: { referencePhotoUrl: cdnUrl },
        });
        console.log(`    ✅ 업데이트 완료`);
      }
    }

    console.log(`\n── 요약 ──`);
    console.log(`  처리 대상: ${RECORDS.length}개`);
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
