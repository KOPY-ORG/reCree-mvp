// 전국 Area 일괄 등록 — ldongCode2(한국관광공사) 기준
//
// 실행:
//   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/seed-areas.ts --dry-run
//   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/seed-areas.ts
//
// ⚠️ dev 전용. prod 에 돌리지 않는다.
//
// ── 설계 ──────────────────────────────────────────────────────────────────────
//
// 1. ldongCode2 를 lDongListYn=Y 로 국문·영문 각 1회 호출한다. 269행씩 온다.
//    계층 호출(시도별 16회)은 쓰지 않는다 — 평면 목록이 regn/signgu 코드를 한 행에 준다.
//
// 2. 269행 = 시군구 230 + 일반시의 구 39. 시도 행은 따로 오지 않아 regn 코드로 묶어 만든다.
//
// 3. 일반시 13곳은 구를 별도 Area 로 만들지 않고 상위 시의 lDongSignguCds 에 흡수한다.
//    축제 데이터가 시 코드에 안 붙어 있기 때문이다 — 수원시(110) 0건, 구 4개 16건.
//    상위 시는 "수원시 장안구" 의 공백 앞을 떼어 같은 regn 안에서 이름이 정확히
//    일치하는 행을 찾는다. 실측 39개 전부 붙었고 고아가 없다.
//
// 4. 세종(36110)은 regn 과 signgu 가 같은 값으로 와서 시도로만 만든다.
//
// 5. 기존 Area 27행은 이름 자동 매칭을 쓰지 않는다. 접미사를 떼어 맞추면 기존 "광주"가
//    경기도 광주시(41/610)에 잘못 붙는다. 전국에 접미사 제거 후 중복되는 이름이 7개다
//    (Jung 5개, Dong 5개, Goseong 2개 …). 아래 MANUAL_MATCH 로 사람이 정한다.
//    코드가 아니라 ldongCode2 이름으로 적어 스크립트가 코드로 푼다 — 코드 오기를 막는다.
//
// 6. 매칭된 기존 행은 lDongRegnCd · lDongSignguCds · level · parentId 를 갱신한다.
//    nameKo · nameEn · sortOrder · id 는 건드리지 않는다. id 는 Place.areaId 가 참조한다.
//
// 7. 매칭 안 된 행(광주 · 충청 · 홍대 · 명동)은 지우지 않고 그대로 둔다.
//    광주는 12로 통합돼 시도에 없고, 충청은 충북·충남 둘 다라 하나로 못 정한다.

try {
  process.loadEnvFile(".env.local");
} catch {}

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DRY_RUN = process.argv.includes("--dry-run");

const KOR_BASE = "http://apis.data.go.kr/B551011/KorService2";
const ENG_BASE = "http://apis.data.go.kr/B551011/EngService2";

/** regn 과 signgu 가 같은 값으로 오는 유일한 시도. 시도로만 만든다 */
const SEJONG_REGN = "36110";

/** 새로 만드는 행의 sortOrder 시작값 — 기존 0~22 와 겹치지 않게 띄운다 */
const SORT_BASE_SIDO = 100;
const SORT_BASE_SIGNGU = 1000;

// ─── 기존 Area 매핑표 ─────────────────────────────────────────────────────────

type Match = { regnNm: string; signguNm: string | null };

/**
 * 기존 Area.nameKo → ldongCode2 이름.
 * signguNm 이 null 이면 시도(level 0), 있으면 시군구(level 1).
 * 여기 없는 기존 행은 건드리지 않는다.
 */
const MANUAL_MATCH: Record<string, Match> = {
  // 시도 — level 0 유지
  서울: { regnNm: "서울특별시", signguNm: null },
  부산: { regnNm: "부산광역시", signguNm: null },
  제주: { regnNm: "제주특별자치도", signguNm: null },
  인천: { regnNm: "인천광역시", signguNm: null },
  대구: { regnNm: "대구광역시", signguNm: null },
  대전: { regnNm: "대전광역시", signguNm: null },
  울산: { regnNm: "울산광역시", signguNm: null },
  세종: { regnNm: "세종특별자치시", signguNm: null },
  강원: { regnNm: "강원특별자치도", signguNm: null },

  // level 0 에 잘못 올라가 있던 시군구 11곳 — level 1 로 내리고 parentId 를 붙인다
  전주: { regnNm: "전북특별자치도", signguNm: "전주시" },
  수원: { regnNm: "경기도", signguNm: "수원시" },
  창원: { regnNm: "경상남도", signguNm: "창원시" },
  강릉: { regnNm: "강원특별자치도", signguNm: "강릉시" },
  포천: { regnNm: "경기도", signguNm: "포천시" },
  문경: { regnNm: "경상북도", signguNm: "문경시" },
  용인: { regnNm: "경기도", signguNm: "용인시" },
  파주: { regnNm: "경기도", signguNm: "파주시" },
  순천: { regnNm: "전남광주통합특별시", signguNm: "순천시" },
  양주: { regnNm: "경기도", signguNm: "양주시" }, // 남양주시(360) 아님
  김포: { regnNm: "경기도", signguNm: "김포시" },

  // 이미 level 1 · parent 서울. 코드만 채운다
  종로: { regnNm: "서울특별시", signguNm: "종로구" },
  강남: { regnNm: "서울특별시", signguNm: "강남구" },
  용산: { regnNm: "서울특별시", signguNm: "용산구" },

  // 광주 · 충청 · 홍대 · 명동은 일부러 뺐다 (위 주석 7)
};

// ─── ldongCode2 ───────────────────────────────────────────────────────────────

type LdongRow = {
  lDongRegnCd: string;
  lDongRegnNm: string;
  lDongSignguCd: string;
  lDongSignguNm: string;
};

async function fetchLdong(base: string, label: string): Promise<LdongRow[]> {
  const url = new URL(`${base}/ldongCode2`);
  url.searchParams.set("serviceKey", process.env.TOUR_API_KEY!);
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "recree-seed-areas");
  url.searchParams.set("_type", "json");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("numOfRows", "1000");
  url.searchParams.set("lDongListYn", "Y");

  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
  const text = await res.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`${label} JSON 파싱 실패: ${text.slice(0, 200)}`);
  }
  const header = data?.response?.header;
  if (header?.resultCode !== "0000") {
    throw new Error(`${label} resultCode=${header?.resultCode ?? data?.resultCode} (${header?.resultMsg ?? data?.resultMsg})`);
  }
  const rawItems = data?.response?.body?.items?.item;
  const items: LdongRow[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  if (items.length === 0) throw new Error(`${label} 0행`);
  return items;
}

// ─── 영문 이름 다듬기 ─────────────────────────────────────────────────────────

/**
 * 시도만 행정 접미사를 뗀다. 16개가 전부 고유해 떼도 안 헷갈리고
 * 기존 Area(Seoul · Gangwon)의 표기와 맞는다.
 *
 * 시군구는 떼지 않는다 — 떼면 Jung(중구)이 5개 시도에서 겹치고 영어로 뜻이 없다.
 */
function cleanSidoNameEn(raw: string): string {
  if (raw === "Jeonnam-Gwangju Special Metropolitan City") return "Jeonnam-Gwangju";
  return raw.replace(/-(do|si)$/, "");
}

// ─── 목표 Area 계산 ───────────────────────────────────────────────────────────

type TargetSido = { key: string; regnCd: string; nameKo: string; nameEn: string; sortOrder: number };
type TargetSigngu = {
  key: string;
  regnCd: string;
  signguCd: string;
  nameKo: string;
  nameEn: string;
  signguCds: string[];
  sortOrder: number;
};

function buildTargets(ko: LdongRow[], en: LdongRow[]) {
  const enByKey = new Map(en.map((r) => [`${r.lDongRegnCd}/${r.lDongSignguCd}`, r]));
  const missingEn = ko.filter((r) => !enByKey.has(`${r.lDongRegnCd}/${r.lDongSignguCd}`));
  if (missingEn.length > 0) {
    throw new Error(`영문에 없는 코드쌍 ${missingEn.length}건: ${missingEn.slice(0, 5).map((r) => `${r.lDongRegnCd}/${r.lDongSignguCd}`).join(", ")}`);
  }

  // 공백이 있으면 일반시의 구 ("수원시 장안구"). 광역시의 구는 공백이 없다 ("해운대구")
  const isGu = (r: LdongRow) => r.lDongSignguNm.includes(" ");

  // 구 → 상위 시. 공백 앞을 떼어 같은 regn 안에서 이름이 정확히 일치하는 행을 찾는다
  const absorbed = new Map<string, string[]>(); // "regn/signgu"(상위 시) → 구 코드들
  const orphanGu: LdongRow[] = [];
  for (const g of ko.filter(isGu)) {
    const head = g.lDongSignguNm.split(" ")[0];
    const parent = ko.find((r) => r.lDongRegnCd === g.lDongRegnCd && r.lDongSignguNm === head);
    if (!parent) {
      orphanGu.push(g);
      continue;
    }
    const key = `${parent.lDongRegnCd}/${parent.lDongSignguCd}`;
    absorbed.set(key, [...(absorbed.get(key) ?? []), g.lDongSignguCd]);
  }
  if (orphanGu.length > 0) {
    throw new Error(`상위 시를 못 찾은 구 ${orphanGu.length}건: ${orphanGu.map((g) => g.lDongSignguNm).join(", ")}`);
  }

  // 시도 — regn 코드로 묶는다
  const sidoSeen = new Set<string>();
  const sidos: TargetSido[] = [];
  for (const r of ko) {
    if (sidoSeen.has(r.lDongRegnCd)) continue;
    sidoSeen.add(r.lDongRegnCd);
    const enRow = enByKey.get(`${r.lDongRegnCd}/${r.lDongSignguCd}`)!;
    sidos.push({
      key: r.lDongRegnNm,
      regnCd: r.lDongRegnCd,
      nameKo: r.lDongRegnNm,
      nameEn: cleanSidoNameEn(enRow.lDongRegnNm),
      sortOrder: SORT_BASE_SIDO + sidos.length,
    });
  }

  // 시군구 — 구 39개와 세종 중복 1개를 뺀다
  const guKeys = new Set(ko.filter(isGu).map((r) => `${r.lDongRegnCd}/${r.lDongSignguCd}`));
  const signgus: TargetSigngu[] = [];
  for (const r of ko) {
    const key = `${r.lDongRegnCd}/${r.lDongSignguCd}`;
    if (guKeys.has(key)) continue;
    if (r.lDongRegnCd === SEJONG_REGN) continue; // 시도로만 만든다
    const enRow = enByKey.get(key)!;
    const absorbedCds = absorbed.get(key);
    signgus.push({
      key: `${r.lDongRegnNm}/${r.lDongSignguNm}`,
      regnCd: r.lDongRegnCd,
      signguCd: r.lDongSignguCd,
      nameKo: r.lDongSignguNm,
      nameEn: enRow.lDongSignguNm,
      // 일반시는 자기 코드를 넣지 않는다 — 축제가 0건이라 넣으면 헛호출이다
      signguCds: absorbedCds ?? [r.lDongSignguCd],
      sortOrder: SORT_BASE_SIGNGU + signgus.length,
    });
  }

  return { sidos, signgus, absorbed };
}

// ─── 실행 ─────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (!process.env.TOUR_API_KEY) throw new Error("TOUR_API_KEY 없음 (.env.local)");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 없음 (.env.local)");

  const ref = process.env.DATABASE_URL.match(/postgres\.([a-z]{20})/)?.[1] ?? "?";
  console.log(`대상 Supabase 프로젝트: ${ref}`);
  if (DRY_RUN) console.log("── DRY RUN — 쓰지 않는다 ──\n");

  console.log("▶ ldongCode2 (lDongListYn=Y) 국문·영문 각 1회 호출");
  const ko = await fetchLdong(KOR_BASE, "KorService2");
  const en = await fetchLdong(ENG_BASE, "EngService2");
  console.log(`  국문 ${ko.length}행 · 영문 ${en.length}행`);

  const { sidos, signgus, absorbed } = buildTargets(ko, en);
  console.log(`  → 시도 ${sidos.length} · 시군구 ${signgus.length} · 일반시 ${absorbed.size} (구 ${ko.filter((r) => r.lDongSignguNm.includes(" ")).length}개 흡수)`);
  console.log(`  → 목표 Area ${sidos.length + signgus.length}행\n`);

  const existing = await prisma.area.findMany({
    select: { id: true, nameKo: true, nameEn: true, level: true, parentId: true },
  });
  console.log(`기존 Area ${existing.length}행`);

  // 매핑표를 코드로 푼다 — 이름이 안 풀리면 여기서 죽는다
  const sidoByNameKo = new Map(sidos.map((s) => [s.nameKo, s]));
  const signguByKey = new Map(signgus.map((s) => [s.key, s]));

  type Resolved = { areaId: string; nameKo: string; kind: "sido" | "signgu"; target: TargetSido | TargetSigngu };
  const resolved: Resolved[] = [];
  for (const [nameKo, m] of Object.entries(MANUAL_MATCH)) {
    const area = existing.find((a) => a.nameKo === nameKo);
    if (!area) throw new Error(`매핑표의 기존 Area "${nameKo}" 가 DB 에 없다`);
    if (m.signguNm === null) {
      const sido = sidoByNameKo.get(m.regnNm);
      if (!sido) throw new Error(`매핑표 "${nameKo}" → 시도 "${m.regnNm}" 를 ldongCode2 에서 못 찾았다`);
      resolved.push({ areaId: area.id, nameKo, kind: "sido", target: sido });
    } else {
      const sg = signguByKey.get(`${m.regnNm}/${m.signguNm}`);
      if (!sg) throw new Error(`매핑표 "${nameKo}" → "${m.regnNm} ${m.signguNm}" 를 ldongCode2 에서 못 찾았다`);
      resolved.push({ areaId: area.id, nameKo, kind: "signgu", target: sg });
    }
  }
  const matchedSidoKeys = new Set(resolved.filter((r) => r.kind === "sido").map((r) => (r.target as TargetSido).key));
  const matchedSignguKeys = new Set(resolved.filter((r) => r.kind === "signgu").map((r) => (r.target as TargetSigngu).key));
  const unmatched = existing.filter((a) => !(a.nameKo in MANUAL_MATCH));

  console.log(`  매칭 ${resolved.length}행 · 미매칭 ${unmatched.length}행 (${unmatched.map((a) => a.nameKo).join(" · ")}) — 미매칭은 건드리지 않는다\n`);

  const newSidos = sidos.filter((s) => !matchedSidoKeys.has(s.key));
  const newSigngus = signgus.filter((s) => !matchedSignguKeys.has(s.key));
  console.log(`새로 만들 행: 시도 ${newSidos.length} · 시군구 ${newSigngus.length} = ${newSidos.length + newSigngus.length}행`);
  console.log(`끝난 뒤 Area: ${existing.length} + ${newSidos.length + newSigngus.length} = ${existing.length + newSidos.length + newSigngus.length}행\n`);

  if (DRY_RUN) {
    console.log("【갱신될 기존 행】");
    console.log("  nameKo   현재            → level  regn    lDongSignguCds");
    console.log("  " + "─".repeat(78));
    for (const r of resolved) {
      const area = existing.find((a) => a.id === r.areaId)!;
      if (r.kind === "sido") {
        const t = r.target as TargetSido;
        console.log(`  ${area.nameKo.padEnd(8)} lv${area.level} ${(area.parentId ? "parent있음" : "parent없음").padEnd(11)} → lv0    ${t.regnCd.padEnd(7)} []`);
      } else {
        const t = r.target as TargetSigngu;
        const before = `lv${area.level} ${area.parentId ? "parent있음" : "parent없음"}`;
        console.log(`  ${area.nameKo.padEnd(8)} ${before.padEnd(15)} → lv1    ${t.regnCd.padEnd(7)} [${t.signguCds.join(",")}]  parent=${t.nameKo.replace(/(시|군|구)$/, "")}가 속한 시도`);
      }
    }

    console.log("\n【일반시 13곳의 lDongSignguCds】");
    for (const s of signgus.filter((s) => absorbed.has(`${s.regnCd}/${s.signguCd}`))) {
      const sido = sidos.find((x) => x.regnCd === s.regnCd)!;
      console.log(`  ${sido.nameKo.padEnd(10)} ${s.nameKo.padEnd(7)} (${s.signguCd}) → [${s.signguCds.map((c) => `"${c}"`).join(",")}]`);
    }

    console.log("\n【새로 만들 시도】");
    for (const s of newSidos) console.log(`  ${s.regnCd.padEnd(7)} ${s.nameKo.padEnd(12)} ${s.nameEn}`);

    console.log("\n【새로 만들 시군구 — 앞 10행】");
    for (const s of newSigngus.slice(0, 10)) {
      console.log(`  ${s.regnCd}/${s.signguCd.padEnd(6)} ${s.nameKo.padEnd(10)} ${s.nameEn.padEnd(22)} [${s.signguCds.join(",")}]`);
    }
    console.log(`  … 총 ${newSigngus.length}행`);

    await prisma.$disconnect();
    return;
  }

  // ── 쓰기 ───────────────────────────────────────────────────────────────────
  // 시도를 먼저 확정해야 시군구의 parentId 를 붙일 수 있다

  const sidoAreaId = new Map<string, string>(); // regnCd → Area.id

  for (const r of resolved.filter((x) => x.kind === "sido")) {
    const t = r.target as TargetSido;
    await prisma.area.update({
      where: { id: r.areaId },
      data: { lDongRegnCd: t.regnCd, lDongSignguCds: [], level: 0, parentId: null },
    });
    sidoAreaId.set(t.regnCd, r.areaId);
  }
  for (const s of newSidos) {
    const created = await prisma.area.create({
      data: {
        nameKo: s.nameKo,
        nameEn: s.nameEn,
        level: 0,
        parentId: null,
        lDongRegnCd: s.regnCd,
        lDongSignguCds: [],
        sortOrder: s.sortOrder,
      },
      select: { id: true },
    });
    sidoAreaId.set(s.regnCd, created.id);
  }
  console.log(`✔ 시도 ${sidos.length}행 (갱신 ${resolved.filter((x) => x.kind === "sido").length} · 신규 ${newSidos.length})`);

  for (const r of resolved.filter((x) => x.kind === "signgu")) {
    const t = r.target as TargetSigngu;
    const parentId = sidoAreaId.get(t.regnCd);
    if (!parentId) throw new Error(`${t.nameKo} 의 시도(${t.regnCd}) Area 를 못 찾았다`);
    await prisma.area.update({
      where: { id: r.areaId },
      data: { lDongRegnCd: t.regnCd, lDongSignguCds: t.signguCds, level: 1, parentId },
    });
  }
  let created = 0;
  for (const s of newSigngus) {
    const parentId = sidoAreaId.get(s.regnCd);
    if (!parentId) throw new Error(`${s.nameKo} 의 시도(${s.regnCd}) Area 를 못 찾았다`);
    await prisma.area.create({
      data: {
        nameKo: s.nameKo,
        nameEn: s.nameEn,
        level: 1,
        parentId,
        lDongRegnCd: s.regnCd,
        lDongSignguCds: s.signguCds,
        sortOrder: s.sortOrder,
      },
    });
    created++;
  }
  console.log(`✔ 시군구 ${signgus.length}행 (갱신 ${resolved.filter((x) => x.kind === "signgu").length} · 신규 ${created})`);

  const total = await prisma.area.count();
  console.log(`\nArea 총 ${total}행`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("\n❌", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
