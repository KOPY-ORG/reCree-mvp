// 추후 Area.isFeatured 또는 admin 관리로 승격 가능, 현재 MVP 하드코딩.
export const FEATURED_REGION_SLUGS = ["seoul", "busan"] as const;

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
