# 떠 있는 표면 — 홈 기준 스타일

홈 리뉴얼(검색바 · 토픽 칩 · 하단 내비게이션 알약)에서 뽑은 규칙. 게시글 상세가 첫 적용처다.
색 · 폰트 · 브랜드는 바꾸지 않는다. 새 색도 없다 — 그림자 색 하나와 기존 팔레트만 쓴다.

## 홈에서 읽은 것

| 요소 | 배경 | 그림자 | 모서리 | 테두리 | 누름 |
|---|---|---|---|---|---|
| 검색바 `HomeSearchBar` | `bg-background` | `0 8 50 rgba(17,12,46,.15)` | full | 없음 | `active:opacity-70` |
| 토픽 칩 `HomeTabBar` | 선택 `bg-brand` / 기본 `bg-background` | 없음 | full, h-8 | 없음 | `active:opacity-70` |
| 지역 칩 `KoreaMapCard` | `bg-background` | `0 2 10 rgba(17,12,46,.12)` | full, h-38 | 없음 | `active:opacity-70` |
| 하단 알약 `BottomNav` | 흰색 93% + blur 12 | `0 12 32 rgba(17,12,46,.15)` | full | 흰색 17% (유리 가장자리) | `active:scale-95` |

## 규칙

1. **선을 긋지 않는다.** 바탕과의 구분은 그림자가 한다. 카드 안의 구분(버튼 · 지도 칸)은 면 `bg-muted` 이 한다.
2. **그림자 색은 하나** — `rgba(17,12,46,α)`. 위치가 높을수록(홀로 뜬 것일수록) 멀고 진하게, 흐름 안에 쌓이는 것일수록 옅게.
3. **선택은 브랜드색 하나로만 말한다.** 강조 카드도 테두리 대신 바탕(`bg-brand-sub3`)으로.
4. **컨트롤은 알약, 카드는 20px.** 버튼 · 칩은 `rounded-full`, 카드는 홈 지도 카드와 같은 20px.
5. **누름은 즉시.** 제자리 링크 · 칩은 `active:opacity-70`. 사진 · 영상 위에 뜬 아이콘 버튼은 opacity 로는 눌림이 안 보여 `.press-scale`(160ms, scale .94).

## 토큰 · 클래스 (`src/app/globals.css`)

| 이름 | 값 | 쓰는 곳 |
|---|---|---|
| `shadow-float` | `0 8px 50px rgba(17,12,46,.15)` | 홈 검색바 |
| `shadow-chip` | `0 2px 10px rgba(17,12,46,.12)` | 홈 지역 칩 |
| `shadow-floating-button` | `0 2px 10px rgba(17,12,46,.12)` | 화면 아래 뜨는 버튼 — View on Map · 맨 위로 (하단 내비 알약은 제외) |
| `shadow-card` | `0 6px 30px rgba(17,12,46,.08)` | `.surface-card` |
| `--radius-card` | `20px` | `.surface-card` |
| `ease-out-strong` | `cubic-bezier(.23,1,.32,1)` | 누름 · 사라짐 |
| `.surface-card` | 배경 + 20px + `shadow-card` | 상세의 Story · 위치 · recreeshot 추가 · 댓글 · 출처 링크(Bookmark · Netflix) |
| `.memo-card` | 연한 라임(`brand-sub3`) 종이, 그림자 없음, 오른쪽 위 18px 접힘(`brand` 55% + `brand-sub3`) | 상세 Fan To-Do |
| `.press-scale` | 160ms, `:active` scale .94, 모션 줄이기에서 끔 | 유튜브 소리 켜기 버튼 |
| `.photo-action` | 누르는 칸 44 · 보이는 원 32, 검정 30% + blur 5, 흰 아이콘 20 | 상세 사진 위 뒤로가기 · 공유 · 저장 · 더보기 |
| `.photo-action-camera` | 원 40, 회색 `rgba(40,40,46,.72)` + blur 8 | 상세 사진 우측 하단 recreeshot 추가 |

`shadow-card` 만 홈에 없던 값이다. 검색바 그림자를 큰 카드 여러 장에 그대로 깔면 번져 화면이 뿌옇게 되어,
같은 색으로 거리와 농도만 줄였다.

하단 알약은 토큰으로 옮기지 않았다. 유리 표면(흰색 93% + blur + 가장자리)이라 값이 다르고, `src/lib/bottom-nav.ts` 와 짝으로 묶여 있다.

## 사진 위 버튼

사진 위에는 선 없는 반투명 원만 둔다. 사진 위쪽 28% · 아래쪽 22% 에 검정 그라데이션(40% · 18%)을 깔아
밝은 사진에서도 흰 아이콘이 읽히게 하고, 사진 가운데는 어둡히지 않는다.
저장된 북마크는 원 색은 두고 아이콘만 라임으로 채운다.

`backdrop-filter` 는 표준 속성 하나만 적는다. `-webkit-` 를 같이 적으면 빌드(lightningcss)가 표준 쪽을 지워
Chrome 에서 blur 가 빠진다. 접두사는 빌드가 붙인다.
