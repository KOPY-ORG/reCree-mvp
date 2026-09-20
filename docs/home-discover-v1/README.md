# Home · Discover 프로토타입 v1 (2026-09-20)

**레이아웃과 흐름 참고용이다. 이 코드를 그대로 옮기지 않는다.**

- 인라인 스타일, `[Post image]` 같은 자리 표시자, 색 값은 목업일 뿐이다
- 구현은 기존 컴포넌트를 쓴다 (PostCard, LabelBadge, PlaceListSheet, useSheetDrag, HScrollSection 등)
- 규칙과 결정은 명세 문서(docs/design/home-discover.md)가 기준이다. 프로토타입과 명세가 다르면 명세를 따른다
- 이 파일들은 디자인 캔버스 런타임(support.js) 없이는 브라우저에서 제대로 렌더되지 않는다. 마크업으로 읽는다

## 화면

| 파일 | 화면 |
|---|---|
| Main.html | 홈 · Hot 탭 (로그인) |
| Topic.html | 홈 · 토픽 탭 (BTS) |
| Topics.html | 구독 토픽 관리 시트 (+ 버튼) |
| Guest.html | 비로그인 · + 눌렀을 때 로그인 유도 |
| DiscoverCity.html | discover · 탐색 모드 · 시도 단위 · 필터 없음 |
| DiscoverDistrict.html | discover · 탐색 모드 · 시군구 단위 |
| List.html | discover · See all 목록 (지역 범위) |
| Result.html | discover · 결과 모드 (토픽·필터·검색 → 전국) |
| Category.html | discover · 카테고리 칩 목록 (지금 이 지역) |

## 핵심 원칙 (요약)

- 홈 = "무엇을" (토픽·시간), discover = "어디서" (지도 위치)
- discover 위쪽(검색·토픽 칩·필터) = 전국 범위 → 결과 모드
- discover 시트 안(지역 제목·카테고리 칩) = 지금 보는 지역
- 지역은 필터가 아니라 이동
- 홈 → discover 는 필터를 들고 간다 (토픽 지도 카드, 한반도 카드)
