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
 * 코스는 여러 계정에 나눠 만든다 — --author 계정이 5개(내 코스), 나머지 4개는 다른 계정이
 * 가진 공개 코스다. 남의 공개 코스에서만 "Make it mine"(CopyCourseButton) 이 뜨기 때문에
 * 전부 한 사람 소유면 그 버튼을 볼 수 없다.
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
  // 부산 — 연결 가능한 Place 가 이 근처에 거의 없어 대부분 직접 채운다
  haeundae: { nameEn: "Haeundae Beach", address: "264 Haeundaehaebyeon-ro, Haeundae-gu, Busan", latitude: 35.1587, longitude: 129.1604 },
  dongbaekseom: { nameEn: "Dongbaekseom Island", address: "U-dong, Haeundae-gu, Busan", latitude: 35.1533, longitude: 129.1519 },
  gwangalli: { nameEn: "Gwangalli Beach", address: "219 Gwanganhaebyeon-ro, Suyeong-gu, Busan", latitude: 35.1532, longitude: 129.1187 },
  cheongsapo: { nameEn: "Cheongsapo Daritdol Observatory", address: "116-20 Cheongsapo-ro, Haeundae-gu, Busan", latitude: 35.161, longitude: 129.1968 },
  // 강릉
  anmok: { nameEn: "Anmok Coffee Street", address: "Changhae-ro, Gangneung", latitude: 37.7735, longitude: 128.947 },
  gyeongpo: { nameEn: "Gyeongpo Beach", address: "Anhyeon-dong, Gangneung", latitude: 37.7955, longitude: 128.9096 },
  ojukheon: { nameEn: "Ojukheon House", address: "24 Yulgok-ro 3139beon-gil, Gangneung", latitude: 37.7791, longitude: 128.8779 },
  // 용산 — HYBE 사옥 주변
  hybe: { nameEn: "HYBE Headquarters", address: "42 Ichon-ro, Yongsan-gu, Seoul", latitude: 37.5259, longitude: 126.9636 },
  yongsanPark: { nameEn: "Yongsan Family Park", address: "1-1 Seobinggo-ro, Yongsan-gu, Seoul", latitude: 37.523, longitude: 126.974 },
  // 서울 야경 / 홍대
  namsan: { nameEn: "Namsan Seoul Tower", address: "105 Namsangongwon-gil, Yongsan-gu, Seoul", latitude: 37.5512, longitude: 126.9882 },
  banpo: { nameEn: "Banpo Bridge Moonlight Rainbow Fountain", address: "Sinbanpo-ro 11-gil, Seocho-gu, Seoul", latitude: 37.5126, longitude: 126.9959 },
  mangwonMarket: { nameEn: "Mangwon Market", address: "14 Poeun-ro 8-gil, Mapo-gu, Seoul", latitude: 37.5556, longitude: 126.9024 },
} as const;

type ManualItem = (typeof MANUAL)[keyof typeof MANUAL];

/** Day 한 칸 — "place" 는 실제 Place 에서 채우고, 객체면 직접 값을 넣는다 */
type Slot = "place" | ManualItem;

/**
 * 소유자.
 *   "me"        --author 로 지정한 계정 (없으면 가장 먼저 만들어진 User)
 *   "anonymous" nickname 이 null 인 계정 — 카드에 "Anonymous" 로 뜨는지 확인용
 *   "@park"     그 nickname 을 가진 계정
 */
type OwnerSpec = "me" | "anonymous" | `@${string}`;

type CourseSpec = {
  title: string;
  owner: OwnerSpec;
  isPublic: boolean;
  /** 붙일 L2 Topic 의 nameEn. 커버 색이 여기서 나오므로 순서가 그라데이션 순서다 */
  topicNames: string[];
  /** Place 를 고를 기준점 */
  anchor: Coords;
  /** 앵커에서 이 거리 안의 Place 만 연결한다. 지방 코스가 수도권 Place 를 물어오는 것을 막는다 */
  maxSpreadKm?: number;
  /** 이미 복사된 코스의 표시 확인용. 지금 이 값을 그리는 UI 는 없다 */
  copyCount?: number;
  days: { title: string | null; slots: Slot[] }[];
};

const SEOUL_CENTER = { latitude: 37.5796, longitude: 126.977 };
const YONGSAN = { latitude: 37.5259, longitude: 126.9636 };
const GANGNEUNG = { latitude: 37.7952, longitude: 128.8961 };

/** 지방 코스의 Place 연결 반경. 이 밖이면 아예 연결하지 않는다 */
const REGIONAL_SPREAD_KM = 15;

const SPECS: CourseSpec[] = [
  {
    title: `${MOCK_PREFIX}BTS Seoul Pilgrimage`,
    owner: "me",
    isPublic: true,
    topicNames: ["BTS"],
    anchor: SEOUL_CENTER,
    days: [
      { title: "Palace and old town", slots: ["place", MANUAL.gyeongbokgung, "place"] },
      { title: null, slots: ["place", MANUAL.bukchon] },
    ],
  },
  {
    // Topic 2개 — 커버가 두 색을 잇는 그라데이션이 된다 (course-cover.ts:29)
    title: `${MOCK_PREFIX}BTS × TXT Hybe Route`,
    owner: "@park", // 남의 공개 코스 — "Make it mine" 확인용
    isPublic: true,
    topicNames: ["BTS", "TXT"],
    anchor: YONGSAN,
    days: [
      { title: "Around HYBE", slots: ["place", MANUAL.hybe, "place", MANUAL.yongsanPark] },
    ],
  },
  {
    title: `${MOCK_PREFIX}Gangneung Sea & Coffee`,
    owner: "@swimmer", // 남의 공개 코스 — "Make it mine" 확인용
    isPublic: true,
    topicNames: [], // Topic 없음 — 중립 커버 확인용
    anchor: GANGNEUNG,
    maxSpreadKm: REGIONAL_SPREAD_KM,
    days: [
      { title: "Coast", slots: ["place", MANUAL.anmok] },
      { title: "Inland", slots: ["place", MANUAL.gyeongpo, MANUAL.ojukheon] },
    ],
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
    `내 코스 작성자: ${author.nickname ?? "(닉네임 없음)"}${authorName ? " (--author 지정)" : " (가장 먼저 만들어진 User)"}`,
  );
  console.log("  이 계정으로 로그인해야 My Journeys 섹션과 Private 배지가 보인다.");

  // 나머지 코스는 다른 계정 소유다. 없는 계정을 만나면 조용히 author 로 떨어뜨리지 않는다 —
  // 그러면 전부 내 코스가 되어 "Make it mine" 을 확인하려던 목적이 사라진다.
  // 위 가드로 non-null 이지만 클로저 안에서는 좁힘이 유지되지 않아 따로 잡아둔다
  const me = author;
  const ownerCache = new Map<OwnerSpec, { id: string; nickname: string | null }>();
  ownerCache.set("me", me);

  async function resolveOwner(spec: OwnerSpec) {
    const cached = ownerCache.get(spec);
    if (cached) return cached;

    const user =
      spec === "anonymous"
        ? await prisma.user.findFirst({ where: { nickname: null }, select: { id: true, nickname: true } })
        : await prisma.user.findFirst({
            where: { nickname: spec.slice(1) },
            select: { id: true, nickname: true },
          });

    if (!user) {
      console.error(
        spec === "anonymous"
          ? "nickname 이 null 인 User 가 없다. \"Anonymous\" 표기를 확인할 코스를 만들 수 없어 중단한다."
          : `nickname 이 "${spec.slice(1)}" 인 User 가 없다. 중단한다.`,
      );
      process.exit(1);
    }
    if (user.id === me.id) {
      console.error(`${spec} 가 --author 와 같은 계정이다. 남의 코스가 안 되므로 중단한다.`);
      process.exit(1);
    }
    ownerCache.set(spec, user);
    return user;
  }

  // 코스 라벨은 L2 Topic 만 쓴다 (updateCourse 와 같은 조건).
  // 이름으로 집는다 — sortOrder 앞에서부터 자르면 커버 색이 데이터 순서에 휘둘린다.
  const topicPool = await prisma.topic.findMany({
    where: { level: 2, isActive: true },
    select: { id: true, nameEn: true, colorHex: true },
  });
  const topicByName = new Map(topicPool.map((t) => [t.nameEn, t]));

  const wanted = [...new Set(SPECS.flatMap((spec) => spec.topicNames))];
  const missing = wanted.filter((name) => !topicByName.has(name));
  if (missing.length > 0) {
    console.error(`level 2 · isActive 인 Topic 중 다음이 없다: ${missing.join(", ")}`);
    console.error("SPECS 의 topicNames 를 고치거나 Topic 을 먼저 만들어라.");
    process.exit(1);
  }
  console.log("Topic");
  for (const name of wanted) {
    const t = topicByName.get(name)!;
    console.log(`  ${name.padEnd(6)} ${t.colorHex ?? "(colorHex 없음 — 기본색으로 떨어진다)"}`);
  }
  // 2색 그라데이션은 두 색이 서로 달라야 보인다
  for (const spec of SPECS.filter((sp) => sp.topicNames.length > 1)) {
    const colors = spec.topicNames.map((n) => topicByName.get(n)!.colorHex);
    if (new Set(colors).size < colors.length || colors.some((c) => !c)) {
      console.warn(`  ⚠ "${spec.title}" 의 Topic 색이 같거나 비어 그라데이션이 안 보인다: ${colors.join(" / ")}`);
    }
  }
  console.log("");

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
  /** 앵커에서 이 거리 안의 Place 만 쓴다. spec.maxSpreadKm 로 코스별로 좁힐 수 있다 */
  const DEFAULT_SPREAD_KM = 25;

  function takeNearby(anchor: Coords, taken: Coords[], maxSpreadKm: number) {
    const farEnough = (c: Coords) => taken.every((t) => distanceKm(c, t) >= MIN_GAP_KM);

    const ranked = placePool
      .filter((p) => !used.has(p.id))
      .map((p) => ({ p, coords: { latitude: p.latitude!, longitude: p.longitude! } }))
      .filter(({ coords }) => farEnough(coords))
      .sort((a, b) => distanceKm(anchor, a.coords) - distanceKm(anchor, b.coords));

    // 반경 밖으로는 절대 나가지 않는다. 예전엔 다 떨어지면 제일 가까운 것을 그냥 집었는데,
    // 그러면 부산·강릉 코스가 수도권 Place 를 물어와 지도가 전국으로 벌어진다.
    const picked = ranked.find(({ coords }) => distanceKm(anchor, coords) <= maxSpreadKm);
    if (picked) {
      used.add(picked.p.id);
      taken.push(picked.coords);
    }
    return picked?.p;
  }

  const report: {
    id: string;
    title: string;
    ownerName: string;
    isMine: boolean;
    topicLabel: string;
    isPublic: boolean;
    copyCount: number;
    days: number;
    items: number;
    topics: number;
    linked: number;
    manual: number;
  }[] = [];

  for (const spec of SPECS) {
    const topicIds = spec.topicNames.map((name) => topicByName.get(name)!.id);
    const owner = await resolveOwner(spec.owner);

    const course = await prisma.course.create({
      data: {
        title: spec.title,
        description: null,
        authorId: owner.id,
        isPublic: spec.isPublic,
        copyCount: spec.copyCount ?? 0,
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
          const place = takeNearby(spec.anchor, takenCoords, spec.maxSpreadKm ?? DEFAULT_SPREAD_KM);
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
      // CourseCard 는 nickname 이 null 이면 "Anonymous" 로 그린다
      ownerName: owner.nickname ?? "Anonymous",
      isMine: owner.id === me.id,
      topicLabel:
        spec.topicNames.length > 0
          ? spec.topicNames.map((n) => `${n} ${topicByName.get(n)!.colorHex ?? "(색없음)"}`).join(" + ")
          : "없음 (중립 커버)",
      isPublic: spec.isPublic,
      copyCount: spec.copyCount ?? 0,
      days: spec.days.length,
      items: linked + manual,
      topics: topicIds.length,
      linked,
      manual,
    });
  }

  // ─── 보고 ───────────────────────────────────────────────────────────────────

  console.log("계정별 코스 수\n");
  const byOwner = new Map<string, number>();
  for (const r of report) byOwner.set(r.ownerName, (byOwner.get(r.ownerName) ?? 0) + 1);
  for (const [name, count] of byOwner) {
    const mine = report.find((r) => r.ownerName === name)?.isMine;
    console.log(`  ${name.padEnd(12)} ${count}개${mine ? "   ← 내 코스 (Make it mine 안 뜸)" : ""}`);
  }
  console.log("");

  console.log("생성한 코스\n");
  for (const r of report) {
    console.log(`  ${r.title}`);
    console.log(`    id       ${r.id}`);
    console.log(`    owner    ${r.ownerName}${r.isMine ? " (나)" : ""}`);
    console.log(
      `    ${r.isPublic ? "public " : "private"}  Day ${r.days} · 아이템 ${r.items} · Topic ${r.topics}` +
        (r.copyCount > 0 ? ` · copyCount ${r.copyCount}` : ""),
    );
    console.log(`    Topic    ${r.topicLabel}`);
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
  console.log(`  ${BASE_URL}/profile`);
  for (const r of report) {
    const mark = r.isMine ? "내 코스" : "Make it mine";
    console.log(
      `  ${BASE_URL}/journeys/${r.id}   ${r.title.replace(MOCK_PREFIX, "").padEnd(24)} ${mark}`,
    );
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
