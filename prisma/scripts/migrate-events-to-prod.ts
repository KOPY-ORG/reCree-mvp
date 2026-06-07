// 이벤트 데이터 dev → prod 이전 스크립트
//
// 실행 방법 (히스토리 회피: 앞에 공백 한 칸):
//   DRY_RUN 확인 (기본):
//    PROD_DATABASE_URL="postgresql://..." pnpm tsx prisma/scripts/migrate-events-to-prod.ts
//   실제 이전:
//    MIGRATE_YES=1 PROD_DATABASE_URL="postgresql://..." pnpm tsx prisma/scripts/migrate-events-to-prod.ts
//
// ★ prod에 TRUNCATE / DELETE / wipe 코드 없음. upsert(create-or-skip) 전용.

try {
  process.loadEnvFile(".env.local");
} catch {}

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as readline from "readline";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const EXPECTED_DEV_REF  = "vvcyimilydgisrkgqqbv";
const EXPECTED_PROD_REF = "vwfojaivbltsdjttjhxw";

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function parseRef(url: string): { host: string; ref: string } {
  try {
    const u = new URL(url);
    return { host: u.host, ref: u.username };
  } catch {
    return { host: "(parse error)", ref: "(parse error)" };
  }
}

function createClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function ask(rl: readline.Interface, q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, resolve));
}

// ─── 로깅 ─────────────────────────────────────────────────────────────────────

let stepNum = 0;

function logStep(label: string, count: number, dryRun: boolean) {
  stepNum++;
  const prefix = dryRun ? "[DRY]" : "[EXEC]";
  console.log(`${prefix} [${stepNum}] ${label}: ${count} rows`);
}

// ─── 청크 2 구현 ──────────────────────────────────────────────────────────────

async function migratePlaces(
  src: PrismaClient,
  dst: PrismaClient,
  dryRun: boolean,
): Promise<void> {
  // ── 소스: 이벤트에 연결된 Place 동적 조회 ────────────────────────────────
  const eventPlaces = await src.eventPlace.findMany({ select: { placeId: true } });
  const placeIds = [...new Set(eventPlaces.map((ep) => ep.placeId))];

  const places = await src.place.findMany({ where: { id: { in: placeIds } } });
  const placeImages = await src.placeImage.findMany({ where: { placeId: { in: placeIds } } });

  if (dryRun) {
    // ── DRY_RUN: 쓰기 없이 개수·목록 출력 ───────────────────────────────────
    // 잠재적 googlePlaceId 충돌 사전 탐지 (prod 읽기만)
    const googleIds = places.map((p) => p.googlePlaceId).filter(Boolean) as string[];
    const conflicts = googleIds.length
      ? await dst.place.findMany({
          where: { googlePlaceId: { in: googleIds } },
          select: { id: true, googlePlaceId: true, nameKo: true },
        })
      : [];

    logStep("Place (upsert 예정)", places.length, dryRun);
    places.forEach((p) =>
      console.log(`      id=${p.id}  nameKo=${p.nameKo}  googlePlaceId=${p.googlePlaceId ?? "없음"}`),
    );
    if (conflicts.length > 0) {
      console.warn(`\n  ⚠️  prod에 googlePlaceId 충돌 가능성 ${conflicts.length}건:`);
      conflicts.forEach((c) =>
        console.warn(`      prod id=${c.id}  nameKo=${c.nameKo}  googlePlaceId=${c.googlePlaceId}`),
      );
      console.warn("  → upsert(where:id) 기준이므로 prod 기존 행은 건드리지 않고 새 id로 삽입 시도.");
      console.warn("  → 단, googlePlaceId UNIQUE 제약으로 create 실패 가능. 실행 전 수동 확인 권장.\n");
    } else {
      console.log("  ✅ prod googlePlaceId 충돌 없음\n");
    }
    logStep("PlaceImage (upsert 예정)", placeImages.length, dryRun);
    return;
  }

  // ── EXEC: Place upsert (id 기준, operatingHours null → DbNull) ───────────
  for (const place of places) {
    const { id, ...rest } = place;
    const data = { ...rest, operatingHours: rest.operatingHours ?? Prisma.DbNull };
    await dst.place.upsert({
      where:  { id },
      create: { id, ...data },
      update: data,
    });
  }
  logStep("Place", places.length, dryRun);

  // ── EXEC: PlaceImage upsert (이벤트 Place 연결, 현재 0개지만 대비) ────────
  for (const pi of placeImages) {
    const { id, ...rest } = pi;
    await dst.placeImage.upsert({
      where:  { id },
      create: { id, ...rest },
      update: rest,
    });
  }
  logStep("PlaceImage", placeImages.length, dryRun);
}

async function migrateCollections(
  src: PrismaClient,
  dst: PrismaClient,
  dryRun: boolean,
): Promise<void> {
  // ── 소스: EventCollection + Translation 전체 조회 ─────────────────────────
  const collections = await src.eventCollection.findMany({});
  const translations = await src.eventCollectionTranslation.findMany({});

  if (dryRun) {
    logStep("EventCollection (upsert 예정)", collections.length, dryRun);
    collections.forEach((c) =>
      console.log(`      id=${c.id}  slug=${c.slug}  status=${c.status}`),
    );
    logStep("EventCollectionTranslation (upsert 예정)", translations.length, dryRun);
    translations.forEach((t) =>
      console.log(`      id=${t.id}  collectionId=${t.collectionId}  locale=${t.locale}  name=${t.name}`),
    );
    return;
  }

  // ── EXEC: EventCollection upsert (id 기준. slug @unique → update에서 제외 안 해도 되나
  //         Prisma는 동일 값 업데이트를 허용하므로 전체 포함) ─────────────────
  for (const col of collections) {
    const { id, ...rest } = col;
    await dst.eventCollection.upsert({
      where:  { id },
      create: { id, ...rest },
      update: rest,
    });
  }
  logStep("EventCollection", collections.length, dryRun);

  // ── EXEC: EventCollectionTranslation upsert (id 기준) ────────────────────
  // @@unique([collectionId, locale])이 있으나, id 기반 upsert로 충분
  // (EventCollection이 prod에 없다가 새로 생성되므로 충돌 위험 없음)
  for (const tr of translations) {
    const { id, ...rest } = tr;
    await dst.eventCollectionTranslation.upsert({
      where:  { id },
      create: { id, ...rest },
      update: rest,
    });
  }
  logStep("EventCollectionTranslation", translations.length, dryRun);
}

// 청크3: Event + 하위 테이블 전체 upsert
// Save(EVENT)는 userId=dev 전용 UUID → prod User 없음 → 이전 제외
async function migrateEvents(
  src: PrismaClient,
  dst: PrismaClient,
  dryRun: boolean,
): Promise<void> {
  // ── 소스 전체 조회 (FK 순서대로) ─────────────────────────────────────────
  const events       = await src.event.findMany({});
  const eventIds     = events.map((e) => e.id);

  const translations = await src.eventTranslation.findMany({
    where: { eventId: { in: eventIds } },
  });
  const perks        = await src.eventPerk.findMany({
    where: { eventId: { in: eventIds } },
  });
  const perkIds      = perks.map((p) => p.id);
  const perkTrs      = await src.eventPerkTranslation.findMany({
    where: { perkId: { in: perkIds } },
  });
  const blocks       = await src.eventBodyBlock.findMany({
    where: { eventId: { in: eventIds } },
  });
  const blockIds     = blocks.map((b) => b.id);
  const blockTrs     = await src.eventBodyBlockTranslation.findMany({
    where: { blockId: { in: blockIds } },
  });
  const eventPlaces  = await src.eventPlace.findMany({
    where: { eventId: { in: eventIds } },
  });

  if (dryRun) {
    logStep("Event (upsert 예정)",                   events.length,       dryRun);
    logStep("EventTranslation (upsert 예정)",         translations.length, dryRun);
    logStep("EventPerk (upsert 예정)",                perks.length,        dryRun);
    logStep("EventPerkTranslation (upsert 예정)",     perkTrs.length,      dryRun);
    logStep("EventBodyBlock (upsert 예정)",           blocks.length,       dryRun);
    logStep("EventBodyBlockTranslation (upsert 예정)", blockTrs.length,    dryRun);
    logStep("EventPlace (upsert 예정)",               eventPlaces.length,  dryRun);
    return;
  }

  // ── EXEC: FK 그룹별 $transaction — 멱등 upsert, prod 부분적용 방지 ────────
  // 전략: 테이블 단위 트랜잭션. 단일 대형 트랜잭션은 Supabase 기본 timeout 초과 위험.
  // upsert 특성상 재실행 안전 → 그룹 단위 롤백만 보장해도 충분.
  const TX_OPTS = { timeout: 30_000 }; // 30s — BlockTranslation 288건 대비

  // 1. Event (39) — eventCollectionId FK는 청크2에서 이미 삽입됨
  await dst.$transaction(
    events.map(({ id, ...rest }) =>
      dst.event.upsert({ where: { id }, create: { id, ...rest }, update: rest }),
    ),
    TX_OPTS,
  );
  logStep("Event", events.length, dryRun);

  // 2. EventTranslation (234) — @@unique(eventId, locale), upsert where:id
  await dst.$transaction(
    translations.map(({ id, ...rest }) =>
      dst.eventTranslation.upsert({ where: { id }, create: { id, ...rest }, update: rest }),
    ),
    TX_OPTS,
  );
  logStep("EventTranslation", translations.length, dryRun);

  // 3. EventPerk (41) + EventPerkTranslation (246) — 같은 tx로 묶어 Perk→Translation 원자성
  await dst.$transaction(
    [
      ...perks.map(({ id, ...rest }) =>
        dst.eventPerk.upsert({ where: { id }, create: { id, ...rest }, update: rest }),
      ),
      ...perkTrs.map(({ id, ...rest }) =>
        dst.eventPerkTranslation.upsert({ where: { id }, create: { id, ...rest }, update: rest }),
      ),
    ],
    TX_OPTS,
  );
  logStep("EventPerk", perks.length, dryRun);
  logStep("EventPerkTranslation", perkTrs.length, dryRun);

  // 4. EventBodyBlock (82) + EventBodyBlockTranslation (288) — 같은 tx, Block 먼저
  await dst.$transaction(
    [
      ...blocks.map(({ id, ...rest }) =>
        dst.eventBodyBlock.upsert({ where: { id }, create: { id, ...rest }, update: rest }),
      ),
      ...blockTrs.map(({ id, ...rest }) =>
        dst.eventBodyBlockTranslation.upsert({
          where:  { id },
          create: { id, ...rest },
          update: rest,
        }),
      ),
    ],
    TX_OPTS,
  );
  logStep("EventBodyBlock", blocks.length, dryRun);
  logStep("EventBodyBlockTranslation", blockTrs.length, dryRun);

  // 5. EventPlace (19) — 마지막(Event + Place 모두 존재 후)
  // @@unique([eventId, placeId]) 있으나 id 기준 upsert로 충분
  await dst.$transaction(
    eventPlaces.map(({ id, ...rest }) =>
      dst.eventPlace.upsert({ where: { id }, create: { id, ...rest }, update: rest }),
    ),
    TX_OPTS,
  );
  logStep("EventPlace", eventPlaces.length, dryRun);
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const SRC_URL  = process.env.DATABASE_URL;       // dev
  const DST_URL  = process.env.PROD_DATABASE_URL;  // prod (런타임 주입)
  const dryRun   = process.env.MIGRATE_YES !== "1";

  // ── 환경변수 체크 ────────────────────────────────────────────────────────────
  if (!SRC_URL || !DST_URL) {
    console.error("❌ 필수 환경변수 누락:");
    if (!SRC_URL) console.error("   DATABASE_URL (.env.local — dev)");
    if (!DST_URL) console.error("   PROD_DATABASE_URL (런타임 주입 필요)");
    console.error("\n실행 방법 (히스토리 회피: 앞 공백):");
    console.error('    PROD_DATABASE_URL="postgresql://..." pnpm tsx prisma/scripts/migrate-events-to-prod.ts');
    process.exit(1);
  }

  const src  = parseRef(SRC_URL);
  const dst  = parseRef(DST_URL);

  console.log("\n📋 연결 정보 확인");
  console.log(`  소스(dev)  host: ${src.host}  ref: ${src.ref}`);
  console.log(`  타겟(prod) host: ${dst.host}  ref: ${dst.ref}`);
  console.log(`  모드: ${dryRun ? "DRY_RUN (읽기만, 쓰기 없음)" : "★ MIGRATE_YES=1 — 실제 prod 쓰기"}`);

  // ── 안전장치 1: 소스 = 타겟 이면 즉시 abort ──────────────────────────────
  if (src.ref === dst.ref) {
    console.error("\n❌ 소스 ref와 타겟 ref가 동일합니다. 같은 DB를 가리키고 있습니다. 중단합니다.");
    process.exit(1);
  }

  // ── 안전장치 2: dev ref 확인 ────────────────────────────────────────────────
  if (src.ref !== EXPECTED_DEV_REF) {
    console.warn(`\n⚠️  소스 ref(${src.ref})가 예상 dev ref(${EXPECTED_DEV_REF})와 다릅니다.`);
    console.warn("   소스(dev) URL이 맞는지 확인하세요.");
    // 경고만 — 다른 dev 환경일 수도 있으므로 abort 안 함
  }

  // ── 안전장치 3: prod ref 확인 ───────────────────────────────────────────────
  if (dst.ref !== EXPECTED_PROD_REF) {
    console.error(`\n❌ 타겟 ref(${dst.ref})가 예상 prod ref(${EXPECTED_PROD_REF})와 다릅니다.`);
    console.error("   PROD_DATABASE_URL이 prod DB를 가리키는지 확인하세요. 중단합니다.");
    process.exit(1);
  }

  // ── 실제 실행 시 최종 확인 ──────────────────────────────────────────────────
  if (!dryRun) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await ask(
      rl,
      "\n★ MIGRATE_YES=1 — prod에 실제로 이벤트 데이터를 씁니다. Continue? (yes/no): ",
    );
    rl.close();
    if (answer.trim() !== "yes") {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  // ── 클라이언트 생성 ──────────────────────────────────────────────────────────
  const srcDb = createClient(SRC_URL);
  const dstDb = createClient(DST_URL);

  try {
    console.log("\n📥 이전 시작 (순서: Place → Collection → Event 트리)\n");

    await migratePlaces(srcDb, dstDb, dryRun);
    await migrateCollections(srcDb, dstDb, dryRun);
    await migrateEvents(srcDb, dstDb, dryRun);

    console.log(`\n${dryRun ? "✅ DRY_RUN 완료 (prod 변경 없음)" : "✅ 이전 완료"}`);
  } catch (e) {
    console.error("\n❌ 에러 발생:", e);
    process.exit(1);
  } finally {
    await srcDb.$disconnect();
    await dstDb.$disconnect();
  }
}

main();
