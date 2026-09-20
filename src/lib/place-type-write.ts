// 장소 타입을 두 저장소에 같은 값·같은 순서로 쓰는 공용 경로 — 서버 전용.
//
// Place.placeTypes(String[]) 는 옛 코드가 읽고, PlacePlaceType 은 순서와 FK 를 들고 있다.
// 한쪽만 쓰면 지도 카테고리가 장소를 놓친다. 그래서 어드민 폼과 시트 가져오기가
// 여기 한 곳을 같이 쓴다.
//
// place-types.ts 와 나눠 둔 이유는 그쪽이 클라이언트 컴포넌트에서도 쓰이기 때문이다 —
// 여기에 prisma 가 들어오면 그 파일을 함께 끌고 들어간다.
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** 이름으로 찾은 마스터 행. 배열 순서가 곧 sortOrder 이고 0 번이 대표다 */
export type ResolvedPlaceType = { id: string; name: string };

/**
 * 폼·시트가 준 이름 배열을 PlaceType 행으로 바꾼다.
 *
 * id 가 아니라 이름으로 찾는 이유는 Place.placeTypes 가 이름 문자열 배열이기 때문이다 —
 * 두 저장소가 같은 값을 같은 순서로 들고 있어야 옛 코드와 새 코드가 어긋나지 않는다.
 */
export async function resolvePlaceTypes(
  names: string[],
): Promise<{ error: string } | { types: ResolvedPlaceType[] }> {
  if (names.length === 0) return { error: "장소 유형을 1개 이상 선택해주세요." };

  const duplicated = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];
  if (duplicated.length > 0) {
    return { error: `장소 유형이 중복됐습니다: ${duplicated.join(", ")}` };
  }

  const rows = await prisma.placeType.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true, nameKo: true, category: true, isDefault: true, isActive: true },
  });
  const byName = new Map(rows.map((r) => [r.name, r]));

  const unknown = names.filter((n) => !byName.has(n));
  if (unknown.length > 0) {
    return { error: `장소 유형 마스터에 없는 이름입니다: ${unknown.join(", ")}` };
  }

  const selected = names.map((n) => byName.get(n)!);

  const inactive = selected.filter((t) => !t.isActive);
  if (inactive.length > 0) {
    return { error: `비활성 장소 유형은 쓸 수 없습니다: ${inactive.map((t) => t.nameKo).join(", ")}` };
  }

  // 같은 카테고리에 기본값과 구체 타입이 같이 오면 거부한다.
  // "식당"은 "한식"을 모르는 상태를 뜻하므로, 둘을 함께 붙이면 서로를 부정한다.
  // 어드민 폼은 이 상태에 닿기 전에 화면에서 정리하지만, 서버 검증은 그대로 둔다 —
  // 시트 가져오기·스크립트 등 폼을 거치지 않는 경로가 있다.
  for (const base of selected.filter((t) => t.isDefault)) {
    const specific = selected.filter((t) => t.category === base.category && !t.isDefault);
    if (specific.length > 0) {
      return {
        error: `같은 카테고리에서 기본값과 구체 타입을 함께 고를 수 없습니다: ${base.nameKo} + ${specific
          .map((t) => t.nameKo)
          .join(", ")}`,
      };
    }
  }

  return { types: selected.map((t) => ({ id: t.id, name: t.name })) };
}

/**
 * 연결 행을 다시 깐다 — 순서가 바뀐 경우까지 한 규칙으로 덮는다.
 * 호출부의 트랜잭션 안에서 돌아야 Place.placeTypes 와 갈라지지 않는다.
 */
export async function writePlacePlaceTypes(
  tx: Prisma.TransactionClient,
  placeId: string,
  types: ResolvedPlaceType[],
): Promise<void> {
  await tx.placePlaceType.deleteMany({ where: { placeId } });
  if (types.length === 0) return;
  await tx.placePlaceType.createMany({
    data: types.map((t, i) => ({ placeId, placeTypeId: t.id, sortOrder: i })),
  });
}

/**
 * 시트의 map_pin_icon 처럼 사람이 적은 이름을 마스터 이름으로 맞춘다.
 * 대소문자와 공백을 무시하고 대조하며, 찾지 못한 값은 unknown 으로 돌려준다.
 */
export async function matchPlaceTypeNames(
  raw: string[],
): Promise<{ names: string[]; unknown: string[] }> {
  const key = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const master = await prisma.placeType.findMany({ select: { name: true } });
  const byKey = new Map(master.map((m) => [key(m.name), m.name]));

  const names: string[] = [];
  const unknown: string[] = [];
  for (const value of raw) {
    const hit = byKey.get(key(value));
    if (hit === undefined) unknown.push(value);
    else if (!names.includes(hit)) names.push(hit);
  }
  return { names, unknown };
}
