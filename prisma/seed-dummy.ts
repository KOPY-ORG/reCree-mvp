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

async function main() {
  console.log("더미 데이터 시드 시작...");

  // 1. 기존 더미 데이터 정리 (의존성 순으로)
  await prisma.homeBanner.deleteMany();
  await prisma.curatedSection.deleteMany();
  await prisma.popularSearch.deleteMany();
  await prisma.postPlace.deleteMany();
  await prisma.postTopic.deleteMany();
  await prisma.postTag.deleteMany();
  await prisma.postSource.deleteMany();
  await prisma.post.deleteMany();
  await prisma.place.deleteMany();
  console.log("  기존 데이터 삭제 완료 (Topic/Tag 유지)");

  // 2. 기존 Topic, Tag 조회 (없으면 빈 배열)
  const topics = await prisma.topic.findMany({
    select: { id: true },
    where: { isActive: true },
  });
  const tags = await prisma.tag.findMany({
    select: { id: true },
    where: { isActive: true },
  });

  // 3. 더미 포스트 20개 생성
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

    // 4. 토픽 연결 (1~2개)
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

  // 5. HomeBanner — 포스트 1~5 등록
  await prisma.homeBanner.createMany({
    data: postIds.slice(0, 5).map((postId, idx) => ({
      postId,
      order: idx,
      isActive: true,
    })),
  });
  console.log("  HomeBanner 5개 생성 완료");

  // 6. CuratedSection 2개
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
    ],
  });
  console.log("  CuratedSection 2개 생성 완료");

  // 7. PopularSearch 6개
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

  // 8. 결과 출력
  console.log("\n더미 데이터 생성 완료");
  console.log(`  - Post: 20개`);
  console.log(`  - HomeBanner: 5개`);
  console.log(`  - CuratedSection: 2개`);
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
