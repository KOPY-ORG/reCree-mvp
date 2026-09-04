/**
 * /journeys · /journeys/[id] 화면 확인용 목데이터.
 *
 *   pnpm exec ts-node -r tsconfig-paths/register \
 *     --compiler-options '{"module":"CommonJS","baseUrl":".","paths":{"@/*":["./src/*"]}}' \
 *     prisma/scripts/seed-mock-courses.ts            생성
 *     … seed-mock-courses.ts --clean                 삭제
 *     … seed-mock-courses.ts --author taemee         작성자 지정 (기본: 가장 먼저 만들어진 User)
 *
 * ★ 작성자가 지금 로그인한 계정과 다르면 /journeys 의 "My Journeys" 섹션과
 *   Private 배지를 눈으로 볼 수 없다. 그 둘을 확인하려면 --author 로 본인 계정을 지정해라.
 *
 * 목 코스는 title 이 "[MOCK] " 로 시작한다. --clean 은 그 접두사를 가진 Course 만 지우고,
 * Day / Item / CourseTopic 은 onDelete: Cascade 로 함께 사라진다.
 * 기존 User / Topic / Place 는 읽기만 한다 — 만들지도 고치지도 지우지도 않는다.
 */
process.loadEnvFile(".env.local");

import { prisma } from "@/lib/prisma";

const DEV_REF = "vvcyimilydgisrkgqqbv";
const PROD_REF = "vwfojaivbltsdjttjhxw";
const MOCK_PREFIX = "[MOCK] ";
const BASE_URL = "http://localhost:3000";

// ─── 안전장치 ─────────────────────────────────────────────────────────────────

function assertDevDatabase() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url) {
    console.error("DATABASE_URL 이 비어 있다. .env.local 을 확인해라.");
    process.exit(1);
  }
  if (url.includes(PROD_REF)) {
    console.error(`중단. 연결 문자열에 prod ref(${PROD_REF})가 있다.`);
    process.exit(1);
  }
  if (!url.includes(DEV_REF)) {
    console.error(`중단. 연결 문자열에 dev ref(${DEV_REF})가 없다.`);
    process.exit(1);
  }
  console.log(`DB 확인: dev(${DEV_REF}) ✅\n`);
}

// ─── 좌표 헬퍼 ────────────────────────────────────────────────────────────────

type Coords = { latitude: number; longitude: number };

/** 코스마다 지도가 한 화면에 담기도록 앵커에서 가까운 Place 부터 고른다 */
function distanceKm(a: Coords, b: Coords): number {
  const latKm = (a.latitude - b.latitude) * 111;
  const lngKm = (a.longitude - b.longitude) * 111 * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(latKm, lngKm);
}

// ─── 직접 채우는 아이템 (placeId null — "Tourism data" 칩 확인용) ─────────────
// 실제 좌표. 한 코스 안에서 서로 0.5~3km 떨어뜨렸다.

const MANUAL = {
  gyeongbokgung: { nameEn: "Gyeongbokgung Palace", address: "161 Sajik-ro, Jongno-gu, Seoul", latitude: 37.5796, longitude: 126.977 },
  bukchon: { nameEn: "Bukchon Hanok Village", address: "37 Gyedong-gil, Jongno-gu, Seoul", latitude: 37.5826, longitude: 126.983 },
  yeonnam: { nameEn: "Gyeongui Line Forest Park", address: "Yeonnam-dong, Mapo-gu, Seoul", latitude: 37.5601, longitude: 126.925 },
  hongdaePlayground: { nameEn: "Hongdae Playground", address: "Seogyo-dong, Mapo-gu, Seoul", latitude: 37.5535, longitude: 126.9226 },
  seongsu: { nameEn: "Seongsu Yeonmujang", address: "Seongsu-dong, Seongdong-gu, Seoul", latitude: 37.5445, longitude: 127.0559 },
  cheomseongdae: { nameEn: "Cheomseongdae Observatory", address: "839-1 Inwang-dong, Gyeongju", latitude: 35.8348, longitude: 129.2249 },
  daereungwon: { nameEn: "Daereungwon Tomb Complex", address: "9 Gyerim-ro, Gyeongju", latitude: 35.829, longitude: 129.2125 },
  gyeongjuMuseum: { nameEn: "Gyeongju National Museum", address: "186 Iljeong-ro, Gyeongju", latitude: 35.829, longitude: 129.2277 },
} as const;

type ManualItem = (typeof MANUAL)[keyof typeof MANUAL];

/** Day 한 칸 — "place" 는 실제 Place 에서 채우고, 객체면 직접 값을 넣는다 */
type Slot = "place" | ManualItem;

type CourseSpec = {
  title: string;
  isPublic: boolean;
  topicCount: number;
  /** Place 를 고를 기준점 */
  anchor: Coords;
  days: { title: string | null; slots: Slot[] }[];
};

const SEOUL_CENTER = { latitude: 37.5796, longitude: 126.977 };
const HONGDAE = { latitude: 37.5535, longitude: 126.9226 };
const SEONGSU = { latitude: 37.5445, longitude: 127.0559 };
const GYEONGJU = { latitude: 35.8348, longitude: 129.2249 };

const SPECS: CourseSpec[] = [
  {
    title: `${MOCK_PREFIX}Seoul BTS Pilgrimage`,
    isPublic: true,
    topicCount: 1,
    anchor: SEOUL_CENTER,
    days: [
      { title: "Palace and old town", slots: ["place", MANUAL.gyeongbokgung, "place"] },
      { title: null, slots: ["place", MANUAL.bukchon] },
      { title: null, slots: [] }, // 빈 Day 확인용
    ],
  },
  {
    title: `${MOCK_PREFIX}Hongdae Cafe Hop`,
    isPublic: true,
    topicCount: 2, // 그라데이션 확인용
    anchor: HONGDAE,
    days: [
      { title: "Cafe crawl", slots: ["place", "place", MANUAL.yeonnam, MANUAL.hongdaePlayground] },
    ],
  },
  {
    title: `${MOCK_PREFIX}Gyeongju Day Trip`,
    isPublic: true,
    topicCount: 0, // 중립색 확인용
    anchor: GYEONGJU,
    // 경주엔 연결할 Place 가 없다 — 전부 직접 채워 지도가 서울까지 벌어지지 않게 한다
    days: [
      { title: null, slots: [MANUAL.cheomseongdae, MANUAL.daereungwon, MANUAL.gyeongjuMuseum] },
    ],
  },
  {
    title: `${MOCK_PREFIX}My Secret Route`,
    isPublic: false, // Private 배지 확인용
    topicCount: 1,
    anchor: SEONGSU,
    days: [
      { title: null, slots: ["place", MANUAL.seongsu] },
      { title: "Second day", slots: ["place", "place"] },
    ],
  },
  {
    title: `${MOCK_PREFIX}Empty Journey`,
    isPublic: true,
    topicCount: 0,
    anchor: SEOUL_CENTER,
    days: [{ title: null, slots: [] }], // 완전 빈 상태 확인용
  },
];

// ─── 삭제 ─────────────────────────────────────────────────────────────────────

async function clean() {
  const targets = await prisma.course.findMany({
    where: { title: { startsWith: MOCK_PREFIX } },
    select: { id: true, title: true },
  });

  if (targets.length === 0) {
    console.log("지울 목 코스가 없다.");
    return;
  }

  targets.forEach((c) => console.log("  삭제:", c.title));
  const { count } = await prisma.course.deleteMany({ where: { title: { startsWith: MOCK_PREFIX } } });
  console.log(`\nCourse ${count}개 삭제. Day / Item / CourseTopic 은 cascade 로 함께 사라진다.`);
}

// ─── 생성 ─────────────────────────────────────────────────────────────────────

async function seed() {
  const existing = await prisma.course.count({ where: { title: { startsWith: MOCK_PREFIX } } });
  if (existing > 0) {
    console.error(`이미 목 코스가 ${existing}개 있다. 중복을 만들지 않으려고 멈춘다.`);
    console.error("먼저 --clean 으로 지워라.");
    process.exit(1);
  }

  // --author <nickname> 로 지정할 수 있다. 없으면 가장 먼저 만들어진 User.
  const authorArgIndex = process.argv.indexOf("--author");
  const authorName = authorArgIndex >= 0 ? process.argv[authorArgIndex + 1] : undefined;

  const author = authorName
    ? await prisma.user.findFirst({ where: { nickname: authorName }, select: { id: true, nickname: true } })
    : await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, nickname: true } });

  if (!author) {
    console.error(
      authorName
        ? `nickname 이 "${authorName}" 인 User 가 없다.`
        : "User 가 하나도 없다. 목 코스의 authorId 를 정할 수 없어 중단한다.",
    );
    process.exit(1);
  }
  console.log(
    `작성자: ${author.nickname ?? "(닉네임 없음)"}${authorName ? " (--author 지정)" : " (가장 먼저 만들어진 User)"}`,
  );
  console.log("  이 계정으로 로그인해야 My Journeys 섹션과 Private 배지가 보인다.");

  // level 2 · isActive 중 앞에서부터. 색이 있는 것을 앞세운다 —
  // 2개짜리 코스가 그라데이션 확인용이라 colorHex 가 null 이면 회색으로만 보인다.
  const topicPool = await prisma.topic.findMany({
    where: { level: 2, isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 8,
    select: { id: true, nameEn: true, colorHex: true },
  });
  const topics = [...topicPool].sort((a, b) => (a.colorHex ? 0 : 1) - (b.colorHex ? 0 : 1));
  console.log(
    topics.length > 0
      ? `Topic: ${topics.slice(0, 3).map((t) => `${t.nameEn}${t.colorHex ? "" : "(색없음)"}`).join(", ")}`
      : "Topic: 없음 — Topic 없이 만든다",
  );

  // 발행 포스트가 붙은 Place 우선 — 상세 화면에서 /discover?place= 링크가 걸린다
  const placePool = await prisma.place.findMany({
    where: {
      postPlaces: { some: { post: { status: "PUBLISHED" } } },
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      nameEn: true,
      nameKo: true,
      addressEn: true,
      addressKo: true,
      latitude: true,
      longitude: true,
      imageUrl: true,
    },
  });
  console.log(`연결 가능한 Place: ${placePool.length}개 (발행 포스트 + 좌표 보유)\n`);

  const used = new Set<string>();

  /**
   * 앵커 주변에서 아직 안 쓴 Place 를 하나 고른다.
   * 같은 코스 안에서 이미 쓴 좌표와 MIN_GAP_KM 이상 떨어진 것만 받는다 —
   * 안 그러면 핀이 겹치고, 수동 아이템과 이름이 똑같은 Place 가 뽑힌다
   * (앵커를 수동 좌표에 맞춰 놨기 때문).
   */
  const MIN_GAP_KM = 0.5;
  const MAX_SPREAD_KM = 10;

  function takeNearby(anchor: Coords, taken: Coords[]) {
    const farEnough = (c: Coords) => taken.every((t) => distanceKm(c, t) >= MIN_GAP_KM);

    const ranked = placePool
      .filter((p) => !used.has(p.id))
      .map((p) => ({ p, coords: { latitude: p.latitude!, longitude: p.longitude! } }))
      .filter(({ coords }) => farEnough(coords))
      .sort((a, b) => distanceKm(anchor, a.coords) - distanceKm(anchor, b.coords));

    // 앵커 근처를 우선하되, 다 떨어지면 거리 제한을 푼다
    const picked = ranked.find(({ coords }) => distanceKm(anchor, coords) <= MAX_SPREAD_KM) ?? ranked[0];
    if (picked) {
      used.add(picked.p.id);
      taken.push(picked.coords);
    }
    return picked?.p;
  }

  const report: {
    id: string;
    title: string;
    isPublic: boolean;
    days: number;
    items: number;
    topics: number;
    linked: number;
    manual: number;
  }[] = [];

  for (const spec of SPECS) {
    const topicIds = topics.slice(0, spec.topicCount).map((t) => t.id);

    const course = await prisma.course.create({
      data: {
        title: spec.title,
        description: null,
        authorId: author.id,
        isPublic: spec.isPublic,
        topics: { create: topicIds.map((topicId) => ({ topicId })) },
      },
      select: { id: true },
    });

    let linked = 0;
    let manual = 0;

    // 이 코스가 이미 쓰는 좌표. 수동 아이템은 미리 넣어 Place 가 그 위에 겹치지 않게 한다
    const takenCoords: Coords[] = spec.days
      .flatMap((d) => d.slots)
      .filter((slot): slot is ManualItem => slot !== "place")
      .map((slot) => ({ latitude: slot.latitude, longitude: slot.longitude }));

    for (const [dayIndex, day] of spec.days.entries()) {
      const createdDay = await prisma.courseDay.create({
        data: { courseId: course.id, dayNumber: dayIndex + 1, title: day.title },
        select: { id: true },
      });

      for (const [slotIndex, slot] of day.slots.entries()) {
        if (slot === "place") {
          const place = takeNearby(spec.anchor, takenCoords);
          if (!place) {
            console.warn(`  ⚠ 남은 Place 가 없어 "${spec.title}" Day ${dayIndex + 1} 한 칸을 건너뛴다`);
            continue;
          }
          // 스냅샷 — Place 값을 그대로 복사한다 (nameEn 은 NOT NULL 이라 nameKo 로 폴백)
          await prisma.courseItem.create({
            data: {
              dayId: createdDay.id,
              sortOrder: slotIndex,
              placeId: place.id,
              nameEn: place.nameEn ?? place.nameKo,
              nameKo: place.nameKo,
              address: place.addressEn ?? place.addressKo,
              latitude: place.latitude,
              longitude: place.longitude,
              imageUrl: place.imageUrl,
            },
          });
          linked++;
        } else {
          await prisma.courseItem.create({
            data: {
              dayId: createdDay.id,
              sortOrder: slotIndex,
              placeId: null,
              nameEn: slot.nameEn,
              address: slot.address,
              latitude: slot.latitude,
              longitude: slot.longitude,
            },
          });
          manual++;
        }
      }
    }

    report.push({
      id: course.id,
      title: spec.title,
      isPublic: spec.isPublic,
      days: spec.days.length,
      items: linked + manual,
      topics: topicIds.length,
      linked,
      manual,
    });
  }

  // ─── 보고 ───────────────────────────────────────────────────────────────────

  console.log("생성한 코스\n");
  for (const r of report) {
    console.log(`  ${r.title}`);
    console.log(`    id       ${r.id}`);
    console.log(
      `    ${r.isPublic ? "public " : "private"}  Day ${r.days} · 아이템 ${r.items} · Topic ${r.topics}`,
    );
    console.log(`    아이템    placeId 연결 ${r.linked} / null ${r.manual}`);
    console.log("");
  }

  const total = report.reduce(
    (acc, r) => ({
      items: acc.items + r.items,
      linked: acc.linked + r.linked,
      manual: acc.manual + r.manual,
    }),
    { items: 0, linked: 0, manual: 0 },
  );
  console.log(
    `합계  코스 ${report.length} · 아이템 ${total.items} (placeId 연결 ${total.linked} / null ${total.manual})\n`,
  );

  console.log("확인용 URL");
  console.log(`  ${BASE_URL}/journeys`);
  for (const r of report) {
    console.log(`  ${BASE_URL}/journeys/${r.id}   ${r.title.replace(MOCK_PREFIX, "")}`);
  }
}

// ─── 진입점 ───────────────────────────────────────────────────────────────────

async function main() {
  assertDevDatabase();
  if (process.argv.includes("--clean")) await clean();
  else await seed();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
