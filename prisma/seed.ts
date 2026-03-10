/**
 * Prisma 시드 스크립트 - reCree MVP 초기 데이터
 *
 * Topic 트리 구조:
 *   Level 0 (2개): K-POP, K-CONTENTS
 *   Level 1 (7개): 보이그룹/걸그룹/혼성그룹/솔로 | K-드라마/K-영화/K-예능  (type: CATEGORY)
 *   Level 2 (26개): 아티스트(GROUP) / 작품(WORK)
 *   Level 3 (5개): 멤버(PERSON) / 시즌(SEASON)
 *   합계: 40개
 *
 * Tag: 15개
 */

// ts-node는 .env.local을 자동으로 로드하지 않으므로 명시적으로 로드
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local이 없으면 무시
}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 시드 시작...");

  // ─── 기존 데이터 삭제 (의존성 역순) ─────────────────────────────────────────
  await prisma.tag.deleteMany();
  // Topic 자기참조이므로 가장 깊은 level부터 삭제
  await prisma.topic.deleteMany({ where: { level: 3 } });
  await prisma.topic.deleteMany({ where: { level: 2 } });
  await prisma.topic.deleteMany({ where: { level: 1 } });
  await prisma.topic.deleteMany({ where: { level: 0 } });
  console.log("  기존 Topic/Tag 데이터 삭제 완료");

  // ─── Level 0: 최상위 카테고리 (2개) ──────────────────────────────────────────

  const kpop = await prisma.topic.create({
    data: {
      nameKo: "K-POP",
      nameEn: "K-POP",
      slug: "k-pop",
      level: 0,
      sortOrder: 0,
    },
  });

  const kcontents = await prisma.topic.create({
    data: {
      nameKo: "K-CONTENTS",
      nameEn: "K-CONTENTS",
      slug: "k-contents",
      level: 0,
      sortOrder: 1,
    },
  });

  console.log("  Level 0 생성 완료 (2개): K-POP, K-CONTENTS");

  // ─── Level 1: K-POP 서브카테고리 (4개) ───────────────────────────────────────

  const boyGroup = await prisma.topic.create({
    data: {
      nameKo: "보이그룹",
      nameEn: "Boy Group",
      slug: "boy-group",
      level: 1,
      parentId: kpop.id,
      sortOrder: 0,
    },
  });

  const girlGroup = await prisma.topic.create({
    data: {
      nameKo: "걸그룹",
      nameEn: "Girl Group",
      slug: "girl-group",
      level: 1,
      parentId: kpop.id,
      sortOrder: 1,
    },
  });

  // 혼성그룹 / 솔로 — 현재 소속 아티스트 없음, 구조용으로 생성
  await prisma.topic.create({
    data: {
      nameKo: "혼성그룹",
      nameEn: "Co-ed Group",
      slug: "co-ed-group",
      level: 1,
      parentId: kpop.id,
      sortOrder: 2,
    },
  });

  await prisma.topic.create({
    data: {
      nameKo: "솔로",
      nameEn: "Solo",
      slug: "solo",
      level: 1,
      parentId: kpop.id,
      sortOrder: 3,
    },
  });

  console.log("  Level 1 K-POP 서브카테고리 생성 완료 (4개)");

  // ─── Level 1: K-CONTENTS 서브카테고리 (3개) ──────────────────────────────────

  const kdrama = await prisma.topic.create({
    data: {
      nameKo: "K-드라마",
      nameEn: "K-Drama",
      slug: "k-drama",
      level: 1,
      parentId: kcontents.id,
      sortOrder: 0,
    },
  });

  const kmovie = await prisma.topic.create({
    data: {
      nameKo: "K-영화",
      nameEn: "K-Movie",
      slug: "k-movie",
      level: 1,
      parentId: kcontents.id,
      sortOrder: 1,
    },
  });

  const kvariety = await prisma.topic.create({
    data: {
      nameKo: "K-예능",
      nameEn: "K-Variety",
      slug: "k-variety",
      level: 1,
      parentId: kcontents.id,
      sortOrder: 2,
    },
  });

  console.log("  Level 1 K-CONTENTS 서브카테고리 생성 완료 (3개)");

  // ─── Level 2: 보이그룹 아티스트 (7개) ────────────────────────────────────────

  await prisma.topic.createMany({
    data: [
      {
        nameKo: "방탄소년단",
        nameEn: "BTS",
        slug: "bts",
        level: 2,
        parentId: boyGroup.id,
        sortOrder: 0,
      },
      {
        nameKo: "세븐틴",
        nameEn: "SVT",
        slug: "svt",
        level: 2,
        parentId: boyGroup.id,
        sortOrder: 1,
      },
      {
        nameKo: "엔시티",
        nameEn: "NCT",
        slug: "nct",
        level: 2,
        parentId: boyGroup.id,
        sortOrder: 2,
      },
      {
        nameKo: "스트레이키즈",
        nameEn: "Stray Kids",
        slug: "stray-kids",
        level: 2,
        parentId: boyGroup.id,
        sortOrder: 3,
      },
      {
        nameKo: "엔하이픈",
        nameEn: "ENHYPEN",
        slug: "enhypen",
        level: 2,
        parentId: boyGroup.id,
        sortOrder: 4,
      },
      {
        nameKo: "투모로우바이투게더",
        nameEn: "TXT",
        slug: "txt",
        level: 2,
        parentId: boyGroup.id,
        sortOrder: 5,
      },
      {
        nameKo: "에이티즈",
        nameEn: "ATEEZ",
        slug: "ateez",
        level: 2,
        parentId: boyGroup.id,
        sortOrder: 6,
      },
    ],
  });

  console.log("  Level 2 보이그룹 생성 완료 (7개)");

  // ─── Level 2: 걸그룹 아티스트 (4개) ──────────────────────────────────────────

  const blackpink = await prisma.topic.create({
    data: {
      nameKo: "블랙핑크",
      nameEn: "BLACKPINK",
      slug: "blackpink",
      level: 2,
      parentId: girlGroup.id,
      sortOrder: 0,
    },
  });

  await prisma.topic.createMany({
    data: [
      {
        nameKo: "트와이스",
        nameEn: "TWICE",
        slug: "twice",
        level: 2,
        parentId: girlGroup.id,
        sortOrder: 1,
      },
      {
        nameKo: "에스파",
        nameEn: "aespa",
        slug: "aespa",
        level: 2,
        parentId: girlGroup.id,
        sortOrder: 2,
      },
      {
        nameKo: "아이브",
        nameEn: "IVE",
        slug: "ive",
        level: 2,
        parentId: girlGroup.id,
        sortOrder: 3,
      },
    ],
  });

  console.log("  Level 2 걸그룹 생성 완료 (4개)");

  // ─── Level 2: K-드라마 작품 (9개) ────────────────────────────────────────────

  const squidGame = await prisma.topic.create({
    data: {
      nameKo: "오징어 게임",
      nameEn: "Squid Game",
      slug: "squid-game",
      level: 2,
      parentId: kdrama.id,
      sortOrder: 0,
    },
  });

  await prisma.topic.createMany({
    data: [
      {
        nameKo: "눈물의 여왕",
        nameEn: "Queen of Tears",
        slug: "queen-of-tears",
        level: 2,
        parentId: kdrama.id,
        sortOrder: 1,
      },
      {
        nameKo: "더 글로리",
        nameEn: "The Glory",
        slug: "the-glory",
        level: 2,
        parentId: kdrama.id,
        sortOrder: 2,
      },
      {
        nameKo: "사랑의 불시착",
        nameEn: "Crash Landing on You",
        slug: "crash-landing-on-you",
        level: 2,
        parentId: kdrama.id,
        sortOrder: 3,
      },
      {
        nameKo: "이태원 클라쓰",
        nameEn: "Itaewon Class",
        slug: "itaewon-class",
        level: 2,
        parentId: kdrama.id,
        sortOrder: 4,
      },
      {
        nameKo: "도깨비",
        nameEn: "Goblin",
        slug: "goblin",
        level: 2,
        parentId: kdrama.id,
        sortOrder: 5,
      },
      {
        nameKo: "이상한 변호사 우영우",
        nameEn: "Extraordinary Attorney Woo",
        slug: "extraordinary-attorney-woo",
        level: 2,
        parentId: kdrama.id,
        sortOrder: 6,
      },
      {
        nameKo: "선재 업고 튀어",
        nameEn: "Lovely Runner",
        slug: "lovely-runner",
        level: 2,
        parentId: kdrama.id,
        sortOrder: 7,
      },
      {
        nameKo: "킹더랜드",
        nameEn: "King the Land",
        slug: "king-the-land",
        level: 2,
        parentId: kdrama.id,
        sortOrder: 8,
      },
    ],
  });

  console.log("  Level 2 K-드라마 생성 완료 (9개)");

  // ─── Level 2: K-영화 작품 (4개) ──────────────────────────────────────────────

  await prisma.topic.createMany({
    data: [
      {
        nameKo: "기생충",
        nameEn: "Parasite",
        slug: "parasite",
        level: 2,
        parentId: kmovie.id,
        sortOrder: 0,
      },
      {
        nameKo: "올드보이",
        nameEn: "Oldboy",
        slug: "oldboy",
        level: 2,
        parentId: kmovie.id,
        sortOrder: 1,
      },
      {
        nameKo: "부산행",
        nameEn: "Train to Busan",
        slug: "train-to-busan",
        level: 2,
        parentId: kmovie.id,
        sortOrder: 2,
      },
      {
        nameKo: "헤어질 결심",
        nameEn: "Decision to Leave",
        slug: "decision-to-leave",
        level: 2,
        parentId: kmovie.id,
        sortOrder: 3,
      },
    ],
  });

  console.log("  Level 2 K-영화 생성 완료 (4개)");

  // ─── Level 2: K-예능 작품 (2개) ──────────────────────────────────────────────

  const culinaryClassWars = await prisma.topic.create({
    data: {
      nameKo: "흑백요리사",
      nameEn: "Culinary Class Wars",
      slug: "culinary-class-wars",
      level: 2,
      parentId: kvariety.id,
      sortOrder: 0,
    },
  });

  await prisma.topic.create({
    data: {
      nameKo: "런닝맨",
      nameEn: "Running Man",
      slug: "running-man",
      level: 2,
      parentId: kvariety.id,
      sortOrder: 1,
    },
  });

  console.log("  Level 2 K-예능 생성 완료 (2개)");

  // ─── Level 3: 멤버 / 시즌 (5개) ──────────────────────────────────────────────

  // BLACKPINK > 제니
  await prisma.topic.create({
    data: {
      nameKo: "제니",
      nameEn: "JENNIE",
      slug: "jennie",
      level: 3,
      parentId: blackpink.id,
      sortOrder: 0,
    },
  });

  // 오징어 게임 > 시즌1, 시즌2
  await prisma.topic.createMany({
    data: [
      {
        nameKo: "시즌1",
        nameEn: "Season 1",
        slug: "squid-game-s1",
        level: 3,
        parentId: squidGame.id,
        sortOrder: 0,
      },
      {
        nameKo: "시즌2",
        nameEn: "Season 2",
        slug: "squid-game-s2",
        level: 3,
        parentId: squidGame.id,
        sortOrder: 1,
      },
    ],
  });

  // 흑백요리사 > 시즌1, 시즌2
  await prisma.topic.createMany({
    data: [
      {
        nameKo: "시즌1",
        nameEn: "Season 1",
        slug: "culinary-class-wars-s1",
        level: 3,
        parentId: culinaryClassWars.id,
        sortOrder: 0,
      },
      {
        nameKo: "시즌2",
        nameEn: "Season 2",
        slug: "culinary-class-wars-s2",
        level: 3,
        parentId: culinaryClassWars.id,
        sortOrder: 1,
      },
    ],
  });

  console.log("  Level 3 생성 완료 (5개): 제니, 오징어게임 S1/S2, 흑백요리사 S1/S2");

  const totalTopics = await prisma.topic.count();
  console.log(`\n  ✅ 총 Topic: ${totalTopics}개`);
  console.log("     (Level 0: 2 | Level 1: 7 | Level 2: 26 | Level 3: 5)");

  // ─── Tags (15개) ──────────────────────────────────────────────────────────────
  await prisma.tag.createMany({
    data: [
      // FOOD (9개)
      { name: "Bunsik",              nameKo: "분식",       slug: "bunsik",              group: "FOOD",       sortOrder: 0 },
      { name: "Traditional",         nameKo: "전통음식",   slug: "traditional",         group: "FOOD",       sortOrder: 1 },
      { name: "Chicken",             nameKo: "치킨",       slug: "chicken",             group: "FOOD",       sortOrder: 2 },
      { name: "BBQ",                 nameKo: "바베큐",     slug: "bbq",                 group: "FOOD",       sortOrder: 3 },
      { name: "Convenience Store",   nameKo: "편의점",     slug: "convenience-store",   group: "FOOD",       sortOrder: 4 },
      { name: "Drinks",              nameKo: "음료",       slug: "drinks",              group: "FOOD",       sortOrder: 5 },
      { name: "Cafe",                nameKo: "카페",       slug: "cafe",                group: "FOOD",       sortOrder: 6 },
      { name: "Street Food & Snacks",nameKo: "길거리 음식",slug: "street-food-snacks",  group: "FOOD",       sortOrder: 7 },
      { name: "Dessert & Sweets",    nameKo: "디저트",     slug: "dessert-sweets",      group: "FOOD",       sortOrder: 8 },
      // SPOT (3개)
      { name: "Nature",              nameKo: "자연",       slug: "nature",              group: "SPOT",       sortOrder: 0 },
      { name: "Filming Spot",        nameKo: "촬영지",     slug: "filming-spot",        group: "SPOT",       sortOrder: 1 },
      { name: "Attraction",          nameKo: "명소",       slug: "attraction",          group: "SPOT",       sortOrder: 2 },
      // EXPERIENCE (3개)
      { name: "Dance",               nameKo: "댄스",       slug: "dance",               group: "EXPERIENCE", sortOrder: 0 },
      { name: "Cooking",             nameKo: "요리",       slug: "cooking",             group: "EXPERIENCE", sortOrder: 1 },
      { name: "Beauty",              nameKo: "뷰티",       slug: "beauty",              group: "EXPERIENCE", sortOrder: 2 },
    ],
  });

  const totalTags = await prisma.tag.count();
  console.log(`  ✅ 총 Tag: ${totalTags}개`);

  console.log("\n🌱 시드 완료!");
}

main()
  .catch((e) => {
    console.error("❌ 시드 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
