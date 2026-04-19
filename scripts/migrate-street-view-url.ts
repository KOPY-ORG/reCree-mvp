/**
 * 기존 DB의 순수 Street View URL을 공식 Google Maps URL API 포맷으로 마이그레이션
 *
 * 변환 대상: /@lat,lng,Xa,... 형태의 순수 Street View URL
 * 변환 제외: /place/ 경로가 있는 포토뷰어 URL (앱에서 정상 작동)
 * 변환 제외: 이미 map_action=pano 포맷인 URL
 *
 * 변환 결과: https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=LAT,LNG
 *
 * 실행 (dry-run):  pnpm ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-street-view-url.ts
 * 실행 (실제 적용): pnpm ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrate-street-view-url.ts --apply
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolveGoogleMapsUrl, expandGoogleMapsShortUrl, buildStreetViewUrl } from "../src/lib/google-maps-url";

process.loadEnvFile(".env.local");

const isDryRun = !process.argv.includes("--apply");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`\n${isDryRun ? "🔍 DRY-RUN (변경 없음)" : "✏️  APPLY (실제 변경)"}\n`);

  const places = await prisma.place.findMany({
    where: { streetViewUrl: { not: null } },
    select: { id: true, nameEn: true, streetViewUrl: true, latitude: true, longitude: true },
  });

  console.log(`Street View URL이 있는 장소: ${places.length}건\n`);

  const updates: { id: string; old: string; new: string }[] = [];
  const skipped: { id: string; url: string; reason: string }[] = [];

  for (const place of places) {
    const url = place.streetViewUrl!;

    if (url.includes("map_action=pano")) {
      skipped.push({ id: place.id, url, reason: "이미 공식 포맷" });
      continue;
    }
    if (url.includes("/place/")) {
      skipped.push({ id: place.id, url, reason: "포토뷰어 URL (변환 불필요)" });
      continue;
    }

    // 단축 URL 확장 후 좌표 추출
    const expanded = await expandGoogleMapsShortUrl(url);
    const resolved = await resolveGoogleMapsUrl(expanded);

    let lat: number | null = null;
    let lng: number | null = null;

    if (resolved?.type === "streetview" && resolved.lat && resolved.lng) {
      lat = resolved.lat;
      lng = resolved.lng;
    } else if (place.latitude && place.longitude) {
      // 파싱 실패 시 장소 좌표로 fallback
      lat = Number(place.latitude);
      lng = Number(place.longitude);
    }

    if (lat && lng) {
      updates.push({ id: place.id, old: url, new: buildStreetViewUrl(lat, lng) });
    } else {
      skipped.push({ id: place.id, url, reason: "좌표 추출 실패 (수동 확인 필요)" });
    }
  }

  console.log(`변환 대상: ${updates.length}건`);
  console.log(`건너뜀: ${skipped.length}건\n`);

  if (updates.length > 0) {
    console.log("── 변환 대상 ──────────────────────────────────────────");
    for (const u of updates) {
      console.log(`ID: ${u.id}`);
      console.log(`  기존: ${u.old}`);
      console.log(`  변경: ${u.new}\n`);
    }
  }

  if (skipped.length > 0) {
    console.log("── 건너뜀 ─────────────────────────────────────────────");
    for (const s of skipped) {
      console.log(`ID: ${s.id} (${s.reason})`);
      console.log(`  URL: ${s.url}\n`);
    }
  }

  if (isDryRun) {
    console.log("👆 위 내용으로 변경됩니다. 적용하려면 --apply 플래그를 추가하세요.");
    return;
  }

  for (const u of updates) {
    await prisma.place.update({ where: { id: u.id }, data: { streetViewUrl: u.new } });
  }

  console.log(`✅ ${updates.length}건 업데이트 완료`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
