// 홈 화면 프로토타이핑용 더미 데이터 시드 스크립트
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

function pickRandom<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

const DUMMY_USER_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  console.log("더미 데이터 시드 시작...");

  // 1. 기존 더미 데이터 정리 (의존성 순으로)
  await prisma.reCreeshotTag.deleteMany();
  await prisma.reCreeshotTopic.deleteMany();
  await prisma.reCreeshot.deleteMany();
  await prisma.homeBanner.deleteMany();
  await prisma.curatedSection.deleteMany();
  await prisma.popularSearch.deleteMany();
  await prisma.postPlace.deleteMany();
  await prisma.postTopic.deleteMany();
  await prisma.postTag.deleteMany();
  await prisma.postSource.deleteMany();
  await prisma.post.deleteMany();
  await prisma.place.deleteMany();
  await prisma.user.deleteMany({ where: { email: "seed@recree.dev" } });
  console.log("  기존 데이터 삭제 완료 (Topic/Tag 유지)");

  // 2. Dummy User upsert (ReCreeshot.userId required)
  await prisma.user.upsert({
    where: { id: DUMMY_USER_ID },
    create: { id: DUMMY_USER_ID, email: "seed@recree.dev" },
    update: {},
  });

  // 3. 기존 Topic, Tag 조회 (없으면 빈 배열)
  const topics = await prisma.topic.findMany({
    select: { id: true },
    where: { isActive: true },
  });
  const tags = await prisma.tag.findMany({
    select: { id: true },
    where: { isActive: true },
  });

  // 4. 더미 포스트 20개 생성
  const postIds: string[] = [];
  let postTopicCount = 0;
  let postTagCount = 0;

  for (let i = 1; i <= 20; i++) {
    const post = await prisma.post.create({
      data: {
        titleEn: `Dummy Post ${i}`,
        titleKo: `더미 포스트 ${i}`,
        slug: `dummy-post-${i}`,
        status: "PUBLISHED",
        publishedAt: new Date(Date.now() - i * 60 * 60 * 1000),
        bodyEn: `This is dummy post ${i} for layout testing.`,
        thumbnailUrl: null,
      },
    });
    postIds.push(post.id);

    // 5. 토픽 연결 (1~2개)
    if (topics.length > 0) {
      const picked = pickRandom(topics, Math.floor(Math.random() * 2) + 1);
      await prisma.postTopic.createMany({
        data: picked.map((t, idx) => ({
          postId: post.id,
          topicId: t.id,
          isVisible: true,
          displayOrder: idx,
        })),
      });
      postTopicCount += picked.length;
    }

    // 태그 연결 (1~2개)
    if (tags.length > 0) {
      const picked = pickRandom(tags, Math.floor(Math.random() * 2) + 1);
      await prisma.postTag.createMany({
        data: picked.map((t, idx) => ({
          postId: post.id,
          tagId: t.id,
          isVisible: true,
          displayOrder: idx,
        })),
      });
      postTagCount += picked.length;
    }
  }
  console.log("  Post 20개 생성 완료");

  // 6. recreeshot 10개 생성
  await prisma.reCreeshot.createMany({
    data: Array.from({ length: 10 }, (_, i) => ({
      userId: DUMMY_USER_ID,
      imageUrl: `https://picsum.photos/seed/recreeshot${i + 1}/300/400`,
      matchScore: i % 2 === 0 ? 60 + i * 4 : null,
      showBadge: i % 2 === 0,
      status: "ACTIVE",
    })),
  });
  console.log("  recreeshot 10개 생성 완료");

  // 7. HomeBanner — 포스트 1~5 등록
  await prisma.homeBanner.createMany({
    data: postIds.slice(0, 5).map((postId, idx) => ({
      postId,
      order: idx,
      isActive: true,
    })),
  });
  console.log("  HomeBanner 5개 생성 완료");

  // 8. CuratedSection 3개 (POST 2개 + RECREESHOT 1개)
  await prisma.curatedSection.createMany({
    data: [
      {
        titleEn: "K-POP Filming Spots",
        type: "MANUAL",
        postIds: postIds.slice(0, 10),
        order: 0,
        isActive: true,
      },
      {
        titleEn: "K-Food Must Try",
        type: "MANUAL",
        postIds: postIds.slice(10, 20),
        order: 1,
        isActive: true,
      },
      {
        titleEn: "Recreate & Flex Your K-Trip!",
        contentType: "RECREESHOT",
        type: "AUTO_NEW",
        postIds: [],
        maxCount: 10,
        order: 2,
        isActive: true,
      },
    ],
  });
  console.log("  CuratedSection 3개 생성 완료 (POST 2 + RECREESHOT 1)");

  // 9. PopularSearch 6개
  const keywords = [
    "BTS Filming Spot",
    "Jungkook K-BBQ",
    "KPOP Dance Class",
    "Seoul Cafe",
    "Gyeongbokgung",
    "Han River Park",
  ];
  await prisma.popularSearch.createMany({
    data: keywords.map((keyword, order) => ({ keyword, order, isActive: true })),
  });
  console.log("  PopularSearch 6개 생성 완료");

  // 10. 결과 출력
  console.log("\n더미 데이터 생성 완료");
  console.log(`  - Post: 20개`);
  console.log(`  - HomeBanner: 5개`);
  console.log(`  - CuratedSection: 3개 (POST 2 + RECREESHOT 1)`);
  console.log(`  - recreeshot: 10개`);
  console.log(`  - PopularSearch: 6개`);
  console.log(`  - PostTopic 연결: ${postTopicCount}개`);
  console.log(`  - PostTag 연결: ${postTagCount}개`);
}

main()
  .catch((e) => {
    console.error("더미 시드 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
