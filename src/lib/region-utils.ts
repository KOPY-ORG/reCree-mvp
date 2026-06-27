// 추후 Area.isFeatured 또는 admin 관리로 승격 가능, 현재 MVP 하드코딩.
export const FEATURED_REGION_SLUGS = ["seoul", "busan"] as const;

type AreaLike = {
  nameEn: string | null;
  level: number;
  parent: { nameEn: string | null } | null;
};

/** nameEn → URL slug. null/빈값이면 null 반환. */
export function slugifyRegion(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  return name.toLowerCase();
}

/** place.area에서 도시 slug를 추출. level=0이면 자신, level=1이면 parent로 rollup. */
export function getPlaceRegionSlug(area: AreaLike | null | undefined): string | null {
  if (!area) return null;
  const name = area.level === 0 ? area.nameEn : (area.parent?.nameEn ?? null);
  return slugifyRegion(name);
}
