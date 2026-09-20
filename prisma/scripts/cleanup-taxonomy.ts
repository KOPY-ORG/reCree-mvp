// 택소노미 정리 — 태그 그룹 재편 · 태그 삭제 · 장소 타입 정리
//
// 실행:
//   dry-run (기본, 쓰지 않는다):
//     NODE_PATH="$PWD/node_modules" npx tsx prisma/scripts/cleanup-taxonomy.ts
//   실제 실행:
//     CLEANUP_YES=1 NODE_PATH="$PWD/node_modules" npx tsx prisma/scripts/cleanup-taxonomy.ts --execute
//     → 그 뒤 콘솔에서 "yes" 를 입력해야 시작한다
//
// ⚠️ 대상은 .env.local 의 DATABASE_URL — 기본이 dev 다. 시작할 때 host 와 Supabase ref 를 찍는다.
//    prod 에 돌릴 때는 그 실행에만 쓰기 권한이 있는 URL 을 주입한다.
//
// migrate-taxonomy.ts 는 ts-node 로 돌지만 이 스크립트는 tsx 로 돈다 —
// 장소 타입 쓰기를 @/lib/place-type-write 에서 가져오는데 ts-node 는 "@/" 별칭을 풀지 못한다.
//
// ── 무엇을 하고 무엇을 하지 않는가 ────────────────────────────────────────────
//
// 한다 (사람이 준 12항목 그대로):
//   1  MEDIA 그룹의 화면 이름(TagGroupConfig.nameEn)을 SEEN IN 으로
//   2  VIBE 그룹 신설 — 색은 SPOT 그룹에서 그대로 복사
//   3  fan-spot → MEDIA / photo-spot · local · vintageretro → VIBE
//   4  촬영지 포스트에 MEDIA 태그 보강 (drama · film · mv)
//   5  팬 방문 포스트에 fan-spot 보강 (지정 slug + 지정 장소에 붙은 발행 포스트 전부)
//   6  태그 삭제 — filming-location 외 5종 + FOOD · EXPERIENCE 그룹 전부
//   7  빈 그룹 삭제 — FOOD · EXPERIENCE · SPOT
//   8  CuratedSection 의 filterTagGroup FOOD → null
//   9  PlaceType "Idol Dorm" 신설
//   10 숙소 3곳의 장소 타입 교체
//   11 School 의 카테고리 → OTHER
//   12 Fan Landmark 비활성화 + 기본값 해제 (쓰는 장소 0 확인 후)
//
// 하지 않는다:
//   앱 코드 변경 · Topic 손대기 · ARIRANG 그룹 손대기 · 태그 sortOrder 재번호 매기기
//
//   찾지 못한 대상이 하나라도 있으면 아무것도 쓰지 않고 목록만 보고한다.
//   이미 끝난 항목은 건너뛴다 — 몇 번을 다시 돌려도 같은 자리에 선다.

try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local 이 없어도 무시 — CI 에서는 환경변수가 직접 주입된다
}

import { PrismaClient, PlaceCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const EXECUTE = process.argv.includes("--execute");
const SNAPSHOT_DIR = path.join("prisma", "scripts", "backups");
const TX_TIMEOUT_MS = 120_000;

/** 1. 화면 이름만 바꾼다. group 키(MEDIA)는 코드가 K_MEDIA_GROUP 으로 들고 있어 건드리지 않는다 */
const GROUP_RENAME = { group: "MEDIA", nameEn: "SEEN IN" } as const;

/** 2. 신설 그룹. 색·그라데이션은 COLOR_SOURCE_GROUP 행에서 복사한다 */
const NEW_GROUP = "VIBE";
const COLOR_SOURCE_GROUP = "SPOT";

/** 3. 태그 이사 — slug 로 찾는다 (dev·prod 공통) */
const TAG_MOVES: { slug: string; to: string }[] = [
  { slug: "fan-spot", to: "MEDIA" },
  { slug: "photo-spot", to: NEW_GROUP },
  { slug: "local", to: NEW_GROUP },
  { slug: "vintageretro", to: NEW_GROUP },
];

/** 4·5. 포스트 태그 보강 — 이미 있으면 건너뛴다. isVisible=true, displayOrder 는 맨 뒤 */
const POST_TAG_ADDS: { postSlug: string; tagSlug: string }[] = [
  { postSlug: "korea-spot-seoul-naksan-park-fortress-wall-viewpoint-jongno-recree", tagSlug: "drama" },
  { postSlug: "korea-spot-seoul-namsan-tower-landmark-yongsan-recree", tagSlug: "drama" },
  { postSlug: "korea-spot-seoul-national-museum-landmark-yongsan-recree", tagSlug: "film" },
  { postSlug: "kpop-bts-run-mv-filming-location-hangang-seobinggo-yongsan-recree", tagSlug: "mv" },
  { postSlug: "kpop-blackpink-yg-official-goods-visited-spot-the-samee-mapo-recree", tagSlug: "fan-spot" },
  { postSlug: "kpop-bts-second-dorm-blue-house-visited-spot-nonhyeon-gangnam-recree", tagSlug: "fan-spot" },
  { postSlug: "kpop-sm-artists-kwangya-official-goods-visited-spot-seongsu-recree", tagSlug: "fan-spot" },
];

/**
 * 5. 이 장소들에 붙은 발행 포스트 전부에 fan-spot 을 붙인다.
 * slug 를 적지 않고 장소 id 로 두는 이유는 포스트가 늘어도 같은 규칙이 돌기 때문이다.
 * (용문중학교는 성북구 것만이다 — 양평군에 같은 이름의 다른 장소가 있다)
 */
const FAN_SPOT_PLACE_IDS = [
  "98fe25cb-8aa1-4f7e-b717-254560365cb6", // BTS 첫 숙소
  "22dff027-3ec9-4ae3-9a16-cf84b3af5547", // 숙소-연습실 루트
  "c4a1af7d-9648-4575-9899-70315cbfe899", // Yongmoon Middle School (성북구)
];
const FAN_SPOT_TAG_SLUG = "fan-spot";

/** 6. 개별 삭제 태그 (SPOT 그룹의 장소형) */
const DELETE_TAG_SLUGS = [
  "filming-location",
  "nature",
  "attraction",
  "heritage",
  "landmark",
  "shopping",
];
/** 6. 그룹째 삭제되는 태그의 그룹 */
const DELETE_TAG_GROUPS = ["FOOD", "EXPERIENCE"];
/** 7. 태그가 0개가 된 뒤 지우는 그룹 */
const DELETE_GROUPS = ["FOOD", "EXPERIENCE", "SPOT"];

/** 8. filterTagGroup 을 비울 그룹 키 */
const CLEAR_FILTER_TAG_GROUP = "FOOD";

/** 9. 신설 장소 타입 — 그 카테고리 맨 뒤에 붙는다 */
const NEW_PLACE_TYPE = {
  name: "Idol Dorm",
  nameKo: "아이돌 숙소",
  category: "ENTERTAINMENT" as PlaceCategory,
  isDefault: false,
};

/** 10. 장소 타입 교체 — 배열 순서가 곧 sortOrder 이고 0 번이 대표다 */
const PLACE_TYPE_ASSIGNS: { placeId: string; types: string[] }[] = [
  { placeId: "98fe25cb-8aa1-4f7e-b717-254560365cb6", types: ["Idol Dorm"] },
  { placeId: "c8827bde-78bb-43d1-9ec8-453b22f2d427", types: ["Idol Dorm"] },
  { placeId: "22dff027-3ec9-4ae3-9a16-cf84b3af5547", types: ["Street"] },
];

/** 11. 카테고리 이사. sortOrder 도 새 카테고리 맨 뒤로 따라간다 (어드민 폼과 같은 규칙) */
const PLACE_TYPE_CATEGORY_MOVE = { name: "School", to: "OTHER" as PlaceCategory };

/**
 * 12. 비활성화 — 쓰는 장소가 0 이 아니면 중단한다.
 * isDefault 도 함께 끈다. 비활성 행이 기본값을 쥐고 있으면 그 카테고리에 새 기본값을
 * 세울 수 없다 — 어드민이 "이미 기본값이 있다" 며 막는다.
 */
const DEACTIVATE_PLACE_TYPE = "Fan Landmark";

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function parseDbTarget(url: string): { host: string; ref: string } {
  try {
    const u = new URL(url);
    return { host: u.host, ref: decodeURIComponent(u.username).replace(/^[^.]*\./, "") };
  } catch {
    return { host: "(parse error)", ref: "(parse error)" };
  }
}

function ask(rl: readline.Interface, q: string): Promise<string> {
  return new Promise((resolve) => rl.question(q, resolve));
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function confirm(): Promise<void> {
  if (process.env.CLEANUP_YES !== "1") {
    throw new Error("--execute 에는 CLEANUP_YES=1 이 함께 필요하다");
  }
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await ask(
    rl,
    '\n⚠️  태그를 지우고 그룹과 장소 타입을 재편한다. 계속하려면 "yes" 를 입력: '
  );
  rl.close();
  if (answer.trim() !== "yes") throw new Error(`취소됐다 (입력: "${answer.trim()}")`);
}

// ─── 본체 ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 없음 (.env.local)");

  const target = parseDbTarget(process.env.DATABASE_URL);
  console.log(`대상 DB host: ${target.host}`);
  console.log(`대상 Supabase 프로젝트: ${target.ref}`);
  console.log(EXECUTE ? "── EXECUTE — 실제로 쓴다 ──\n" : "── DRY RUN — 쓰지 않는다 ──\n");

  // 장소 타입 쓰기는 어드민과 같은 경로를 쓴다. 정적 import 로 두면 ESM 이 이 파일의
  // loadEnvFile 보다 먼저 @/lib/prisma 를 평가해 DATABASE_URL 없이 클라이언트를 만든다.
  const { writePlacePlaceTypes } = await import("@/lib/place-type-write");

  const missing: string[] = [];

  // ── 읽기 ───────────────────────────────────────────────────────────────────
  const groups = await prisma.tagGroupConfig.findMany();
  const groupByKey = new Map(groups.map((g) => [g.group, g]));
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { postTags: true, reCreeshotTags: true, curatedSections: true } } },
  });
  const tagBySlug = new Map(tags.map((t) => [t.slug, t]));
  const placeTypes = await prisma.placeType.findMany({
    include: { _count: { select: { placePlaceTypes: true } } },
  });
  const placeTypeByName = new Map(placeTypes.map((t) => [t.name, t]));

  // ── 1. MEDIA 화면 이름 ─────────────────────────────────────────────────────
  const mediaGroup = groupByKey.get(GROUP_RENAME.group);
  if (!mediaGroup) missing.push(`TagGroupConfig "${GROUP_RENAME.group}"`);
  const renameNeeded = mediaGroup != null && mediaGroup.nameEn !== GROUP_RENAME.nameEn;

  console.log(`── 1. 태그 그룹 화면 이름 ──`);
  console.log(
    mediaGroup
      ? `   ${GROUP_RENAME.group}.nameEn "${mediaGroup.nameEn}" → "${GROUP_RENAME.nameEn}"${renameNeeded ? "" : "  (이미 같다 — 건너뜀)"}`
      : `   ✖ ${GROUP_RENAME.group} 그룹을 찾지 못했다`
  );
  console.log(`   필터 시트가 그리는 칸이 nameEn 이다 (DiscoverFilterSheet: group.nameEn || group.group)\n`);

  // ── 2. VIBE 그룹 ───────────────────────────────────────────────────────────
  const existingNewGroup = groupByKey.get(NEW_GROUP);
  const colorSource = groupByKey.get(COLOR_SOURCE_GROUP);
  // 색 원본은 새 그룹이 아직 없을 때만 필요하다 — 재실행 때는 SPOT 이 이미 지워져 있다
  if (!existingNewGroup && !colorSource) {
    missing.push(`TagGroupConfig "${COLOR_SOURCE_GROUP}" (${NEW_GROUP} 색 원본)`);
  }
  const newGroupData = colorSource
    ? {
        group: NEW_GROUP,
        nameEn: NEW_GROUP,
        colorHex: colorSource.colorHex,
        colorHex2: colorSource.colorHex2,
        gradientDir: colorSource.gradientDir,
        gradientStop: colorSource.gradientStop,
        textColorHex: colorSource.textColorHex,
        isVisible: true,
        sortOrder: colorSource.sortOrder,
      }
    : null;

  console.log(`── 2. ${NEW_GROUP} 그룹 신설 ──`);
  if (existingNewGroup) {
    console.log(`   이미 있다 — 건너뜀 (nameEn="${existingNewGroup.nameEn}" color=${existingNewGroup.colorHex}/${existingNewGroup.colorHex2 ?? "-"})`);
  } else if (newGroupData) {
    console.log(
      `   신설  nameEn="${newGroupData.nameEn}" color=${newGroupData.colorHex}/${newGroupData.colorHex2 ?? "-"} ` +
        `dir="${newGroupData.gradientDir}" stop=${newGroupData.gradientStop} text=${newGroupData.textColorHex} ` +
        `isVisible=${newGroupData.isVisible} sortOrder=${newGroupData.sortOrder}`
    );
    console.log(`   ↳ 색·정렬은 ${COLOR_SOURCE_GROUP} 그룹에서 그대로 복사한다. displayLabel 은 비워 둔다 (VIBE 는 카드에 안 나온다)`);
  } else {
    console.log(`   ✖ ${COLOR_SOURCE_GROUP} 그룹이 없어 색을 가져올 수 없다`);
  }
  console.log();

  // ── 3. 태그 이사 ───────────────────────────────────────────────────────────
  const moves: { slug: string; from: string; to: string; done: boolean }[] = [];
  for (const m of TAG_MOVES) {
    const t = tagBySlug.get(m.slug);
    if (!t) {
      missing.push(`Tag "${m.slug}" (${m.to} 로 옮길 대상)`);
      continue;
    }
    moves.push({ slug: m.slug, from: t.group, to: m.to, done: t.group === m.to });
  }
  console.log(`── 3. 태그 그룹 이사 ──`);
  for (const m of moves) {
    console.log(`   ${m.slug.padEnd(14)} ${m.from} → ${m.to}${m.done ? "  (이미 끝났다 — 건너뜀)" : ""}`);
  }
  console.log(`   ↳ 네 태그 모두 자기 색이 없어 그룹 색을 상속한다.`);
  console.log(`      ${NEW_GROUP} 는 ${COLOR_SOURCE_GROUP} 색을 그대로 받으니 photo-spot·local·vintageretro 의 색은 그대로고,`);
  console.log(`      fan-spot 만 ${COLOR_SOURCE_GROUP} 노랑에서 MEDIA 연두로 바뀐다`);
  console.log(`   ↳ sortOrder 는 건드리지 않는다 — 옮긴 그룹 안에서 상대 순서만 유지된다\n`);

  // ── 4·5. 포스트 태그 보강 ──────────────────────────────────────────────────
  //
  // 지정 slug + 지정 장소에 붙은 발행 포스트를 합친다. 같은 (포스트, 태그) 가 두 경로로
  // 들어와도 한 번만 남는다.
  const fanSpotTag = tagBySlug.get(FAN_SPOT_TAG_SLUG);
  const placePosts = fanSpotTag
    ? await prisma.postPlace.findMany({
        where: { placeId: { in: FAN_SPOT_PLACE_IDS }, post: { status: "PUBLISHED" } },
        select: { placeId: true, post: { select: { slug: true } } },
      })
    : [];

  const foundPlaceIds = new Set(placePosts.map((r) => r.placeId));
  const knownPlaces = await prisma.place.findMany({
    where: { id: { in: [...FAN_SPOT_PLACE_IDS, ...PLACE_TYPE_ASSIGNS.map((a) => a.placeId)] } },
    select: { id: true, nameKo: true, nameEn: true, placeTypes: true },
  });
  const placeById = new Map(knownPlaces.map((p) => [p.id, p]));
  for (const id of FAN_SPOT_PLACE_IDS) {
    if (!placeById.has(id)) missing.push(`Place ${id} (fan-spot 보강 대상 장소)`);
  }

  const wanted = new Map<string, Set<string>>(); // postSlug → tagSlug[]
  for (const a of POST_TAG_ADDS) {
    if (!tagBySlug.has(a.tagSlug)) missing.push(`Tag "${a.tagSlug}" (보강 대상)`);
    const set = wanted.get(a.postSlug) ?? new Set<string>();
    set.add(a.tagSlug);
    wanted.set(a.postSlug, set);
  }
  for (const r of placePosts) {
    const set = wanted.get(r.post.slug) ?? new Set<string>();
    set.add(FAN_SPOT_TAG_SLUG);
    wanted.set(r.post.slug, set);
  }

  const posts = await prisma.post.findMany({
    where: { slug: { in: [...wanted.keys()] } },
    select: {
      id: true,
      slug: true,
      status: true,
      postTags: { select: { tagId: true, displayOrder: true } },
    },
  });
  const postBySlug = new Map(posts.map((p) => [p.slug, p]));
  for (const slug of wanted.keys()) {
    if (!postBySlug.has(slug)) missing.push(`Post "${slug}" (태그 보강 대상)`);
  }

  type AddRow = { postSlug: string; tagSlug: string; postId: string; tagId: string; displayOrder: number; via: string };
  const adds: AddRow[] = [];
  const addsSkipped: { postSlug: string; tagSlug: string }[] = [];
  for (const [postSlug, tagSlugs] of wanted) {
    const post = postBySlug.get(postSlug);
    if (!post) continue;
    // 맨 뒤 = 지금 붙어 있는 것들의 최대 displayOrder + 1. 같은 포스트에 둘을 붙이면 뒤로 쌓인다
    let next = post.postTags.reduce((max, t) => Math.max(max, t.displayOrder), -1) + 1;
    for (const tagSlug of [...tagSlugs].sort()) {
      const tag = tagBySlug.get(tagSlug);
      if (!tag) continue;
      if (post.postTags.some((t) => t.tagId === tag.id)) {
        addsSkipped.push({ postSlug, tagSlug });
        continue;
      }
      const viaSlug = POST_TAG_ADDS.some((a) => a.postSlug === postSlug && a.tagSlug === tagSlug);
      const viaPlace = placePosts.find((r) => r.post.slug === postSlug);
      adds.push({
        postSlug,
        tagSlug,
        postId: post.id,
        tagId: tag.id,
        displayOrder: next++,
        via: viaSlug ? "지정 slug" : `장소 ${placeById.get(viaPlace?.placeId ?? "")?.nameKo ?? viaPlace?.placeId ?? "?"}`,
      });
    }
  }

  console.log(`── 4·5. 포스트 태그 보강 ──`);
  console.log(`   붙일 것 ${adds.length}건 · 이미 있어 건너뜀 ${addsSkipped.length}건`);
  for (const a of adds) {
    const st = postBySlug.get(a.postSlug)?.status;
    console.log(`     + ${a.tagSlug.padEnd(9)} → [${st}] ${a.postSlug}  (displayOrder ${a.displayOrder}, isVisible true · ${a.via})`);
  }
  for (const a of addsSkipped) console.log(`     = ${a.tagSlug.padEnd(9)} → ${a.postSlug}  (이미 있다)`);
  for (const id of FAN_SPOT_PLACE_IDS) {
    const p = placeById.get(id);
    const n = placePosts.filter((r) => r.placeId === id).length;
    console.log(`     · 장소 ${p?.nameKo ?? id} → 발행 포스트 ${n}건${foundPlaceIds.has(id) ? "" : " (없음)"}`);
  }
  console.log();

  // ── 6. 태그 삭제 ───────────────────────────────────────────────────────────
  const deleteTargets = tags.filter(
    (t) => DELETE_TAG_SLUGS.includes(t.slug) || DELETE_TAG_GROUPS.includes(t.group)
  );
  const alreadyGone = DELETE_TAG_SLUGS.filter((s) => !tagBySlug.has(s));
  const sectionRefs = deleteTargets.filter((t) => t._count.curatedSections > 0);

  console.log(`── 6. 태그 삭제 ──`);
  console.log(`   대상 ${deleteTargets.length}종${alreadyGone.length ? ` · 이미 없어 건너뜀 ${alreadyGone.length}종 (${alreadyGone.join(", ")})` : ""}`);
  let postLinks = 0;
  let shotLinks = 0;
  for (const t of [...deleteTargets].sort((a, b) => a.group.localeCompare(b.group) || a.sortOrder - b.sortOrder)) {
    postLinks += t._count.postTags;
    shotLinks += t._count.reCreeshotTags;
    console.log(
      `     ${t.group.padEnd(11)} ${t.slug.padEnd(18)} ${t.name.padEnd(20)} PostTag ${String(t._count.postTags).padStart(3)} · ReCreeshotTag ${t._count.reCreeshotTags}` +
        (t._count.curatedSections ? ` · ⚠️ CuratedSection ${t._count.curatedSections}` : "")
    );
  }
  console.log(`   지워질 연결: PostTag ${postLinks}건 · ReCreeshotTag ${shotLinks}건`);
  if (sectionRefs.length) {
    console.log(`   ✖ CuratedSection.filterTagId 가 가리키는 태그가 있다 — 사람이 먼저 정리해야 한다:`);
    for (const t of sectionRefs) console.log(`       ${t.slug}`);
  }
  console.log();

  // ── 7. 빈 그룹 삭제 ────────────────────────────────────────────────────────
  //
  // 이 실행이 끝난 뒤의 상태로 센다 — 삭제 대상을 빼고 이사한 태그를 옮겨 놓은 값이다
  const deleteTagIds = new Set(deleteTargets.map((t) => t.id));
  const moveTo = new Map(moves.map((m) => [m.slug, m.to]));
  const projectedGroupOf = (t: { slug: string; group: string }) => moveTo.get(t.slug) ?? t.group;
  const remainingByGroup = new Map<string, string[]>();
  for (const t of tags) {
    if (deleteTagIds.has(t.id)) continue;
    const g = projectedGroupOf(t);
    remainingByGroup.set(g, [...(remainingByGroup.get(g) ?? []), t.slug]);
  }

  console.log(`── 7. 빈 그룹 삭제 ──`);
  const groupsBlocked: string[] = [];
  for (const g of DELETE_GROUPS) {
    const left = remainingByGroup.get(g) ?? [];
    const exists = groupByKey.has(g);
    if (!exists) {
      console.log(`     ${g.padEnd(11)} 이미 없다 — 건너뜀`);
    } else if (left.length === 0) {
      console.log(`     ${g.padEnd(11)} 정리 후 태그 0개 → 삭제`);
    } else {
      groupsBlocked.push(g);
      console.log(`     ${g.padEnd(11)} ✖ 정리 후에도 태그 ${left.length}개가 남는다: ${left.join(", ")}`);
    }
  }
  console.log(`   남는 그룹: ${[...groupByKey.keys()].filter((g) => !DELETE_GROUPS.includes(g)).join(", ")}, ${NEW_GROUP}\n`);

  // ── 8. CuratedSection ──────────────────────────────────────────────────────
  const sections = await prisma.curatedSection.findMany({
    where: { filterTagGroup: CLEAR_FILTER_TAG_GROUP },
    select: { id: true, titleEn: true, isActive: true, showOnHome: true },
  });
  const strayGroupRefs = await prisma.curatedSection.findMany({
    where: { filterTagGroup: { in: DELETE_GROUPS.filter((g) => g !== CLEAR_FILTER_TAG_GROUP) } },
    select: { id: true, titleEn: true, filterTagGroup: true },
  });

  console.log(`── 8. CuratedSection.filterTagGroup ──`);
  console.log(`   ${CLEAR_FILTER_TAG_GROUP} → null : ${sections.length}건${sections.length ? "" : " (이미 없다 — 건너뜀)"}`);
  for (const s of sections) console.log(`     "${s.titleEn}" (isActive=${s.isActive}, showOnHome=${s.showOnHome})`);
  if (strayGroupRefs.length) {
    console.log(`   ✖ 지시에 없던 그룹을 가리키는 섹션이 있다 — 중단한다:`);
    for (const s of strayGroupRefs) console.log(`     "${s.titleEn}" filterTagGroup=${s.filterTagGroup}`);
  }
  console.log();

  // ── 9~12. 장소 타입 ────────────────────────────────────────────────────────
  const existingNewType = placeTypeByName.get(NEW_PLACE_TYPE.name);
  const catMax = placeTypes
    .filter((t) => t.category === NEW_PLACE_TYPE.category)
    .reduce((max, t) => Math.max(max, t.sortOrder), -1);
  const newTypeSortOrder = catMax + 1;

  console.log(`── 9. PlaceType 신설 ──`);
  if (existingNewType) {
    console.log(`   "${NEW_PLACE_TYPE.name}" 이미 있다 — 건너뜀 (${existingNewType.category}, sortOrder=${existingNewType.sortOrder}, 쓰는 장소 ${existingNewType._count.placePlaceTypes}곳)`);
  } else {
    console.log(`   "${NEW_PLACE_TYPE.name}" / ${NEW_PLACE_TYPE.nameKo}  ${NEW_PLACE_TYPE.category} · isDefault=${NEW_PLACE_TYPE.isDefault} · sortOrder=${newTypeSortOrder} (카테고리 맨 뒤)`);
    console.log(`   ↳ nameKo "${NEW_PLACE_TYPE.nameKo}" 는 제안이다 — 바꾸려면 이 상수만 고치면 된다`);
  }
  console.log();

  console.log(`── 10. 장소 타입 교체 ──`);
  const assignPlan: { placeId: string; label: string; before: string[]; after: string[] }[] = [];
  for (const a of PLACE_TYPE_ASSIGNS) {
    const p = placeById.get(a.placeId);
    if (!p) {
      missing.push(`Place ${a.placeId} (장소 타입 교체 대상)`);
      continue;
    }
    for (const name of a.types) {
      if (!placeTypeByName.has(name) && name !== NEW_PLACE_TYPE.name) {
        missing.push(`PlaceType "${name}" (${p.nameKo} 에 붙일 타입)`);
      }
    }
    assignPlan.push({ placeId: a.placeId, label: p.nameEn ?? p.nameKo, before: p.placeTypes, after: a.types });
    const same = p.placeTypes.length === a.types.length && p.placeTypes.every((v, i) => v === a.types[i]);
    console.log(`     ${p.nameKo}\n       [${p.placeTypes.join(", ") || "없음"}] → [${a.types.join(", ")}]${same ? "  (이미 같다)" : ""}`);
  }
  console.log(`   PlacePlaceType 과 Place.placeTypes 를 함께 쓴다 (place-type-write.writePlacePlaceTypes)\n`);

  const schoolType = placeTypeByName.get(PLACE_TYPE_CATEGORY_MOVE.name);
  if (!schoolType) missing.push(`PlaceType "${PLACE_TYPE_CATEGORY_MOVE.name}"`);
  const otherMax = placeTypes
    .filter((t) => t.category === PLACE_TYPE_CATEGORY_MOVE.to)
    .reduce((max, t) => Math.max(max, t.sortOrder), -1);
  const schoolSortOrder = otherMax + 1;

  console.log(`── 11. PlaceType 카테고리 이사 ──`);
  if (schoolType) {
    const done = schoolType.category === PLACE_TYPE_CATEGORY_MOVE.to;
    console.log(
      `     ${schoolType.name} (${schoolType.nameKo}) ${schoolType.category} → ${PLACE_TYPE_CATEGORY_MOVE.to}` +
        (done ? "  (이미 끝났다 — 건너뜀)" : ` · sortOrder ${schoolType.sortOrder} → ${schoolSortOrder}`)
    );
    console.log(`     쓰는 장소 ${schoolType._count.placePlaceTypes}곳 (연결은 그대로다 — 카테고리만 바뀐다)`);
  }
  console.log();

  const fanLandmark = placeTypeByName.get(DEACTIVATE_PLACE_TYPE);
  if (!fanLandmark) missing.push(`PlaceType "${DEACTIVATE_PLACE_TYPE}"`);
  // 10 번이 끝난 뒤의 사용량을 센다 — 지금 쓰는 3곳이 모두 10 번의 교체 대상이면 0 이 된다
  const reassigned = new Set(PLACE_TYPE_ASSIGNS.map((a) => a.placeId));
  const flLinks = fanLandmark
    ? await prisma.placePlaceType.findMany({
        where: { placeTypeId: fanLandmark.id },
        select: { placeId: true, place: { select: { nameKo: true } } },
      })
    : [];
  const flLeft = flLinks.filter((l) => !reassigned.has(l.placeId));
  const flColumnLeft = (
    await prisma.place.findMany({ where: { placeTypes: { has: DEACTIVATE_PLACE_TYPE } }, select: { id: true, nameKo: true } })
  ).filter((p) => !reassigned.has(p.id));

  console.log(`── 12. PlaceType 비활성화 ──`);
  if (fanLandmark) {
    const done = !fanLandmark.isActive && !fanLandmark.isDefault;
    console.log(
      `     ${fanLandmark.name} (${fanLandmark.nameKo}) isActive ${fanLandmark.isActive} → false · ` +
        `isDefault ${fanLandmark.isDefault} → false${done ? "  (이미 끝났다 — 건너뜀)" : ""}`
    );
    console.log(`     지금 쓰는 장소 ${flLinks.length}곳 → 10번 교체 뒤 ${flLeft.length}곳`);
    for (const l of flLinks) console.log(`       ${reassigned.has(l.placeId) ? "교체됨" : "⚠️ 남음"}  ${l.place.nameKo}`);
    if (flLeft.length || flColumnLeft.length) {
      console.log(`     ✖ 쓰는 장소가 남아 비활성화하지 않는다 (PlacePlaceType ${flLeft.length}곳 · Place.placeTypes ${flColumnLeft.length}곳)`);
    }
    if (fanLandmark.isDefault) {
      console.log(`     ⓘ ${fanLandmark.category} 카테고리에 기본값이 없는 상태가 된다 — 어드민에서 새 기본값을 지정할 수 있다`);
    }
  }
  console.log();

  // ── 정리 결과 미리보기 ─────────────────────────────────────────────────────
  //
  // 삭제·보강이 끝난 발행 포스트가 어떤 상태가 되는지. 화면 규칙(post-labels)의
  // "팬 맥락" 은 MEDIA 그룹 + fan-spot 인데, 이 정리가 끝나면 fan-spot 도 MEDIA 다
  const published = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, isShop: true, postTags: { select: { isVisible: true, tag: { select: { id: true, slug: true, group: true } } } } },
  });
  const emptied: string[] = [];
  const noSeenIn: string[] = [];
  const addedByPost = new Map<string, string[]>();
  for (const a of adds) addedByPost.set(a.postSlug, [...(addedByPost.get(a.postSlug) ?? []), a.tagSlug]);
  for (const p of published) {
    const kept = p.postTags.filter((pt) => !deleteTagIds.has(pt.tag.id));
    const added = addedByPost.get(p.slug) ?? [];
    const label = p.isShop ? `${p.slug}  (shop)` : p.slug;
    if (kept.length + added.length === 0) emptied.push(label);
    const seenIn =
      kept.some((pt) => pt.isVisible && projectedGroupOf(pt.tag) === "MEDIA") ||
      added.some((s) => (moveTo.get(s) ?? tagBySlug.get(s)?.group) === "MEDIA");
    if (!seenIn) noSeenIn.push(label);
  }
  console.log(`── 정리 뒤 발행 포스트 ${published.length}건 ──`);
  console.log(`   태그가 0개가 되는 포스트: ${emptied.length}건`);
  for (const s of emptied) console.log(`     ${s}`);
  console.log(`   SEEN IN(MEDIA) 태그가 없는 포스트: ${noSeenIn.length}건 — 다음 보강 대상이다`);
  for (const s of noSeenIn) console.log(`     ${s}`);
  console.log(`   (shop 포스트는 카드에서 다른 규칙을 쓴다 — selectShopLabels)`);
  console.log();

  // ── 중단 조건 ──────────────────────────────────────────────────────────────
  const blockers = [
    ...missing.map((m) => `찾지 못함 — ${m}`),
    ...groupsBlocked.map((g) => `그룹 ${g} 에 태그가 남는다`),
    ...sectionRefs.map((t) => `CuratedSection 이 삭제 대상 태그 "${t.slug}" 를 가리킨다`),
    ...strayGroupRefs.map((s) => `CuratedSection "${s.titleEn}" 가 삭제 대상 그룹 ${s.filterTagGroup} 를 가리킨다`),
    ...(flLeft.length || flColumnLeft.length ? [`${DEACTIVATE_PLACE_TYPE} 를 쓰는 장소가 남는다`] : []),
  ];
  if (blockers.length) {
    console.log(`✖ 중단 — 아무것도 쓰지 않는다 (${blockers.length}건)`);
    for (const b of blockers) console.log(`   ${b}`);
    throw new Error("대상을 모두 찾은 뒤 다시 실행한다");
  }

  if (!EXECUTE) {
    console.log(`── DRY RUN 끝 — 아무것도 쓰지 않았다 ──`);
    return;
  }

  // ── 실행 ───────────────────────────────────────────────────────────────────
  await confirm();

  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const snapshotPath = path.join(
    SNAPSHOT_DIR,
    `taxonomy-cleanup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  const [snapTags, snapPlaceTypes, snapPostTags, snapShotTags, snapSections, snapPlacePlaceTypes, snapPlaces] =
    await Promise.all([
      prisma.tag.findMany(),
      prisma.placeType.findMany(),
      prisma.postTag.findMany(),
      prisma.reCreeshotTag.findMany(),
      prisma.curatedSection.findMany(),
      prisma.placePlaceType.findMany(),
      prisma.place.findMany({ select: { id: true, nameKo: true, nameEn: true, placeTypes: true } }),
    ]);
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        takenAt: new Date().toISOString(),
        dbHost: target.host,
        dbRef: target.ref,
        tagGroupConfigs: groups,
        tags: snapTags,
        postTags: snapPostTags,
        reCreeshotTags: snapShotTags,
        curatedSections: snapSections,
        placeTypes: snapPlaceTypes,
        placePlaceTypes: snapPlacePlaceTypes,
        places: snapPlaces,
      },
      null,
      2
    )
  );
  console.log(`\n✔ 스냅샷 저장: ${snapshotPath}`);

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. 그룹 화면 이름
      if (renameNeeded) {
        await tx.tagGroupConfig.update({
          where: { group: GROUP_RENAME.group },
          data: { nameEn: GROUP_RENAME.nameEn },
        });
      }

      // 2. VIBE 그룹 — 이미 있으면 그대로 둔다 (사람이 색을 손봤을 수 있다)
      let groupCreated = 0;
      if (!existingNewGroup && newGroupData) {
        await tx.tagGroupConfig.create({ data: newGroupData });
        groupCreated = 1;
      }

      // 3. 태그 이사
      let moved = 0;
      for (const m of moves) {
        if (m.done) continue;
        await tx.tag.update({ where: { slug: m.slug }, data: { group: m.to } });
        moved++;
      }

      // 4·5. 포스트 태그 보강
      if (adds.length) {
        await tx.postTag.createMany({
          data: adds.map((a) => ({ postId: a.postId, tagId: a.tagId, isVisible: true, displayOrder: a.displayOrder })),
          skipDuplicates: true,
        });
      }

      // 6. 태그 삭제 — 연결을 먼저 지운다
      const ids = [...deleteTagIds];
      let removedPostTags = 0;
      let removedShotTags = 0;
      let removedTags = 0;
      if (ids.length) {
        removedPostTags = (await tx.postTag.deleteMany({ where: { tagId: { in: ids } } })).count;
        removedShotTags = (await tx.reCreeshotTag.deleteMany({ where: { tagId: { in: ids } } })).count;
        removedTags = (await tx.tag.deleteMany({ where: { id: { in: ids } } })).count;
      }

      // 8. CuratedSection — 그룹을 지우기 전에 참조를 끊는다
      const clearedSections = (
        await tx.curatedSection.updateMany({
          where: { filterTagGroup: CLEAR_FILTER_TAG_GROUP },
          data: { filterTagGroup: null },
        })
      ).count;

      // 7. 빈 그룹 삭제 — 트랜잭션 안에서 다시 세고, 비어 있지 않으면 통째로 되돌린다
      let removedGroups = 0;
      for (const g of DELETE_GROUPS) {
        const left = await tx.tag.count({ where: { group: g } });
        if (left > 0) throw new Error(`그룹 ${g} 에 태그가 ${left}개 남아 있다 — 되돌린다`);
        removedGroups += (await tx.tagGroupConfig.deleteMany({ where: { group: g } })).count;
      }

      // 9. 장소 타입 신설
      const newType = await tx.placeType.upsert({
        where: { name: NEW_PLACE_TYPE.name },
        update: {},
        create: { ...NEW_PLACE_TYPE, sortOrder: newTypeSortOrder },
      });

      // 10. 장소 타입 교체 — 이름으로 id 를 찾는다 (Place.placeTypes 가 이름 배열이다)
      const typeRows = await tx.placeType.findMany({ select: { id: true, name: true } });
      const idByName = new Map(typeRows.map((t) => [t.name, t.id]));
      for (const a of PLACE_TYPE_ASSIGNS) {
        const resolved = a.types.map((name) => {
          const id = name === NEW_PLACE_TYPE.name ? newType.id : idByName.get(name);
          if (!id) throw new Error(`장소 타입 "${name}" 을 찾지 못했다 — 되돌린다`);
          return { id, name };
        });
        await tx.place.update({ where: { id: a.placeId }, data: { placeTypes: resolved.map((t) => t.name) } });
        await writePlacePlaceTypes(tx, a.placeId, resolved);
      }

      // 11. 카테고리 이사
      let categoryMoved = 0;
      if (schoolType && schoolType.category !== PLACE_TYPE_CATEGORY_MOVE.to) {
        await tx.placeType.update({
          where: { id: schoolType.id },
          data: { category: PLACE_TYPE_CATEGORY_MOVE.to, sortOrder: schoolSortOrder },
        });
        categoryMoved = 1;
      }

      // 12. 비활성화 — 여기서 다시 센다. 0 이 아니면 되돌린다
      let deactivated = 0;
      if (fanLandmark) {
        const stillLinked = await tx.placePlaceType.count({ where: { placeTypeId: fanLandmark.id } });
        const stillInColumn = await tx.place.count({ where: { placeTypes: { has: DEACTIVATE_PLACE_TYPE } } });
        if (stillLinked > 0 || stillInColumn > 0) {
          throw new Error(
            `${DEACTIVATE_PLACE_TYPE} 를 쓰는 장소가 남아 있다 (연결 ${stillLinked} · 컬럼 ${stillInColumn}) — 되돌린다`
          );
        }
        if (fanLandmark.isActive || fanLandmark.isDefault) {
          await tx.placeType.update({
            where: { id: fanLandmark.id },
            data: { isActive: false, isDefault: false },
          });
          deactivated = 1;
        }
      }

      return {
        renamed: renameNeeded ? 1 : 0,
        groupCreated,
        moved,
        addedPostTags: adds.length,
        removedPostTags,
        removedShotTags,
        removedTags,
        removedGroups,
        clearedSections,
        categoryMoved,
        deactivated,
      };
    },
    { timeout: TX_TIMEOUT_MS }
  );

  console.log(`\n── 완료 ──`);
  console.log(`   그룹 이름 변경 ${result.renamed}건 · ${NEW_GROUP} 신설 ${result.groupCreated}건 · 태그 이사 ${result.moved}건`);
  console.log(`   포스트 태그 보강 ${result.addedPostTags}건`);
  console.log(`   태그 삭제 ${result.removedTags}종 (PostTag ${result.removedPostTags}건 · ReCreeshotTag ${result.removedShotTags}건)`);
  console.log(`   그룹 삭제 ${result.removedGroups}개 · CuratedSection 정리 ${result.clearedSections}건`);
  console.log(`   장소 타입: "${NEW_PLACE_TYPE.name}" 준비 · 장소 ${PLACE_TYPE_ASSIGNS.length}곳 교체 · 카테고리 이사 ${result.categoryMoved}건 · 비활성화 ${result.deactivated}건`);
}

main()
  .catch((e) => {
    console.error(`\n✖ ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
