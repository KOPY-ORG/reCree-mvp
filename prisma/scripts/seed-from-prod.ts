// prod → dev 콘텐츠 복사
//
// 실행:
//   SEED_TARGET_USER_ID="<dev 계정 UUID>" npx tsx prisma/scripts/seed-from-prod.ts
//   SEED_TARGET_USER_ID="<dev 계정 UUID>" SEED_YES=1 SEED_MODE=wipe \
//     npx tsx prisma/scripts/seed-from-prod.ts          # 비대화형
//
// 환경변수:
//   DATABASE_URL          target(dev). .env.local
//   PROD_RECON_URL        source(prod, 읽기 전용). .env.prod.local
//   PROD_DATABASE_URL     source 를 직접 주입할 때만 (있으면 PROD_RECON_URL 보다 우선)
//   SEED_TARGET_USER_ID   prod 작성자를 치환할 dev 계정 UUID. 기본값 없음 —
//                         비어 있으면 dev ADMIN 목록을 찍고 중단한다
//   SEED_YES=1 SEED_MODE=wipe|skip   비대화형 실행
//
// ⚠️ target 을 TRUNCATE 한다. target ref 가 prod ref 면 즉시 중단한다.
//    prod 쪽은 SELECT 만 한다.

// .env.local 로드 — tsx/ts-node는 자동으로 읽지 않음
try {
  process.loadEnvFile(".env.local");
} catch {}
// .env.prod.local — prod 읽기 전용 계정(PROD_RECON_URL). 없어도 무시한다
try {
  process.loadEnvFile(".env.prod.local");
} catch {}

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as readline from "readline";

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

/**
 * Supabase pooler 사용자명은 "<역할>.<프로젝트 ref>" 형태다.
 * 같은 DB 를 가리키는지 보려면 역할 접두를 떼고 ref 만 비교해야 한다 —
 * 전체 사용자명으로 비교하면 recon_readonly.X 와 postgres.X 가 다른 DB 로 보인다.
 */
function parseDbInfo(url: string): { host: string; user: string; ref: string } {
  try {
    const u = new URL(url);
    const user = decodeURIComponent(u.username);
    const dot = user.lastIndexOf(".");
    return { host: u.host, user, ref: dot >= 0 ? user.slice(dot + 1) : user };
  } catch {
    return { host: "(parse error)", user: "(parse error)", ref: "(parse error)" };
  }
}

/** prod 프로젝트 ref. NEXT_PUBLIC_SUPABASE_URL 에 들어가는 공개 값이다 */
const PROD_REF = "vwfojaivbltsdjttjhxw";

function createClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 막다른 길에서 고를 수 있는 값을 보여준다 — id 를 찾으러 DB 를 따로 뒤지지 않게 */
async function printDevAdmins(devDb: PrismaClient): Promise<void> {
  const admins = await devDb.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, nickname: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  if (admins.length === 0) {
    console.error("\n   dev User 에 ADMIN 계정이 없습니다.");
    return;
  }
  console.error("\n   dev ADMIN 계정:");
  for (const a of admins) {
    console.error(`     ${a.id}  ${a.nickname ?? a.email ?? "(이름 없음)"}`);
  }
}

/**
 * prod 작성자는 dev 에 없다. Post.authorId / ReCreeshot.userId / Course.authorId 를
 * 이 계정으로 치환한다. 기본값을 두지 않는다 — dev 를 갈아엎을 때마다 낡은 UUID 가
 * 남아 스크립트가 엉뚱한 곳에서 멈추기 때문이다.
 */
async function resolveTargetUserId(devDb: PrismaClient): Promise<string> {
  const id = process.env.SEED_TARGET_USER_ID?.trim();

  if (!id) {
    console.error("\n❌ SEED_TARGET_USER_ID 가 없습니다. prod 작성자를 치환할 dev 계정 UUID 를 지정하세요.");
    await printDevAdmins(devDb);
    console.error('\n   예: SEED_TARGET_USER_ID="<위 id 중 하나>" npx tsx prisma/scripts/seed-from-prod.ts');
    process.exit(1);
  }
  if (!UUID_RE.test(id)) {
    console.error(`\n❌ SEED_TARGET_USER_ID 가 UUID 형식이 아닙니다: ${id}`);
    await printDevAdmins(devDb);
    process.exit(1);
  }

  const user = await devDb.user.findUnique({
    where: { id },
    select: { id: true, nickname: true, email: true, role: true },
  });
  if (!user) {
    console.error(`\n❌ dev DB 에 그 계정이 없습니다: ${id}`);
    await printDevAdmins(devDb);
    process.exit(1);
  }

  console.log(`\n✅ 치환 계정: ${user.nickname ?? user.email} (${user.role}) ${id}`);
  return id;
}

// ─── 진행 추적 ────────────────────────────────────────────────────────────────

const TOTAL = 36;
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
      "Sticker", "PopularSearch",
      "CourseTopic", "CourseItem", "CourseDay", "Course",
      "EventPerkTranslation", "EventPerk",
      "EventBodyBlockTranslation", "EventBodyBlock",
      "EventPlace", "EventTranslation", "Event",
      "EventCollectionTranslation", "EventCollection",
      "ReCreeshotTag", "ReCreeshotTopic", "ReCreeshot",
      "PostTopic", "PostTag", "PostSource", "PostPlace", "PostImage", "Post",
      "PlacePlaceType", "PlaceImage", "Place", "PlaceType", "Area",
      "Tag", "TagGroupConfig", "Topic"
    CASCADE
  `;
  console.log("✅ 초기화 완료\n");
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const DEV_URL = process.env.DATABASE_URL;
  // prod 는 SELECT 만 한다 — 읽기 전용 계정으로 충분하다.
  // 명시 주입(PROD_DATABASE_URL)이 있으면 그것을, 없으면 .env.prod.local 의 PROD_RECON_URL 을 쓴다.
  const PROD_URL = process.env.PROD_DATABASE_URL ?? process.env.PROD_RECON_URL;
  const PROD_SOURCE = process.env.PROD_DATABASE_URL
    ? "PROD_DATABASE_URL (주입)"
    : "PROD_RECON_URL (.env.prod.local, 읽기 전용)";

  if (!DEV_URL || !PROD_URL) {
    console.error("❌ 필수 환경변수 누락:");
    if (!DEV_URL) console.error("   DATABASE_URL (.env.local)");
    if (!PROD_URL) console.error("   PROD_RECON_URL (.env.prod.local) 또는 PROD_DATABASE_URL (주입)");
    console.error("\n실행 방법:");
    console.error('    SEED_TARGET_USER_ID="<dev 계정 UUID>" npx tsx prisma/scripts/seed-from-prod.ts');
    console.error("  또는 (히스토리 회피용 leading space):");
    console.error('    PROD_DATABASE_URL="postgresql://..." SEED_TARGET_USER_ID="..." npx tsx prisma/scripts/seed-from-prod.ts');
    process.exit(1);
  }

  const dev = parseDbInfo(DEV_URL);
  const prod = parseDbInfo(PROD_URL);

  console.log("\n📋 연결 정보 확인");
  console.log(`  source (prod, 읽기)  host: ${prod.host}  ref: ${prod.ref}  role: ${prod.user.split(".")[0]}`);
  console.log(`  target (dev,  쓰기)  host: ${dev.host}  ref: ${dev.ref}  role: ${dev.user.split(".")[0]}`);
  console.log(`  prod URL 출처: ${PROD_SOURCE}`);

  // ── 안전장치 ──────────────────────────────────────────────────────────────
  // 이 스크립트는 target 을 TRUNCATE 한다. target 이 prod 면 절대 안 된다.
  if (dev.ref === PROD_REF) {
    console.error(`\n❌ target(dev) ref 가 prod ref(${PROD_REF}) 입니다. prod 를 지울 뻔했습니다. 중단합니다.`);
    process.exit(1);
  }
  if (prod.ref === dev.ref) {
    console.error("\n❌ source 와 target 의 ref 가 같습니다. 같은 DB 를 가리키고 있습니다. 중단합니다.");
    process.exit(1);
  }
  if (prod.ref !== PROD_REF) {
    console.log(`\n⚠️  source ref 가 알려진 prod ref(${PROD_REF}) 와 다릅니다. 대상을 확인하세요.`);
  }

  // 치환 대상 계정을 먼저 정한다 — 지우기 전에도, 묻기 전에도 막아야 한다
  const devDb = createClient(DEV_URL);
  const TARGET_USER_ID = await resolveTargetUserId(devDb);

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

  try {
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

    // 7. PlacePlaceType — placeId(Place 복사 완료), placeTypeId(PlaceType 복사 완료)
    //    sortOrder 0 이 대표 타입이다. Place.placeTypes(String[]) 와 같은 내용을 들고 있다
    const placePlaceTypes = await prodDb.placePlaceType.findMany({});
    await devDb.placePlaceType.createMany({ data: placePlaceTypes, skipDuplicates });
    log("PlacePlaceType", placePlaceTypes.length);

    // 8. PlaceImage
    const placeImages = await prodDb.placeImage.findMany({});
    await devDb.placeImage.createMany({ data: placeImages, skipDuplicates });
    log("PlaceImage", placeImages.length);

    // 9. Post — authorId를 TARGET_USER_ID로 치환 (prod 작성자는 dev에 없음)
    const posts = await prodDb.post.findMany({});
    await devDb.post.createMany({
      data: posts.map((p) => ({ ...p, authorId: TARGET_USER_ID })),
      skipDuplicates,
    });
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
    //   filterTagGroup / filterRegion 은 마이그레이션이 만든 적이 없다 — 스키마에만 있고
    //   prod 에는 수동 SQL 로 들어갔다. 히스토리로는 존재가 보장되지 않아 옛 주석의 P2022 가
    //   여기서 났다. 나머지 14칸은 마이그레이션이 보장하므로, 전체로 한 번 시도하고
    //   P2022 가 나면 보장된 14칸으로 물러난다.
    const CURATED_MIGRATED = {
      id: true, titleEn: true, subtitleEn: true, contentType: true, type: true,
      postIds: true, filterTopicId: true, filterTagId: true, maxCount: true,
      order: true, isActive: true, showOnHome: true, createdAt: true, updatedAt: true,
    } as const;
    let curatedSections;
    try {
      curatedSections = await prodDb.curatedSection.findMany({
        select: { ...CURATED_MIGRATED, filterTagGroup: true, filterRegion: true },
      });
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2022") throw e;
      console.log(
        `  ⚠️ CuratedSection: prod 에 ${String(e.meta?.column ?? "filterTagGroup/filterRegion")} 이(가) 없다 — 그 칸을 빼고 복사한다`
      );
      curatedSections = await prodDb.curatedSection.findMany({ select: CURATED_MIGRATED });
    }
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

    // 19. Sticker — FK 없음
    const stickers = await prodDb.sticker.findMany({});
    await devDb.sticker.createMany({ data: stickers, skipDuplicates });
    log("Sticker", stickers.length);

    // 20. PopularSearch — FK 없음
    const popularSearches = await prodDb.popularSearch.findMany({});
    await devDb.popularSearch.createMany({ data: popularSearches, skipDuplicates });
    log("PopularSearch", popularSearches.length);

    // 21. ReCreeshot — userId를 TARGET_USER_ID로 치환 (prod 일반 사용자는 dev에 없음)
    //   - placeId: Place 복사 완료, 정상
    //   - linkedPostId: DB FK 없음 (schema @relation 미선언), nullable, 그대로 사용
    const reCreeshots = await prodDb.reCreeshot.findMany({});
    await devDb.reCreeshot.createMany({
      data: reCreeshots.map((r) => ({ ...r, userId: TARGET_USER_ID })),
      skipDuplicates,
    });
    log("ReCreeshot", reCreeshots.length);
    const reCreeshotIds = reCreeshots.map((r) => r.id);

    // 22. ReCreeshotTopic — reCreeshotId(위 복사본), topicId(Topic 복사 완료)
    const reCreeshotTopics = await prodDb.reCreeshotTopic.findMany({
      where: { reCreeshotId: { in: reCreeshotIds } },
    });
    await devDb.reCreeshotTopic.createMany({ data: reCreeshotTopics, skipDuplicates });
    log("ReCreeshotTopic", reCreeshotTopics.length);

    // 23. ReCreeshotTag — reCreeshotId(위 복사본), tagId(Tag 복사 완료)
    const reCreeshotTags = await prodDb.reCreeshotTag.findMany({
      where: { reCreeshotId: { in: reCreeshotIds } },
    });
    await devDb.reCreeshotTag.createMany({ data: reCreeshotTags, skipDuplicates });
    log("ReCreeshotTag", reCreeshotTags.length);

    // ── 이벤트 9종 ────────────────────────────────────────────────────────────
    // EventCollection → Event → (번역·장소·본문·혜택) 순. 자식은 부모 id 로 걸러
    // 고아 행이 넘어오지 않게 한다.

    // 24. EventCollection — FK 없음
    const eventCollections = await prodDb.eventCollection.findMany({});
    await devDb.eventCollection.createMany({ data: eventCollections, skipDuplicates });
    log("EventCollection", eventCollections.length);
    const collectionIds = eventCollections.map((c) => c.id);

    // 25. EventCollectionTranslation — collectionId(위 복사본)
    const collectionTranslations = await prodDb.eventCollectionTranslation.findMany({
      where: { collectionId: { in: collectionIds } },
    });
    await devDb.eventCollectionTranslation.createMany({ data: collectionTranslations, skipDuplicates });
    log("EventCollectionTranslation", collectionTranslations.length);

    // 26. Event — eventCollectionId(위 복사본)
    const events = await prodDb.event.findMany({
      where: { eventCollectionId: { in: collectionIds } },
    });
    await devDb.event.createMany({ data: events, skipDuplicates });
    log("Event", events.length);
    const eventIds = events.map((e) => e.id);

    // 27. EventTranslation — eventId(위 복사본)
    const eventTranslations = await prodDb.eventTranslation.findMany({
      where: { eventId: { in: eventIds } },
    });
    await devDb.eventTranslation.createMany({ data: eventTranslations, skipDuplicates });
    log("EventTranslation", eventTranslations.length);

    // 28. EventPlace — eventId(위 복사본), placeId(Place 복사 완료)
    const eventPlaces = await prodDb.eventPlace.findMany({
      where: { eventId: { in: eventIds } },
    });
    await devDb.eventPlace.createMany({ data: eventPlaces, skipDuplicates });
    log("EventPlace", eventPlaces.length);

    // 29. EventBodyBlock — eventId(위 복사본)
    const bodyBlocks = await prodDb.eventBodyBlock.findMany({
      where: { eventId: { in: eventIds } },
    });
    await devDb.eventBodyBlock.createMany({ data: bodyBlocks, skipDuplicates });
    log("EventBodyBlock", bodyBlocks.length);
    const bodyBlockIds = bodyBlocks.map((b) => b.id);

    // 30. EventBodyBlockTranslation — blockId(위 복사본)
    const bodyBlockTranslations = await prodDb.eventBodyBlockTranslation.findMany({
      where: { blockId: { in: bodyBlockIds } },
    });
    await devDb.eventBodyBlockTranslation.createMany({ data: bodyBlockTranslations, skipDuplicates });
    log("EventBodyBlockTranslation", bodyBlockTranslations.length);

    // 31. EventPerk — eventId(위 복사본)
    const perks = await prodDb.eventPerk.findMany({
      where: { eventId: { in: eventIds } },
    });
    await devDb.eventPerk.createMany({ data: perks, skipDuplicates });
    log("EventPerk", perks.length);
    const perkIds = perks.map((p) => p.id);

    // 32. EventPerkTranslation — perkId(위 복사본)
    const perkTranslations = await prodDb.eventPerkTranslation.findMany({
      where: { perkId: { in: perkIds } },
    });
    await devDb.eventPerkTranslation.createMany({ data: perkTranslations, skipDuplicates });
    log("EventPerkTranslation", perkTranslations.length);

    // ── 여정 4종 ──────────────────────────────────────────────────────────────

    // 33. Course — authorId 를 TARGET_USER_ID 로 치환 (prod 작성자는 dev 에 없음)
    //   copiedFromId 는 DB FK 가 없다 (schema @relation 미선언) — 그대로 둔다
    const courses = await prodDb.course.findMany({});
    await devDb.course.createMany({
      data: courses.map((c) => ({ ...c, authorId: TARGET_USER_ID })),
      skipDuplicates,
    });
    log("Course", courses.length);
    const courseIds = courses.map((c) => c.id);

    // 34. CourseDay — courseId(위 복사본)
    const courseDays = await prodDb.courseDay.findMany({
      where: { courseId: { in: courseIds } },
    });
    await devDb.courseDay.createMany({ data: courseDays, skipDuplicates });
    log("CourseDay", courseDays.length);
    const courseDayIds = courseDays.map((d) => d.id);

    // 35. CourseItem — dayId(위 복사본), placeId(Place 복사 완료, nullable)
    const courseItems = await prodDb.courseItem.findMany({
      where: { dayId: { in: courseDayIds } },
    });
    await devDb.courseItem.createMany({ data: courseItems, skipDuplicates });
    log("CourseItem", courseItems.length);

    // 36. CourseTopic — courseId(위 복사본), topicId(Topic 복사 완료)
    const courseTopics = await prodDb.courseTopic.findMany({
      where: { courseId: { in: courseIds } },
    });
    await devDb.courseTopic.createMany({ data: courseTopics, skipDuplicates });
    log("CourseTopic", courseTopics.length);

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
