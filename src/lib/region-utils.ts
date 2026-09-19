type AreaLike = {
  nameEn: string | null;
  level: number;
  parent: { nameEn: string | null } | null;
};

function slugifyRegion(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  return name.toLowerCase();
}

/** place.area에서 도시 slug를 추출. level=0이면 자신, level=1이면 parent로 rollup. */
export function getPlaceRegionSlug(area: AreaLike | null | undefined): string | null {
  if (!area) return null;
  const name = area.level === 0 ? area.nameEn : (area.parent?.nameEn ?? null);
  return slugifyRegion(name);
}

/** place.area에서 도시 원문 표시명(nameEn)을 추출. slug와 동일한 분기, 소문자화 없음. */
export function getPlaceRegionLabel(area: AreaLike | null | undefined): string | null {
  if (!area) return null;
  if (area.level === 0) return area.nameEn ?? null;
  return area.parent?.nameEn ?? null;
}

// 시군구는 rollup 하지 않는다 — 시도(level 0)에 직접 붙은 장소는 시군구가 없는 것이지
// 시도가 시군구인 것이 아니다. 세종이 그 유일한 경우다.

/** place.area에서 시군구 slug를 추출. level=1이 아니면 null. */
export function getPlaceDistrictSlug(area: AreaLike | null | undefined): string | null {
  if (!area || area.level !== 1) return null;
  return slugifyRegion(area.nameEn);
}

/** place.area에서 시군구 원문 표시명(nameEn)을 추출. slug와 동일한 분기, 소문자화 없음. */
export function getPlaceDistrictLabel(area: AreaLike | null | undefined): string | null {
  if (!area || area.level !== 1) return null;
  return area.nameEn ?? null;
}
