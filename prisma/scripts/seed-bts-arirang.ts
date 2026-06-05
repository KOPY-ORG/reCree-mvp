// dev DB 전용 — BTS ARIRANG 이벤트 seed 스크립트
// 실행: npx tsx prisma/scripts/seed-bts-arirang.ts
//       또는: ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/seed-bts-arirang.ts
//
// 전제: 'bts-arirang' EventCollection이 DB에 이미 존재해야 함.
// JSON 파일: prisma/scripts/data/bts_arirang_events_seed.json

try {
  process.loadEnvFile(".env.local");
} catch {}

import * as fs from "fs";
import * as path from "path";
import { PrismaClient, EventCategory, EventStatus, EventEntryType, EventBlockType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─── 타입 정의 ────────────────────────────────────────────────────────────────

interface SeedTranslation {
  locale: string;
  name: string;
  description?: string | null;
  hoursNote?: string | null;
}

interface SeedPerkTranslation {
  locale: string;
  badge?: string | null;
  title: string;
  detail?: string | null;
}

interface SeedPerk {
  sortOrder: number;
  imageUrl?: string | null;
  perkUrl?: string | null;
  translations: SeedPerkTranslation[];
}

interface SeedBodyBlockTranslation {
  locale: string;
  text: string;
}

interface SeedBodyBlock {
  type: string;
  imageUrl?: string | null;
  embedUrl?: string | null;
  sortOrder: number;
  translations: SeedBodyBlockTranslation[];
}

interface SeedEvent {
  slug: string;
  category: string;
  status: string;
  startDate: string;
  endDate: string;
  openTime?: string | null;
  closeTime?: string | null;
  entryType: string;
  reservationUrl?: string | null;
  officialUrl?: string | null;
  snsUrl?: string | null;
  bannerImageUrl?: string | null;
  showOnHome: boolean;
  sortOrder: number;
  translations: SeedTranslation[];
  perks: SeedPerk[];
  bodyBlocks: SeedBodyBlock[];
}

interface SeedDoc {
  collectionSlug: string;
  events: SeedEvent[];
}

// ─── 유효성 검사 헬퍼 ─────────────────────────────────────────────────────────

function isEventCategory(v: string): v is EventCategory {
  return Object.values(EventCategory).includes(v as EventCategory);
}

function isEventStatus(v: string): v is EventStatus {
  return Object.values(EventStatus).includes(v as EventStatus);
}

function isEventEntryType(v: string): v is EventEntryType {
  return Object.values(EventEntryType).includes(v as EventEntryType);
}

function isEventBlockType(v: string): v is EventBlockType {
  return Object.values(EventBlockType).includes(v as EventBlockType);
}

// ─── 클라이언트 생성 ──────────────────────────────────────────────────────────

function createClient(): { prisma: PrismaClient; connectionString: string } {
  // 일회성 시딩은 Transaction Pooler(6543) 회피 위해 DIRECT_URL(5432) 우선 사용
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DIRECT_URL / DATABASE_URL이 설정되지 않았습니다.");
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  return { prisma, connectionString };
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. JSON 로드
  const jsonPath = path.resolve(__dirname, "data/bts_arirang_events_seed.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ JSON 파일을 찾을 수 없습니다: ${jsonPath}`);
    process.exit(1);
  }

  const doc: SeedDoc = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  const { collectionSlug, events } = doc;

  console.log(`\n📋 Seed 문서 확인`);
  console.log(`   collectionSlug : ${collectionSlug}`);
  console.log(`   총 이벤트 수   : ${events.length}건`);

  // 2. slug 중복 사전 검사
  const slugSet = new Set<string>();
  const duplicates: string[] = [];
  for (const ev of events) {
    if (slugSet.has(ev.slug)) duplicates.push(ev.slug);
    slugSet.add(ev.slug);
  }
  if (duplicates.length > 0) {
    console.error(`❌ JSON 내 중복 slug 발견: ${duplicates.join(", ")}`);
    process.exit(1);
  }
  console.log(`   slug 중복 검사 : 이상 없음 ✓\n`);

  const { prisma, connectionString } = createClient();

  try {
    const host = (() => {
      try {
        return new URL(connectionString).host;
      } catch {
        return "(parse error)";
      }
    })();
    console.log(`🔌 연결 대상: ${host}\n`);

    // 3. 컬렉션 조회 — 없으면 에러로 중단
    const collection = await prisma.eventCollection.findUnique({
      where: { slug: collectionSlug },
    });
    if (!collection) {
      console.error(`❌ EventCollection slug="${collectionSlug}"이 DB에 없습니다.`);
      console.error(`   먼저 관리자 화면에서 컬렉션을 생성하세요.`);
      process.exit(1);
    }
    console.log(`✅ 컬렉션 확인: ${collectionSlug} (id: ${collection.id})\n`);

    // 4. 이벤트 upsert
    let successCount = 0;
    let skipCount = 0;
    let totalTranslations = 0;
    let totalPerks = 0;
    let totalPerkTranslations = 0;
    let totalBodyBlocks = 0;
    let totalBodyBlockTranslations = 0;

    for (const ev of events) {
      // enum 유효성 검사
      if (!isEventCategory(ev.category)) {
        console.error(`✗ [${ev.slug}] 알 수 없는 category: "${ev.category}" → 스킵`);
        skipCount++;
        continue;
      }
      if (!isEventStatus(ev.status)) {
        console.error(`✗ [${ev.slug}] 알 수 없는 status: "${ev.status}" → 스킵`);
        skipCount++;
        continue;
      }
      if (!isEventEntryType(ev.entryType)) {
        console.error(`✗ [${ev.slug}] 알 수 없는 entryType: "${ev.entryType}" → 스킵`);
        skipCount++;
        continue;
      }

      try {
        await prisma.$transaction(async (tx) => {
          // 4-1. Event upsert
          const event = await tx.event.upsert({
            where: { slug: ev.slug },
            update: {
              category: ev.category as EventCategory,
              status: ev.status as EventStatus,
              startDate: new Date(ev.startDate),
              endDate: new Date(ev.endDate),
              openTime: ev.openTime ?? null,
              closeTime: ev.closeTime ?? null,
              entryType: ev.entryType as EventEntryType,
              reservationUrl: ev.reservationUrl ?? null,
              officialUrl: ev.officialUrl ?? null,
              snsUrl: ev.snsUrl ?? null,
              bannerImageUrl: ev.bannerImageUrl ?? null,
              showOnHome: ev.showOnHome,
              sortOrder: ev.sortOrder,
            },
            create: {
              slug: ev.slug,
              eventCollectionId: collection.id,
              category: ev.category as EventCategory,
              status: ev.status as EventStatus,
              startDate: new Date(ev.startDate),
              endDate: new Date(ev.endDate),
              openTime: ev.openTime ?? null,
              closeTime: ev.closeTime ?? null,
              entryType: ev.entryType as EventEntryType,
              reservationUrl: ev.reservationUrl ?? null,
              officialUrl: ev.officialUrl ?? null,
              snsUrl: ev.snsUrl ?? null,
              bannerImageUrl: ev.bannerImageUrl ?? null,
              showOnHome: ev.showOnHome,
              sortOrder: ev.sortOrder,
            },
          });

          // 4-2. EventTranslation — delete and recreate
          await tx.eventTranslation.deleteMany({ where: { eventId: event.id } });
          if (ev.translations.length > 0) {
            await tx.eventTranslation.createMany({
              data: ev.translations.map((t) => ({
                eventId: event.id,
                locale: t.locale,
                name: t.name,
                description: t.description ?? null,
                hoursNote: t.hoursNote ?? null,
              })),
            });
          }
          totalTranslations += ev.translations.length;

          // 4-3. EventPerk — delete and recreate
          await tx.eventPerk.deleteMany({ where: { eventId: event.id } });
          for (const perk of ev.perks) {
            const createdPerk = await tx.eventPerk.create({
              data: {
                eventId: event.id,
                imageUrl: perk.imageUrl ?? null,
                perkUrl: perk.perkUrl ?? null,
                sortOrder: perk.sortOrder,
              },
            });
            if (perk.translations.length > 0) {
              await tx.eventPerkTranslation.createMany({
                data: perk.translations.map((pt) => ({
                  perkId: createdPerk.id,
                  locale: pt.locale,
                  badge: pt.badge ?? null,
                  title: pt.title,
                  detail: pt.detail ?? null,
                })),
              });
            }
            totalPerkTranslations += perk.translations.length;
          }
          totalPerks += ev.perks.length;

          // 4-4. EventBodyBlock — delete and recreate
          await tx.eventBodyBlock.deleteMany({ where: { eventId: event.id } });
          for (const block of ev.bodyBlocks) {
            // blockType 검사
            if (!isEventBlockType(block.type)) {
              throw new Error(`알 수 없는 blockType: "${block.type}"`);
            }
            const createdBlock = await tx.eventBodyBlock.create({
              data: {
                eventId: event.id,
                type: block.type as EventBlockType,
                imageUrl: block.imageUrl ?? null,
                embedUrl: block.embedUrl ?? null,
                sortOrder: block.sortOrder,
              },
            });
            // TEXT 블록만 translations 있음 (INSTAGRAM은 빈 배열 허용)
            if (block.translations.length > 0) {
              await tx.eventBodyBlockTranslation.createMany({
                data: block.translations.map((bt) => ({
                  blockId: createdBlock.id,
                  locale: bt.locale,
                  text: bt.text,
                })),
              });
            }
            totalBodyBlockTranslations += block.translations.length;
          }
          totalBodyBlocks += ev.bodyBlocks.length;
        }, { timeout: 15000 });

        console.log(`✓ [${ev.slug}]`);
        successCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`✗ [${ev.slug}] 트랜잭션 실패: ${msg}`);
        skipCount++;
      }
    }

    // 5. 요약
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 완료 요약
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 성공        : ${successCount}건
 스킵·실패   : ${skipCount}건
 총 이벤트   : ${successCount + skipCount}건

 생성된 자식 rows:
   EventTranslation       : ${totalTranslations}
   EventPerk              : ${totalPerks}
   EventPerkTranslation   : ${totalPerkTranslations}
   EventBodyBlock         : ${totalBodyBlocks}
   EventBodyBlockTranslation: ${totalBodyBlockTranslations}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  } catch (e) {
    console.error("\n❌ 치명적 오류:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
