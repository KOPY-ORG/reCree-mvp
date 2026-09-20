// 장소 택소노미 이전 — PlaceType 마스터 신설 + PlacePlaceType 연결 채우기
//
// 실행:
//   dry-run (기본, 쓰지 않는다):
//     npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/migrate-taxonomy.ts
//   실제 실행:
//     TAXONOMY_YES=1 npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/migrate-taxonomy.ts --execute
//     → 그 뒤 콘솔에서 "yes" 를 입력해야 시작한다
//
// ⚠️ 대상은 .env.local 의 DATABASE_URL — 기본이 dev 다. 시작할 때 host 와 Supabase ref 를 찍는다.
//    prod 에 돌릴 때는 그 실행에만 쓰기 권한이 있는 URL 을 주입한다.
//
// ── 무엇을 하고 무엇을 하지 않는가 ────────────────────────────────────────────
//
// 한다:
//   1. TAXONOMY 48종을 PlaceType 에 upsert 한다 (name 기준). category·isDefault 를 채운다
//   2. taxonomy-plan.json 의 장소마다 PlacePlaceType 을 JSON 순서대로 교체한다 (0 = 대표)
//   3. Place.placeTypes 도 같은 이름 배열로 갱신한다 — 옛 코드가 계속 그것을 읽기 때문이다
//   4. 48종에 없는 옛 타입을 isActive=false 로 내리고 sortOrder 를 100 이후로 민다
//
// 하지 않는다:
//   태그 삭제 · 옛 PlaceType 행 삭제 · Place.placeTypes 컬럼 삭제 · 앱 코드 변경
//
//   이름이 바뀌는 것(Buddhist Temple → Temple, Chicken → Fried Chicken 등)은
//   새 행으로 만들고 옛 행은 남긴다. Place.placeTypes 가 id 가 아니라 이름 문자열을
//   담고 있어 이름을 바꾸면 아직 옮기지 않은 장소의 값이 조용히 끊긴다.
//   옛 행 정리는 앱이 PlacePlaceType 을 읽게 된 뒤 별도로 한다.

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local 이 없어도 무시 — CI 에서는 환경변수가 직접 주입된다
}

import { PrismaClient, PlaceCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const EXECUTE = process.argv.includes("--execute");
const PLAN_PATH = path.join("prisma", "data", "taxonomy-plan.json");
const SNAPSHOT_DIR = path.join("prisma", "scripts", "backups");
const TX_TIMEOUT_MS = 120_000;
/** 옛 타입을 목록 뒤로 보낼 때 쓰는 시작값. 새 48종이 0..47 이라 겹치지 않는다 */
const LEGACY_SORT_BASE = 100;

type TypeDef = { name: string; nameKo: string; category: PlaceCategory; isDefault: boolean };

/**
 * 새 구조 48종. 카테고리당 기본값(isDefault)은 하나다 — OTHER 만 기본값이 없다.
 * name 은 Place.placeTypes 에 그대로 들어가는 값이라 여기서 바꾸면 데이터가 끊긴다.
 */
const TAXONOMY: TypeDef[] = [
  { name: "Restaurant", nameKo: "식당", category: "EAT", isDefault: true },
  { name: "Korean", nameKo: "한식", category: "EAT", isDefault: false },
  { name: "K-BBQ", nameKo: "고기구이", category: "EAT", isDefault: false },
  { name: "Fried Chicken", nameKo: "치킨", category: "EAT", isDefault: false },
  { name: "Street Food", nameKo: "분식", category: "EAT", isDefault: false },
  { name: "Noodles", nameKo: "면요리", category: "EAT", isDefault: false },
  { name: "Seafood", nameKo: "해산물", category: "EAT", isDefault: false },
  { name: "International", nameKo: "외국음식", category: "EAT", isDefault: false },

  { name: "Cafe", nameKo: "카페", category: "CAFE", isDefault: true },
  { name: "Bakery", nameKo: "제과점", category: "CAFE", isDefault: false },
  { name: "Dessert", nameKo: "디저트", category: "CAFE", isDefault: false },

  { name: "Bar", nameKo: "바", category: "BAR", isDefault: true },
  { name: "Pocha", nameKo: "포차", category: "BAR", isDefault: false },

  { name: "Attraction", nameKo: "명소", category: "ATTRACTIONS", isDefault: true },
  { name: "Landmark", nameKo: "랜드마크", category: "ATTRACTIONS", isDefault: false },
  { name: "Heritage", nameKo: "유적", category: "ATTRACTIONS", isDefault: false },
  { name: "Museum", nameKo: "박물관/미술관", category: "ATTRACTIONS", isDefault: false },
  { name: "Park", nameKo: "공원", category: "ATTRACTIONS", isDefault: false },
  { name: "Beach", nameKo: "바다", category: "ATTRACTIONS", isDefault: false },
  { name: "Nature", nameKo: "자연", category: "ATTRACTIONS", isDefault: false },
  { name: "Temple", nameKo: "사찰", category: "ATTRACTIONS", isDefault: false },
  { name: "Square", nameKo: "광장", category: "ATTRACTIONS", isDefault: false },
  { name: "Village", nameKo: "마을", category: "ATTRACTIONS", isDefault: false },
  { name: "Street", nameKo: "골목", category: "ATTRACTIONS", isDefault: false },
  { name: "Cultural Space", nameKo: "문화공간", category: "ATTRACTIONS", isDefault: false },

  { name: "Fan Landmark", nameKo: "팬 성지", category: "K_CULTURE", isDefault: true },
  { name: "Agency", nameKo: "소속사 사옥", category: "K_CULTURE", isDefault: false },
  { name: "Venue", nameKo: "공연장/스타디움", category: "K_CULTURE", isDefault: false },
  { name: "Broadcast Station", nameKo: "방송국", category: "K_CULTURE", isDefault: false },
  { name: "Filming Studio", nameKo: "촬영 세트장", category: "K_CULTURE", isDefault: false },
  { name: "School", nameKo: "학교", category: "K_CULTURE", isDefault: false },

  { name: "Activity", nameKo: "액티비티", category: "EXPERIENCE", isDefault: true },
  { name: "Class", nameKo: "클래스", category: "EXPERIENCE", isDefault: false },
  { name: "Wellness", nameKo: "힐링", category: "EXPERIENCE", isDefault: false },
  { name: "Theme Park", nameKo: "테마파크", category: "EXPERIENCE", isDefault: false },
  { name: "Photo Booth", nameKo: "포토부스", category: "EXPERIENCE", isDefault: false },

  { name: "Shop", nameKo: "쇼핑/상점", category: "SHOP", isDefault: true },
  { name: "Market", nameKo: "시장", category: "SHOP", isDefault: false },
  { name: "Mall", nameKo: "쇼핑몰", category: "SHOP", isDefault: false },
  { name: "Pop-up", nameKo: "팝업", category: "SHOP", isDefault: false },
  { name: "Convenience Store", nameKo: "편의점", category: "SHOP", isDefault: false },

  { name: "Stay", nameKo: "숙박", category: "STAY", isDefault: true },
  { name: "Hotel", nameKo: "호텔", category: "STAY", isDefault: false },
  { name: "Guesthouse", nameKo: "게스트하우스", category: "STAY", isDefault: false },
  { name: "Hanok Stay", nameKo: "한옥스테이", category: "STAY", isDefault: false },

  { name: "Airport", nameKo: "공항", category: "OTHER", isDefault: false },
  { name: "Office", nameKo: "사무실/사업장", category: "OTHER", isDefault: false },
  { name: "Station", nameKo: "역", category: "OTHER", isDefault: false },
];

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function parseDbTarget(url: string): { host: string; ref: string } {
  try {
    const u = new URL(url);
    return { host: u.host, ref: decodeURIComponent(u.username).replace(/^[^.]*\./, "") };
  } catch {
    return { host: "(parse error)", ref: "(parse error)" };
  }
}

function ask(rl: readline.Interface, q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, resolve));
}

/** "EAT/Street Food" → { category: "EAT", name: "Street Food" }. 카테고리 접두는 검증용이다 */
function parsePlanEntry(entry: string): { category: string; name: string } {
  const i = entry.indexOf("/");
  if (i < 0) return { category: "", name: entry };
  return { category: entry.slice(0, i), name: entry.slice(i + 1) };
}

function sameArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function confirm(): Promise<void> {
  if (process.env.TAXONOMY_YES !== "1") {
    throw new Error("--execute 에는 TAXONOMY_YES=1 이 함께 필요하다");
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await ask(
    rl,
    '\n⚠️  PlaceType 마스터를 늘리고 장소 타입을 교체한다. 계속하려면 "yes" 를 입력: '
  );
  rl.close();
  if (answer.trim() !== "yes") throw new Error(`취소됐다 (입력: "${answer.trim()}")`);
}

// ─── 본체 ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 없음 (.env.local)");

  const target = parseDbTarget(process.env.DATABASE_URL);
  console.log(`대상 DB host: ${target.host}`);
  console.log(`대상 Supabase 프로젝트: ${target.ref}`);
  console.log(EXECUTE ? "── EXECUTE — 실제로 쓴다 ──\n" : "── DRY RUN — 쓰지 않는다 ──\n");

  // ── 0. 계획 읽기 · 검증 ────────────────────────────────────────────────────
  if (!fs.existsSync(PLAN_PATH)) throw new Error(`계획 파일 없음: ${PLAN_PATH}`);
  const plan: Record<string, string[]> = JSON.parse(fs.readFileSync(PLAN_PATH, "utf8"));
  const planIds = Object.keys(plan);
  console.log(`계획: ${planIds.length}곳`);

  const byName = new Map(TAXONOMY.map((t) => [t.name, t]));
  const planErrors: string[] = [];
  for (const [placeId, entries] of Object.entries(plan)) {
    if (!entries.length) planErrors.push(`${placeId}: 타입 배열이 비어 있다`);
    const seen = new Set<string>();
    for (const e of entries) {
      const { category, name } = parsePlanEntry(e);
      const def = byName.get(name);
      if (!def) planErrors.push(`${placeId}: 마스터에 없는 타입 "${name}"`);
      else if (category && def.category !== category)
        planErrors.push(`${placeId}: "${name}" 의 카테고리가 어긋난다 (계획 ${category} ≠ 마스터 ${def.category})`);
      if (seen.has(name)) planErrors.push(`${placeId}: "${name}" 이 중복이다`);
      seen.add(name);
    }
  }
  if (planErrors.length) {
    console.error(`\n✖ 계획 검증 실패 ${planErrors.length}건`);
    for (const e of planErrors.slice(0, 20)) console.error(`   ${e}`);
    throw new Error("계획 파일을 고친 뒤 다시 실행한다");
  }
  console.log("계획 검증 통과 — 모든 타입이 마스터 48종 안에 있고 카테고리가 일치한다\n");

  // ── 1. 마스터 현황 ─────────────────────────────────────────────────────────
  const existingTypes = await prisma.placeType.findMany({
    select: { id: true, name: true, nameKo: true, category: true, isDefault: true, sortOrder: true, isActive: true },
  });
  const existingByName = new Map(existingTypes.map((t) => [t.name, t]));
  const toCreate = TAXONOMY.filter((t) => !existingByName.has(t.name));
  const toUpdate = TAXONOMY.filter((t) => {
    const cur = existingByName.get(t.name);
    return cur && (cur.category !== t.category || cur.isDefault !== t.isDefault || cur.nameKo !== t.nameKo);
  });
  const legacy = existingTypes.filter((t) => !byName.has(t.name));

  console.log(`── 1. PlaceType 마스터 ──`);
  console.log(`   현재 ${existingTypes.length}종 → 신설 ${toCreate.length}종 · 갱신 ${toUpdate.length}종`);
  console.log(`   신설: ${toCreate.map((t) => t.name).join(", ") || "없음"}`);
  console.log(`   48종 밖의 옛 타입 ${legacy.length}종 (지우지 않는다): ${legacy.map((t) => t.name).join(", ") || "없음"}\n`);

  // ── 2. 장소 대조 ───────────────────────────────────────────────────────────
  const places = await prisma.place.findMany({ select: { id: true, nameEn: true, nameKo: true, placeTypes: true } });
  const placeById = new Map(places.map((p) => [p.id, p]));

  const applicable = planIds.filter((id) => placeById.has(id));
  const missingInDb = planIds.filter((id) => !placeById.has(id));
  const notInPlan = places.filter((p) => !plan[p.id]);

  let unchanged = 0;
  const changes: { id: string; label: string; before: string[]; after: string[] }[] = [];
  for (const id of applicable) {
    const p = placeById.get(id)!;
    const after = plan[id].map((e) => parsePlanEntry(e).name);
    if (sameArray(p.placeTypes, after)) unchanged++;
    else changes.push({ id, label: p.nameEn ?? p.nameKo, before: p.placeTypes, after });
  }

  console.log(`── 2. 장소 ──`);
  console.log(`   DB ${places.length}곳 · 계획 ${planIds.length}곳`);
  console.log(`   적용 대상 ${applicable.length}곳 (그중 placeTypes 가 이미 같은 곳 ${unchanged}곳)`);
  console.log(`   건너뜀 — 계획에 있으나 DB 에 없는 placeId: ${missingInDb.length}곳`);
  console.log(`   건너뜀 — DB 에 있으나 계획에 없는 장소: ${notInPlan.length}곳\n`);

  if (missingInDb.length) {
    console.log(`   [계획에만 있는 placeId ${missingInDb.length}]`);
    for (const id of missingInDb.slice(0, 40)) console.log(`     ${id}  ${plan[id].join(", ")}`);
    if (missingInDb.length > 40) console.log(`     … 외 ${missingInDb.length - 40}건`);
    console.log();
  }
  if (notInPlan.length) {
    console.log(`   [계획에 없는 DB 장소 ${notInPlan.length}]`);
    for (const p of notInPlan.slice(0, 40))
      console.log(`     ${p.id}  ${p.nameEn ?? p.nameKo}  [${p.placeTypes.join(", ") || "타입 없음"}]`);
    if (notInPlan.length > 40) console.log(`     … 외 ${notInPlan.length - 40}건`);
    console.log();
  }

  // ── 3. 옛 타입 비활성화 대상 ───────────────────────────────────────────────
  //
  // 이전이 끝난 뒤의 상태를 미리 계산해 "그래도 이 타입을 쓰는 장소" 를 센다.
  // 계획에 있는 장소는 계획값, 나머지는 현재값이다.
  const projected = new Map<string, string[]>(places.map((p) => [p.id, p.placeTypes]));
  for (const id of applicable) projected.set(id, plan[id].map((e) => parsePlanEntry(e).name));

  const usageByName = new Map<string, { count: number; samples: string[] }>();
  for (const p of places) {
    for (const name of projected.get(p.id) ?? []) {
      const u = usageByName.get(name) ?? { count: 0, samples: [] };
      u.count++;
      if (u.samples.length < 5) u.samples.push(p.nameEn ?? p.nameKo);
      usageByName.set(name, u);
    }
  }

  // 이미 비활성이고 sortOrder 도 밀려 있으면 건너뛴다 — 재실행해도 같은 결과다
  const legacySorted = [...legacy].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const legacyPlan = legacySorted.map((t, i) => ({
    ...t,
    newSortOrder: LEGACY_SORT_BASE + i,
    usage: usageByName.get(t.name)?.count ?? 0,
    samples: usageByName.get(t.name)?.samples ?? [],
  }));
  const legacyToChange = legacyPlan.filter(
    (t) => t.isActive || t.sortOrder !== t.newSortOrder
  );
  const legacyAlreadyDone = legacyPlan.length - legacyToChange.length;
  const legacyStillUsed = legacyPlan.filter((t) => t.usage > 0);

  console.log(`── 3. 비활성화할 옛 타입 ──`);
  console.log(`   대상 ${legacyToChange.length}종 · 이미 처리돼 건너뜀 ${legacyAlreadyDone}종`);
  if (legacyPlan.length) {
    for (const t of legacyPlan) {
      const state = legacyToChange.includes(t)
        ? `isActive ${t.isActive} → false · sortOrder ${t.sortOrder} → ${t.newSortOrder}`
        : "변경 없음 (이미 비활성 + 정렬 완료)";
      console.log(`     ${t.name.padEnd(18)} 쓰는 장소 ${String(t.usage).padStart(3)}곳  ${state}`);
      if (t.usage > 0) console.log(`       ↳ ${t.samples.join(", ")}${t.usage > t.samples.length ? " …" : ""}`);
    }
  } else {
    console.log(`     없음`);
  }
  if (legacyStillUsed.length) {
    console.log(
      `\n   ⚠️ 이전 후에도 옛 타입을 쓰는 장소가 남는다 — 계획(taxonomy-plan.json)에 없는 장소들이다.`
    );
    console.log(`      비활성 타입이라도 Place.placeTypes 의 문자열은 그대로여서 화면에는 계속 나온다.`);
    console.log(`      prod 에서는 0 이어야 한다.`);
  }
  console.log();

  if (!EXECUTE) {
    console.log(`── 바뀌는 장소 ${changes.length}곳 (앞 30개) ──`);
    for (const c of changes.slice(0, 30))
      console.log(`   ${c.label}\n     ${c.before.join(", ") || "(없음)"}  →  ${c.after.join(", ")}`);
    if (changes.length > 30) console.log(`   … 외 ${changes.length - 30}곳`);
    console.log(`\n── DRY RUN 끝 — 아무것도 쓰지 않았다 ──`);
    return;
  }

  // ── 4. 실행 ────────────────────────────────────────────────────────────────
  await confirm();

  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const snapshotPath = path.join(
    SNAPSHOT_DIR,
    `taxonomy-migrate-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        takenAt: new Date().toISOString(),
        dbHost: target.host,
        dbRef: target.ref,
        placeTypes: existingTypes,
        places: places.map((p) => ({ id: p.id, nameEn: p.nameEn, nameKo: p.nameKo, placeTypes: p.placeTypes })),
      },
      null,
      2
    )
  );
  console.log(`\n✔ 스냅샷 저장: ${snapshotPath}`);

  const result = await prisma.$transaction(
    async (tx) => {
      // 마스터 — name 기준 upsert. 옛 행은 건드리지 않는다
      let created = 0;
      let updated = 0;
      for (let i = 0; i < TAXONOMY.length; i++) {
        const t = TAXONOMY[i];
        const cur = existingByName.get(t.name);
        if (cur) {
          await tx.placeType.update({
            where: { name: t.name },
            data: { nameKo: t.nameKo, category: t.category, isDefault: t.isDefault, sortOrder: i },
          });
          updated++;
        } else {
          await tx.placeType.create({
            data: { name: t.name, nameKo: t.nameKo, category: t.category, isDefault: t.isDefault, sortOrder: i },
          });
          created++;
        }
      }

      // 이름 → id (신설분 포함해 다시 읽는다)
      const allTypes = await tx.placeType.findMany({ select: { id: true, name: true } });
      const idByName = new Map(allTypes.map((t) => [t.name, t.id]));

      // 장소 — PlacePlaceType 교체 + placeTypes 동기화
      let linked = 0;
      for (const id of applicable) {
        const names = plan[id].map((e) => parsePlanEntry(e).name);
        await tx.placePlaceType.deleteMany({ where: { placeId: id } });
        await tx.placePlaceType.createMany({
          data: names.map((name, sortOrder) => ({
            id: randomUUID(),
            placeId: id,
            placeTypeId: idByName.get(name)!,
            sortOrder,
          })),
        });
        await tx.place.update({ where: { id }, data: { placeTypes: names } });
        linked += names.length;
      }

      // 옛 타입 — 지우지 않고 내린다. 이미 처리된 것은 건드리지 않는다
      let deactivated = 0;
      for (const t of legacyToChange) {
        await tx.placeType.update({
          where: { id: t.id },
          data: { isActive: false, sortOrder: t.newSortOrder },
        });
        deactivated++;
      }
      return { created, updated, linked, deactivated };
    },
    { timeout: TX_TIMEOUT_MS }
  );

  console.log(`\n── 완료 ──`);
  console.log(`   마스터 신설 ${result.created}종 · 갱신 ${result.updated}종`);
  console.log(`   장소 ${applicable.length}곳 · 연결 ${result.linked}건`);
  console.log(`   옛 타입 비활성화 ${result.deactivated}종 (건너뜀 ${legacyAlreadyDone}종) — 행은 지우지 않았다`);
  if (legacyStillUsed.length) {
    console.log(
      `   ⚠️ 옛 타입을 여전히 쓰는 장소 ${legacyStillUsed.reduce((n, t) => n + t.usage, 0)}건: ` +
        legacyStillUsed.map((t) => `${t.name}(${t.usage})`).join(", ")
    );
  }
  console.log(`   Place.placeTypes 컬럼은 그대로 남아 있다`);
}

main()
  .catch((e) => {
    console.error(`\n✖ ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
