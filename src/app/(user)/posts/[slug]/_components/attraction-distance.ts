// ─── 거리 표기 ────────────────────────────────────────────────────────────────
// 목록 카드와 상세 시트가 같은 문자열을 쓴다.
//
// 1km 미만은 m, 이상은 km 소수 한 자리다. 반경이 5km 라 한 자리면 끝까지 구분된다.
// m 구간은 10m 단위로 반올림한다 — "347 m" 는 거짓 정밀이고, 걸어갈지 말지를
// 정하는 데 10m 아래는 쓸모가 없다. 0 으로 떨어지지 않게 최소 10m 로 둔다.

export function formatDistance(meters: number | null): string | null {
  if (meters === null || !Number.isFinite(meters) || meters < 0) return null;
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
