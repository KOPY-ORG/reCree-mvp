/**
 * 기존 DB에 저장된 비공식 구글맵 URL을 공식 Google Maps URL API 포맷으로 마이그레이션
 *
 * 변환: https://www.google.com/maps/place/?q=place_id:XXX
 *    → https://www.google.com/maps/search/?api=1&query=NAME&query_place_id=XXX
 *
 * 실행 (dry-run):  pnpm ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-google-maps-url.ts
 * 실행 (실제 적용): pnpm ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-google-maps-url.ts --apply
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

process.loadEnvFile(".env.local");

const isDryRun = !process.argv.includes("--apply");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const OLD_PATTERN = "https://www.google.com/maps/place/?q=place_id:";

async function main() {
  console.log(`\n${isDryRun ? "🔍 DRY-RUN (변경 없음)" : "✏️  APPLY (실제 변경)"}\n`);

  const places = await prisma.place.findMany({
    where: { googleMapsUrl: { startsWith: OLD_PATTERN } },
    select: { id: true, nameEn: true, nameKo: true, googleMapsUrl: true, googlePlaceId: true },
  });

  console.log(`대상 레코드: ${places.length}건\n`);
  if (places.length === 0) {
    console.log("마이그레이션할 데이터가 없습니다.");
    return;
  }

  const updates: { id: string; old: string; new: string }[] = [];

  for (const place of places) {
    const oldUrl = place.googleMapsUrl!;
    const placeId = place.googlePlaceId ?? oldUrl.replace(OLD_PATTERN, "");
    const name = place.nameEn || place.nameKo || "";
    const newUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`;
    updates.push({ id: place.id, old: oldUrl, new: newUrl });
  }

  for (const u of updates) {
    console.log(`ID: ${u.id}`);
    console.log(`  기존: ${u.old}`);
    console.log(`  변경: ${u.new}\n`);
  }

  if (isDryRun) {
    console.log("👆 위 내용으로 변경됩니다. 적용하려면 --apply 플래그를 추가하세요.");
    return;
  }

  let successCount = 0;
  for (const u of updates) {
    await prisma.place.update({
      where: { id: u.id },
      data: { googleMapsUrl: u.new },
    });
    successCount++;
  }

  console.log(`✅ ${successCount}건 업데이트 완료`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
