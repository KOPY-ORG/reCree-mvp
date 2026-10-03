// "뒤로 가면 우리 사이트로 돌아가는가" 판정 — 상세의 뒤로가기 버튼이 쓴다.
//
// history.length 만으로는 모른다. 검색 결과에서 같은 탭으로 들어오면 길이가 2 이상인데
// 뒤로가 검색 결과로 나간다. 그래서 이 탭에서 앱 안 이동이 있었는지를 InAppHistoryTracker 가 적어 둔다.
// 전체 새로 고침(외부 링크로 들어온 순간 포함)에서 지우고, 앱 안에서 경로가 바뀔 때 켠다.

export const IN_APP_NAV_KEY = "recree:in-app-nav";

export function canGoBackInApp(): boolean {
  if (typeof window === "undefined" || window.history.length <= 1) return false;
  try {
    if (sessionStorage.getItem(IN_APP_NAV_KEY) === "1") return true;
  } catch {
    // 저장소를 못 쓰면 리퍼러로만 판정한다
  }
  // 우리 사이트의 다른 페이지에서 전체 로드로 넘어온 경우 (새 창 열기 등)
  try {
    return !!document.referrer && new URL(document.referrer).origin === window.location.origin;
  } catch {
    return false;
  }
}
