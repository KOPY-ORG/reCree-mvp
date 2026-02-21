/**
 * Prisma 시드 스크립트 - reCree MVP 초기 데이터
 * Topic 트리(27개) + Tag(15개) 삽입
 */

// ts-node는 .env.local을 자동으로 로드하지 않으므로 명시적으로 로드
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local이 없으면 무시
}

import { PrismaClient, TopicType, TagGroup } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 시드 시작...");

  // ─── 기존 데이터 삭제 (의존성 역순) ─────────────────────────────────────────
  await prisma.tag.deleteMany();
  // Topic은 자기참조(self-relation)이므로 자식부터 삭제
  await prisma.topic.deleteMany({ where: { level: 2 } });
  await prisma.topic.deleteMany({ where: { level: 1 } });
  await prisma.topic.deleteMany({ where: { level: 0 } });
  console.log("  기존 Topic/Tag 데이터 삭제 완료");

  // ─── level 0: CATEGORY Topics ────────────────────────────────────────────────
  const kpop = await prisma.topic.create({
    data: {
      nameKo: "K-POP",
      nameEn: "K-POP",
      slug: "k-pop",
      type: TopicType.CATEGORY,
      level: 0,
      sortOrder: 0,
    },
  });

  const kdrama = await prisma.topic.create({
    data: {
      nameKo: "K-DRAMA",
      nameEn: "K-DRAMA",
      slug: "k-drama",
      type: TopicType.CATEGORY,
      level: 0,
      sortOrder: 1,
    },
  });

  const kmovie = await prisma.topic.create({
    data: {
      nameKo: "K-MOVIE",
      nameEn: "K-MOVIE",
      slug: "k-movie",
      type: TopicType.CATEGORY,
      level: 0,
      sortOrder: 2,
    },
  });

  const kvariety = await prisma.topic.create({
    data: {
      nameKo: "K-VARIETY",
      nameEn: "K-VARIETY",
      slug: "k-variety",
      type: TopicType.CATEGORY,
      level: 0,
      sortOrder: 3,
    },
  });

  console.log("  level 0 Topics 생성 완료 (4개)");

  // ─── level 1: K-POP 아티스트/그룹 ────────────────────────────────────────────
  const blackpink = await prisma.topic.create({
    data: {
      nameKo: "블랙핑크",
      nameEn: "BLACKPINK",
      slug: "blackpink",
      type: TopicType.GROUP,
      level: 1,
      parentId: kpop.id,
      sortOrder: 1,
    },
  });

  await prisma.topic.createMany({
    data: [
      {
        nameKo: "방탄소년단",
        nameEn: "BTS",
        slug: "bts",
        type: TopicType.GROUP,
        level: 1,
        parentId: kpop.id,
        sortOrder: 0,
      },
      {
        nameKo: "세븐틴",
        nameEn: "SVT",
        slug: "svt",
        type: TopicType.GROUP,
        level: 1,
        parentId: kpop.id,
        sortOrder: 2,
      },
      {
        nameKo: "트와이스",
        nameEn: "TWICE",
        slug: "twice",
        type: TopicType.GROUP,
        level: 1,
        parentId: kpop.id,
        sortOrder: 3,
      },
      {
        nameKo: "엔시티",
        nameEn: "NCT",
        slug: "nct",
        type: TopicType.GROUP,
        level: 1,
        parentId: kpop.id,
        sortOrder: 4,
      },
      {
        nameKo: "에스파",
        nameEn: "aespa",
        slug: "aespa",
        type: TopicType.GROUP,
        level: 1,
        parentId: kpop.id,
        sortOrder: 5,
      },
      {
        nameKo: "스트레이키즈",
        nameEn: "Stray Kids",
        slug: "stray-kids",
        type: TopicType.GROUP,
        level: 1,
        parentId: kpop.id,
        sortOrder: 6,
      },
      {
        nameKo: "엔하이픈",
        nameEn: "ENHYPEN",
        slug: "enhypen",
        type: TopicType.GROUP,
        level: 1,
        parentId: kpop.id,
        sortOrder: 7,
      },
      {
        nameKo: "아이브",
        nameEn: "IVE",
        slug: "ive",
        type: TopicType.GROUP,
        level: 1,
        parentId: kpop.id,
        sortOrder: 8,
      },
      {
        nameKo: "투모로우바이투게더",
        nameEn: "TXT",
        slug: "txt",
        type: TopicType.GROUP,
        level: 1,
        parentId: kpop.id,
        sortOrder: 9,
      },
      {
        nameKo: "에이티즈",
        nameEn: "ATEEZ",
        slug: "ateez",
        type: TopicType.GROUP,
        level: 1,
        parentId: kpop.id,
        sortOrder: 10,
      },
    ],
  });

  console.log("  level 1 K-POP Topics 생성 완료 (11개)");

  // ─── level 1: K-DRAMA ────────────────────────────────────────────────────────
  const squidGame = await prisma.topic.create({
    data: {
      nameKo: "오징어 게임",
      nameEn: "Squid Game",
      slug: "squid-game",
      type: TopicType.WORK,
      level: 1,
      parentId: kdrama.id,
      sortOrder: 8,
    },
  });

  await prisma.topic.createMany({
    data: [
      {
        nameKo: "눈물의 여왕",
        nameEn: "Queen of Tears",
        slug: "queen-of-tears",
        type: TopicType.WORK,
        level: 1,
        parentId: kdrama.id,
        sortOrder: 0,
      },
      {
        nameKo: "더 글로리",
        nameEn: "The Glory",
        slug: "the-glory",
        type: TopicType.WORK,
        level: 1,
        parentId: kdrama.id,
        sortOrder: 1,
      },
      {
        nameKo: "사랑의 불시착",
        nameEn: "Crash Landing on You",
        slug: "crash-landing-on-you",
        type: TopicType.WORK,
        level: 1,
        parentId: kdrama.id,
        sortOrder: 2,
      },
      {
        nameKo: "이태원 클라쓰",
        nameEn: "Itaewon Class",
        slug: "itaewon-class",
        type: TopicType.WORK,
        level: 1,
        parentId: kdrama.id,
        sortOrder: 3,
      },
      {
        nameKo: "도깨비",
        nameEn: "Goblin",
        slug: "goblin",
        type: TopicType.WORK,
        level: 1,
        parentId: kdrama.id,
        sortOrder: 4,
      },
      {
        nameKo: "이상한 변호사 우영우",
        nameEn: "Extraordinary Attorney Woo",
        slug: "extraordinary-attorney-woo",
        type: TopicType.WORK,
        level: 1,
        parentId: kdrama.id,
        sortOrder: 5,
      },
      {
        nameKo: "선재 업고 튀어",
        nameEn: "Lovely Runner",
        slug: "lovely-runner",
        type: TopicType.WORK,
        level: 1,
        parentId: kdrama.id,
        sortOrder: 6,
      },
      {
        nameKo: "킹더랜드",
        nameEn: "King the Land",
        slug: "king-the-land",
        type: TopicType.WORK,
        level: 1,
        parentId: kdrama.id,
        sortOrder: 7,
      },
    ],
  });

  console.log("  level 1 K-DRAMA Topics 생성 완료 (9개)");

  // ─── level 1: K-MOVIE ────────────────────────────────────────────────────────
  await prisma.topic.createMany({
    data: [
      {
        nameKo: "기생충",
        nameEn: "Parasite",
        slug: "parasite",
        type: TopicType.WORK,
        level: 1,
        parentId: kmovie.id,
        sortOrder: 0,
      },
      {
        nameKo: "올드보이",
        nameEn: "Oldboy",
        slug: "oldboy",
        type: TopicType.WORK,
        level: 1,
        parentId: kmovie.id,
        sortOrder: 1,
      },
      {
        nameKo: "부산행",
        nameEn: "Train to Busan",
        slug: "train-to-busan",
        type: TopicType.WORK,
        level: 1,
        parentId: kmovie.id,
        sortOrder: 2,
      },
      {
        nameKo: "헤어질 결심",
        nameEn: "Decision to Leave",
        slug: "decision-to-leave",
        type: TopicType.WORK,
        level: 1,
        parentId: kmovie.id,
        sortOrder: 3,
      },
    ],
  });

  console.log("  level 1 K-MOVIE Topics 생성 완료 (4개)");

  // ─── level 1: K-VARIETY ──────────────────────────────────────────────────────
  const culinaryClassWars = await prisma.topic.create({
    data: {
      nameKo: "흑백요리사",
      nameEn: "Culinary Class Wars",
      slug: "culinary-class-wars",
      type: TopicType.WORK,
      level: 1,
      parentId: kvariety.id,
      sortOrder: 1,
    },
  });

  await prisma.topic.create({
    data: {
      nameKo: "런닝맨",
      nameEn: "Running Man",
      slug: "running-man",
      type: TopicType.WORK,
      level: 1,
      parentId: kvariety.id,
      sortOrder: 0,
    },
  });

  console.log("  level 1 K-VARIETY Topics 생성 완료 (2개)");

  // ─── level 2: 자식 Topics ────────────────────────────────────────────────────
  // BLACKPINK > 제니
  await prisma.topic.create({
    data: {
      nameKo: "제니",
      nameEn: "JENNIE",
      slug: "jennie",
      type: TopicType.PERSON,
      subtype: "아티스트",
      level: 2,
      parentId: blackpink.id,
      sortOrder: 0,
    },
  });

  // 오징어 게임 > 시즌
  await prisma.topic.createMany({
    data: [
      {
        nameKo: "시즌1",
        nameEn: "Season 1",
        slug: "squid-game-s1",
        type: TopicType.SEASON,
        level: 2,
        parentId: squidGame.id,
        sortOrder: 0,
      },
      {
        nameKo: "시즌2",
        nameEn: "Season 2",
        slug: "squid-game-s2",
        type: TopicType.SEASON,
        level: 2,
        parentId: squidGame.id,
        sortOrder: 1,
      },
    ],
  });

  // 흑백요리사 > 시즌
  await prisma.topic.createMany({
    data: [
      {
        nameKo: "시즌1",
        nameEn: "Season 1",
        slug: "culinary-class-wars-s1",
        type: TopicType.SEASON,
        level: 2,
        parentId: culinaryClassWars.id,
        sortOrder: 0,
      },
      {
        nameKo: "시즌2",
        nameEn: "Season 2",
        slug: "culinary-class-wars-s2",
        type: TopicType.SEASON,
        level: 2,
        parentId: culinaryClassWars.id,
        sortOrder: 1,
      },
    ],
  });

  console.log("  level 2 Topics 생성 완료 (5개)");

  const totalTopics = await prisma.topic.count();
  console.log(`  ✅ 총 Topic: ${totalTopics}개`);

  // ─── Tags ─────────────────────────────────────────────────────────────────────
  await prisma.tag.createMany({
    data: [
      // FOOD (9개)
      {
        name: "Bunsik",
        nameKo: "분식",
        slug: "bunsik",
        group: TagGroup.FOOD,
        sortOrder: 0,
      },
      {
        name: "Traditional",
        nameKo: "전통음식",
        slug: "traditional",
        group: TagGroup.FOOD,
        sortOrder: 1,
      },
      {
        name: "Chicken",
        nameKo: "치킨",
        slug: "chicken",
        group: TagGroup.FOOD,
        sortOrder: 2,
      },
      {
        name: "BBQ",
        nameKo: "바베큐",
        slug: "bbq",
        group: TagGroup.FOOD,
        sortOrder: 3,
      },
      {
        name: "Convenience Store",
        nameKo: "편의점",
        slug: "convenience-store",
        group: TagGroup.FOOD,
        sortOrder: 4,
      },
      {
        name: "Drinks",
        nameKo: "음료",
        slug: "drinks",
        group: TagGroup.FOOD,
        sortOrder: 5,
      },
      {
        name: "Cafe",
        nameKo: "카페",
        slug: "cafe",
        group: TagGroup.FOOD,
        sortOrder: 6,
      },
      {
        name: "Street Food & Snacks",
        nameKo: "길거리 음식",
        slug: "street-food-snacks",
        group: TagGroup.FOOD,
        sortOrder: 7,
      },
      {
        name: "Dessert & Sweets",
        nameKo: "디저트",
        slug: "dessert-sweets",
        group: TagGroup.FOOD,
        sortOrder: 8,
      },
      // SPOT (3개)
      {
        name: "Nature",
        nameKo: "자연",
        slug: "nature",
        group: TagGroup.SPOT,
        sortOrder: 0,
      },
      {
        name: "Filming Spot",
        nameKo: "촬영지",
        slug: "filming-spot",
        group: TagGroup.SPOT,
        sortOrder: 1,
      },
      {
        name: "Attraction",
        nameKo: "명소",
        slug: "attraction",
        group: TagGroup.SPOT,
        sortOrder: 2,
      },
      // EXPERIENCE (3개)
      {
        name: "Dance",
        nameKo: "댄스",
        slug: "dance",
        group: TagGroup.EXPERIENCE,
        sortOrder: 0,
      },
      {
        name: "Cooking",
        nameKo: "요리",
        slug: "cooking",
        group: TagGroup.EXPERIENCE,
        sortOrder: 1,
      },
      {
        name: "Beauty",
        nameKo: "뷰티",
        slug: "beauty",
        group: TagGroup.EXPERIENCE,
        sortOrder: 2,
      },
    ],
  });

  const totalTags = await prisma.tag.count();
  console.log(`  ✅ 총 Tag: ${totalTags}개`);

  console.log("🌱 시드 완료!");
}

main()
  .catch((e) => {
    console.error("❌ 시드 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
