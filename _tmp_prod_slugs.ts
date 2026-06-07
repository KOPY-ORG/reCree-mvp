/**
 * Production DB 포스트 슬러그 조회용 일회성 스크립트 (READ-ONLY)
 *
 * 실행 방법:
 *   PROD_DATABASE_URL="postgresql://..." npx tsx _tmp_prod_slugs.ts
 *
 * 주의: SELECT 외 어떤 쿼리도 실행하지 않음.
 *       완료 후 이 파일 삭제할 것.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prodUrl = process.env.PROD_DATABASE_URL;
if (!prodUrl) {
  console.error("❌ PROD_DATABASE_URL 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: prodUrl });
const prisma = new PrismaClient({ adapter });

const posts = await prisma.post.findMany({
  select: { slug: true },
  orderBy: { slug: "asc" },
});

await prisma.$disconnect();

posts.forEach((p) => console.log(p.slug));
console.log(`[총 ${posts.length}개]`);
