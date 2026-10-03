// KoreaMapCard 의 계산 도우미
import { HOTSPOT_MIN_R, HOTSPOT_MAX_R } from "@/lib/korea-projection";
import { getPlaceRegionSlug } from "@/lib/region-utils";

/**
 * 반지름을 그대로 불투명도로 옮긴다. 장소 수를 로그로 누른 결과가 반지름이므로
 * 여기서 다시 count 를 보면 두 축이 서로 다른 곡선을 타게 된다.
 *
 * 받는 r 은 배율을 걸기 전 값이다. 키웠다고 더 진해지면 크기와 진하기가 같은 말을
 * 두 번 하게 되고, 작은 시도가 큰 시도보다 옅어 보이는 순서도 깨진다.
 */
export function haloOpacity(r: number, min: number, max: number): number {
  const t = (r - HOTSPOT_MIN_R) / (HOTSPOT_MAX_R - HOTSPOT_MIN_R);
  return min + (max - min) * t;
}

/**
 * discover 의 ?region= 은 Area.nameEn 을 소문자로 내린 값과 정확히 비교된다
 * (region-utils.ts 의 slugifyRegion). 같은 규칙을 두 벌로 적지 않으려고
 * 장소가 아니어도 그 함수를 그대로 쓴다 — 규칙이 바뀌면 같이 바뀌어야 한다.
 */
export function regionParam(areaNameEn: string): string | null {
  return getPlaceRegionSlug({ nameEn: areaNameEn, level: 0, parent: null });
}
