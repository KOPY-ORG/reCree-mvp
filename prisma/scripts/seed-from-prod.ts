// .env.local 로드 — tsx/ts-node는 자동으로 읽지 않음
try {
  process.loadEnvFile(".env.local");
} catch {}

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as readline from "readline";

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function parseDbInfo(url: string): { host: string; ref: string } {
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

// ─── 진행 추적 ────────────────────────────────────────────────────────────────

const TOTAL = 18;
let step = 0;
let totalRows = 0;

function log(table: string, count: number) {
  step++;
  totalRows += count;
  console.log(`[${step}/${TOTAL}] ${table}: ${count} rows`);
}

// ─── wipe ─────────────────────────────────────────────────────────────────────

async function wipeDevDb(devDb: PrismaClient) {
  console.log("\n🗑  dev DB 초기화 중... (TRUNCATE CASCADE)");
  // CASCADE로 ReCreeshot 등 의존 테이블도 자동 처리
  await devDb.$executeRaw`
    TRUNCATE TABLE
      "GuideVideo", "Policy", "CuratedSection", "HomeBanner",
      "PostTopic", "PostTag", "PostSource", "PostPlace", "PostImage", "Post",
      "PlaceImage", "Place", "PlaceType", "Area",
      "Tag", "TagGroupConfig", "Topic", "User"
    CASCADE
  `;
  console.log("✅ 초기화 완료\n");
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const DEV_URL = process.env.DATABASE_URL;
  const PROD_URL = process.env.PROD_DATABASE_URL;

  if (!DEV_URL || !PROD_URL) {
    console.error("❌ 필수 환경변수 누락:");
    if (!DEV_URL) console.error("   DATABASE_URL (.env.local)");
    if (!PROD_URL) console.error("   PROD_DATABASE_URL (런타임 주입 필요)");
    console.error("\n실행 방법 (히스토리 회피용 leading space):");
    console.error('    PROD_DATABASE_URL="postgresql://..." pnpm tsx prisma/scripts/seed-from-prod.ts');
    process.exit(1);
  }

  const dev = parseDbInfo(DEV_URL);
  const prod = parseDbInfo(PROD_URL);

  console.log("\n📋 연결 정보 확인");
  console.log(`  Prod  host: ${prod.host}  ref: ${prod.ref}`);
  console.log(`  Dev   host: ${dev.host}   ref: ${dev.ref}`);

  if (prod.ref === dev.ref) {
    console.error("\n❌ prod ref와 dev ref가 동일합니다. 같은 DB를 가리키고 있습니다. 중단합니다.");
    process.exit(1);
  }

  // SEED_YES=1 SEED_MODE=wipe|skip 로 비대화형 실행 가능
  const nonInteractive = process.env.SEED_YES === "1" && !!process.env.SEED_MODE;

  let mode: string;

  if (nonInteractive) {
    mode = process.env.SEED_MODE!.trim().toLowerCase();
    console.log(`\n[비대화형] SEED_YES=1 SEED_MODE=${mode}`);
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const confirm = await ask(rl, "\nContinue? (yes/no): ");
    if (confirm.trim() !== "yes") {
      console.log("Aborted.");
      rl.close();
      process.exit(0);
    }

    console.log("\ndev DB 초기화 정책 선택:");
    console.log("  wipe  — 해당 테이블 전체 삭제 후 import (TRUNCATE CASCADE, clean slate)");
    console.log("  skip  — 중복 row는 건너뜀 (createMany skipDuplicates)");
    console.log("  abort — 종료");

    mode = (await ask(rl, "\n선택 (wipe/skip/abort): ")).trim().toLowerCase();
    rl.close();
  }

  if (mode !== "wipe" && mode !== "skip") {
    console.log("Aborted.");
    process.exit(0);
  }

  const prodDb = createClient(PROD_URL);
  const devDb = createClient(DEV_URL);

  try {
    if (mode === "wipe") await wipeDevDb(devDb);

    const skipDuplicates = mode === "skip";
    console.log("📥 데이터 import 시작\n");

    // 1. User (ADMIN/EDITOR only) — 먼저 import해야 Post.authorId FK 충족
    const users = await prodDb.user.findMany({
      where: { role: { in: ["ADMIN", "EDITOR"] } },
    });
    await devDb.user.createMany({ data: users, skipDuplicates });
    log("User (ADMIN/EDITOR)", users.length);
    const adminIds = new Set(users.map((u) => u.id));

    // 2. TagGroupConfig
    const tagGroupConfigs = await prodDb.tagGroupConfig.findMany({});
    await devDb.tagGroupConfig.createMany({ data: tagGroupConfigs, skipDuplicates });
    log("TagGroupConfig", tagGroupConfigs.length);

    // 3. Topic — level 오름차순 정렬 (parentId 자기참조: 부모 먼저)
    const topics = await prodDb.topic.findMany({ orderBy: { level: "asc" } });
    await devDb.topic.createMany({ data: topics, skipDuplicates });
    log("Topic", topics.length);

    // 4. Tag
    const tags = await prodDb.tag.findMany({});
    await devDb.tag.createMany({ data: tags, skipDuplicates });
    log("Tag", tags.length);

    // 5. Area — level 오름차순 정렬 (parentId 자기참조: 부모 먼저)
    const areas = await prodDb.area.findMany({ orderBy: { level: "asc" } });
    await devDb.area.createMany({ data: areas, skipDuplicates });
    log("Area", areas.length);

    // 6. PlaceType
    const placeTypes = await prodDb.placeType.findMany({});
    await devDb.placeType.createMany({ data: placeTypes, skipDuplicates });
    log("PlaceType", placeTypes.length);

    // 7. Place
    const places = await prodDb.place.findMany({});
    await devDb.place.createMany({
      data: places.map((p) => ({ ...p, operatingHours: p.operatingHours ?? Prisma.DbNull })),
      skipDuplicates,
    });
    log("Place", places.length);

    // 8. PlaceImage
    const placeImages = await prodDb.placeImage.findMany({});
    await devDb.placeImage.createMany({ data: placeImages, skipDuplicates });
    log("PlaceImage", placeImages.length);

    // 9. Post — authorId가 dev에 없는 user를 가리키면 null 처리
    const posts = await prodDb.post.findMany({});
    const sanitizedPosts = posts.map((p) => ({
      ...p,
      authorId: p.authorId && adminIds.has(p.authorId) ? p.authorId : null,
    }));
    await devDb.post.createMany({ data: sanitizedPosts, skipDuplicates });
    log("Post", posts.length);
    const postIds = posts.map((p) => p.id);

    // 10. PostImage
    const postImages = await prodDb.postImage.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.postImage.createMany({ data: postImages, skipDuplicates });
    log("PostImage", postImages.length);

    // 11. PostPlace
    const postPlaces = await prodDb.postPlace.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.postPlace.createMany({
      data: postPlaces.map((p) => ({ ...p, insightEn: p.insightEn ?? Prisma.DbNull })),
      skipDuplicates,
    });
    log("PostPlace", postPlaces.length);

    // 12. PostSource
    const postSources = await prodDb.postSource.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.postSource.createMany({ data: postSources, skipDuplicates });
    log("PostSource", postSources.length);

    // 13. PostTag
    const postTags = await prodDb.postTag.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.postTag.createMany({ data: postTags, skipDuplicates });
    log("PostTag", postTags.length);

    // 14. PostTopic
    const postTopics = await prodDb.postTopic.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.postTopic.createMany({ data: postTopics, skipDuplicates });
    log("PostTopic", postTopics.length);

    // 15. HomeBanner
    const homeBanners = await prodDb.homeBanner.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.homeBanner.createMany({
      data: homeBanners.map((b) => ({ ...b, labelOverrides: b.labelOverrides ?? Prisma.DbNull })),
      skipDuplicates,
    });
    log("HomeBanner", homeBanners.length);

    // 16. CuratedSection
    const curatedSections = await prodDb.curatedSection.findMany({});
    await devDb.curatedSection.createMany({ data: curatedSections, skipDuplicates });
    log("CuratedSection", curatedSections.length);

    // 17. Policy
    const policies = await prodDb.policy.findMany({});
    await devDb.policy.createMany({ data: policies, skipDuplicates });
    log("Policy", policies.length);

    // 18. GuideVideo
    const guideVideos = await prodDb.guideVideo.findMany({});
    await devDb.guideVideo.createMany({ data: guideVideos, skipDuplicates });
    log("GuideVideo", guideVideos.length);

    console.log(`\n✅ 완료: ${TOTAL}개 테이블, 총 ${totalRows} rows imported`);
  } catch (e) {
    console.error(`\n❌ 에러 발생 (step ${step + 1}/${TOTAL}):`, e);
    process.exit(1);
  } finally {
    await prodDb.$disconnect();
    await devDb.$disconnect();
  }
}

main();
