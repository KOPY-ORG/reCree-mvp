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

const TOTAL = 19;
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
  // User는 제외 — dev 현재 계정 보존
  // CASCADE로 ReCreeshotLike / Report / TopicFollow 등 의존 테이블 자동 처리
  await devDb.$executeRaw`
    TRUNCATE TABLE
      "GuideVideo", "Policy", "CuratedSection", "HomeBanner",
      "ReCreeshotTag", "ReCreeshotTopic", "ReCreeshot",
      "PostTopic", "PostTag", "PostSource", "PostPlace", "PostImage", "Post",
      "PlaceImage", "Place", "PlaceType", "Area",
      "Tag", "TagGroupConfig", "Topic"
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

  // Post.authorId / ReCreeshot.userId 를 치환할 dev 계정 UUID
  const TARGET_USER_ID = "6a693df3-1c02-4558-b25f-a44343f798cf";

  const prodDb = createClient(PROD_URL);
  const devDb = createClient(DEV_URL);

  try {
    // ── 치환 대상 계정 검증 (wipe 전에 확인) ──────────────────────────────────
    // User는 복사하지 않으므로, dev에 이 계정이 실제 존재해야 함
    const targetUser = await devDb.user.findUnique({ where: { id: TARGET_USER_ID } });
    if (!targetUser) {
      console.error(`\n❌ dev DB에 치환 대상 계정이 없습니다: ${TARGET_USER_ID}`);
      console.error("   이 계정이 dev User 테이블에 존재해야 합니다. 중단합니다.");
      process.exit(1);
    }
    console.log(`✅ 치환 계정 확인: ${targetUser.nickname ?? targetUser.email} (${TARGET_USER_ID})\n`);

    if (mode === "wipe") await wipeDevDb(devDb);

    const skipDuplicates = mode === "skip";
    console.log("📥 데이터 import 시작\n");

    // 1. TagGroupConfig
    const tagGroupConfigs = await prodDb.tagGroupConfig.findMany({});
    await devDb.tagGroupConfig.createMany({ data: tagGroupConfigs, skipDuplicates });
    log("TagGroupConfig", tagGroupConfigs.length);

    // 2. Topic — level 오름차순 정렬 (parentId 자기참조: 부모 먼저)
    const topics = await prodDb.topic.findMany({ orderBy: { level: "asc" } });
    await devDb.topic.createMany({ data: topics, skipDuplicates });
    log("Topic", topics.length);

    // 3. Tag
    const tags = await prodDb.tag.findMany({});
    await devDb.tag.createMany({ data: tags, skipDuplicates });
    log("Tag", tags.length);

    // 4. Area — level 오름차순 정렬 (parentId 자기참조: 부모 먼저)
    const areas = await prodDb.area.findMany({ orderBy: { level: "asc" } });
    await devDb.area.createMany({ data: areas, skipDuplicates });
    log("Area", areas.length);

    // 5. PlaceType
    const placeTypes = await prodDb.placeType.findMany({});
    await devDb.placeType.createMany({ data: placeTypes, skipDuplicates });
    log("PlaceType", placeTypes.length);

    // 6. Place
    const places = await prodDb.place.findMany({});
    await devDb.place.createMany({
      data: places.map((p) => ({ ...p, operatingHours: p.operatingHours ?? Prisma.DbNull })),
      skipDuplicates,
    });
    log("Place", places.length);

    // 7. PlaceImage
    const placeImages = await prodDb.placeImage.findMany({});
    await devDb.placeImage.createMany({ data: placeImages, skipDuplicates });
    log("PlaceImage", placeImages.length);

    // 8. Post — authorId를 TARGET_USER_ID로 치환 (prod 작성자는 dev에 없음)
    const posts = await prodDb.post.findMany({});
    await devDb.post.createMany({
      data: posts.map((p) => ({ ...p, authorId: TARGET_USER_ID })),
      skipDuplicates,
    });
    log("Post", posts.length);
    const postIds = posts.map((p) => p.id);

    // 9. PostImage
    const postImages = await prodDb.postImage.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.postImage.createMany({ data: postImages, skipDuplicates });
    log("PostImage", postImages.length);

    // 10. PostPlace
    const postPlaces = await prodDb.postPlace.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.postPlace.createMany({
      data: postPlaces.map((p) => ({ ...p, insightEn: p.insightEn ?? Prisma.DbNull })),
      skipDuplicates,
    });
    log("PostPlace", postPlaces.length);

    // 11. PostSource
    const postSources = await prodDb.postSource.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.postSource.createMany({ data: postSources, skipDuplicates });
    log("PostSource", postSources.length);

    // 12. PostTag
    const postTags = await prodDb.postTag.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.postTag.createMany({ data: postTags, skipDuplicates });
    log("PostTag", postTags.length);

    // 13. PostTopic
    const postTopics = await prodDb.postTopic.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.postTopic.createMany({ data: postTopics, skipDuplicates });
    log("PostTopic", postTopics.length);

    // 14. HomeBanner
    const homeBanners = await prodDb.homeBanner.findMany({
      where: { postId: { in: postIds } },
    });
    await devDb.homeBanner.createMany({
      data: homeBanners.map((b) => ({ ...b, labelOverrides: b.labelOverrides ?? Prisma.DbNull })),
      skipDuplicates,
    });
    log("HomeBanner", homeBanners.length);

    // 15. CuratedSection — prod schema drift(P2022) 로 스킵
    // const curatedSections = await prodDb.curatedSection.findMany({});
    // await devDb.curatedSection.createMany({ data: curatedSections, skipDuplicates });
    // log("CuratedSection", curatedSections.length);

    // 15. Policy
    const policies = await prodDb.policy.findMany({});
    await devDb.policy.createMany({ data: policies, skipDuplicates });
    log("Policy", policies.length);

    // 16. GuideVideo
    const guideVideos = await prodDb.guideVideo.findMany({});
    await devDb.guideVideo.createMany({ data: guideVideos, skipDuplicates });
    log("GuideVideo", guideVideos.length);

    // 17. ReCreeshot — userId를 TARGET_USER_ID로 치환 (prod 일반 사용자는 dev에 없음)
    //   - placeId: Place 복사 완료, 정상
    //   - linkedPostId: DB FK 없음 (schema @relation 미선언), nullable, 그대로 사용
    const reCreeshots = await prodDb.reCreeshot.findMany({});
    await devDb.reCreeshot.createMany({
      data: reCreeshots.map((r) => ({ ...r, userId: TARGET_USER_ID })),
      skipDuplicates,
    });
    log("ReCreeshot", reCreeshots.length);
    const reCreeshotIds = reCreeshots.map((r) => r.id);

    // 18. ReCreeshotTopic — reCreeshotId(위 복사본), topicId(Topic 복사 완료)
    const reCreeshotTopics = await prodDb.reCreeshotTopic.findMany({
      where: { reCreeshotId: { in: reCreeshotIds } },
    });
    await devDb.reCreeshotTopic.createMany({ data: reCreeshotTopics, skipDuplicates });
    log("ReCreeshotTopic", reCreeshotTopics.length);

    // 19. ReCreeshotTag — reCreeshotId(위 복사본), tagId(Tag 복사 완료)
    const reCreeshotTags = await prodDb.reCreeshotTag.findMany({
      where: { reCreeshotId: { in: reCreeshotIds } },
    });
    await devDb.reCreeshotTag.createMany({ data: reCreeshotTags, skipDuplicates });
    log("ReCreeshotTag", reCreeshotTags.length);

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
