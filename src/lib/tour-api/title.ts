// ─── "영문 (한글)" 제목 분리 ──────────────────────────────────────────────────
// EngService2 의 title 은 실측 표본 109건(locationBasedList2 40 · searchFestival2 50 ·
// areaBasedList2 19)이 전부 "영문 (한글)" 형태였다. 그래서 영문 응답의 국문은
// 번역해서 얻는 것이 아니라 문자열에서 떼어내는 것이다 — API 호출도 비용도 없다.
//
// 100% 였다고 해서 예외가 없다고 보지는 않는다. 형태가 다르면 원문을 그대로 두고
// 국문은 null 이다. throw 하지 않는다.

const HANGUL = /[가-힣]/;

export type SplitTitle = {
  /** 마지막 괄호 앞 영문. 형태가 다르면 원문 그대로다 */
  titleEn: string;
  /** 마지막 괄호 안 한글. 형태가 다르면 null */
  titleKo: string | null;
};

/**
 * 맨 끝 균형 괄호 그룹이 시작하는 위치. 닫히지 않으면 -1.
 *
 * 정규식이나 split 으로는 못 짠다. 실측 90건 중 6건이 중첩·복수 괄호다.
 *   "Seoul Sports Complex (Jamsil Sports Complex) (서울종합운동장(잠실종합운동장))"
 * split("(") 은 첫 괄호에서 끊고, /\(([^()]*)\)/ 는 안쪽 "잠실종합운동장" 을 집는다.
 * 뒤에서 깊이를 세면 이 여섯 건도 한 번에 맞는다.
 */
function lastGroupStart(s: string): number {
  if (!s.endsWith(")")) return -1;

  let depth = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s[i];
    if (c === ")") depth++;
    else if (c === "(") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1; // 여는 괄호가 모자란 깨진 문자열
}

/**
 * "The Westin Josun Busan (웨스틴 조선 부산)"
 *   → { titleEn: "The Westin Josun Busan", titleKo: "웨스틴 조선 부산" }
 *
 * 판정 기준은 "괄호 안에 한글이 섞여 있는가" 다. "전부 한글인가" 가 아니다 —
 * "GHOST(경기 한류 OST) 페스티벌" 처럼 영문이 섞여 들어온다.
 */
export function splitBilingualTitle(raw: string): SplitTitle {
  const s = raw.trim();
  const start = lastGroupStart(s);
  if (start < 0) return { titleEn: s, titleKo: null };

  const outer = s.slice(0, start).trim();
  const inner = s.slice(start + 1, -1).trim();

  // 괄호 앞이 비었거나(괄호가 전부다), 괄호 안에 한글이 없거나,
  // 괄호 앞에 한글이 남아 있으면(국문 응답을 잘못 넣은 것이다) 손대지 않는다.
  if (outer === "" || inner === "" || !HANGUL.test(inner) || HANGUL.test(outer)) {
    return { titleEn: s, titleKo: null };
  }
  return { titleEn: outer, titleKo: inner };
}

/**
 * 중복 판정용 국문 키. 괄호 그룹과 공백·구분자를 털어낸 값이다.
 *
 * 영문·국문 응답은 contentId 공간이 완전히 분리돼 있어(실측 교집합 0건) id 로는
 * 같은 곳을 못 찾는다. 좌표도 안 된다 — 실측에서 서로 다른 두 곳이 같은 좌표를 쓴다
 * ("로씨니" 와 "전통주갤러리" 가 126.985867,37.578456 로 같다).
 * 정규화한 국문 제목은 실측 표본에서 진짜 중복 12건을 잡고 오탐이 0건이었다
 * ("롯데월드 아이스링크" 와 "롯데월드 아이스링크 (실내)" 가 같은 키가 된다).
 */
export function koreanKey(titleKo: string | null): string | null {
  if (!titleKo) return null;

  let s = titleKo;
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(/\([^()]*\)/g, "");
  }
  s = s.replace(/[\s·ㆍ,.\-_]/g, "").toLowerCase();
  return s === "" ? null : s;
}
