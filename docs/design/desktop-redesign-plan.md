# PC(lg+) 재설계안 v2 — 사용자 화면 전체

> 작성 2026-10-03 · 상태: **일부 구현** (feature/recree-desktop)
> 구현됨: 청크 1(폭 · 여백 토큰, `PageContainer`, discover 문서 높이), `PageTitle`, 청크 3(이중 헤더 정리, 읽기 화면 상단 바),
> PC 상단 바 `DesktopHeader`(§3.1), 모바일 하단 알약에 Journeys, 게시글 상세 SNS 임베드(`docs/recon/social-embed.md`).
> 남은 것: 글자 토큰 · 나머지 공통 부품(청크 2), 청크 4~10. 보류 항목은 `docs/recon/cleanup-backlog.md`.
>
> 범위: `lg`(1024) 이상의 사용자 화면 전체. `< 768` 모바일은 픽셀 단위로 그대로, 768–1023 태블릿은 지금 동작 그대로.
> 브랜드: 라임 `--brand` #D3FD52, 라임 위 글자 검정, 폰트(출시본 GeistSans), 표기(reCree, recreeshot)는 바꾸지 않는다. 새 색 없음.
> 선행 문서: `desktop-layout.md`(§14–17 레퍼런스 실측, 상단 바 결정) · `surface.md`(홈 기준 표면 규칙).
> v1(홈 · discover · 게시글 상세 3화면)을 이 문서가 대체한다. v1 의 원칙 P1–P7 과 검색창 · 칩 · 카드 규칙은 §3 에 그대로 옮겼다.
> 게시글 상세는 `docs/design/post-detail-pc-mock.html` 대로 **구현 완료**. 구조는 건드리지 않고 공통 폭 · 여백 · 글자 토큰만 적용한다(§4.1).

---

## 1. 원칙 (v1 에서 이어짐)

| # | 원칙 | 이번 적용 |
|---|---|---|
| P1 | **정렬축은 하나.** 로고 왼쪽 선 = 본문 시작선, 계정 아이콘 오른쪽 선 = 본문 끝선 | 상단 바와 wide 본문이 같은 `--page-gutter` · `--w-wide` 를 쓴다 |
| P2 | **폭은 세 단계.** 둘러보기는 넓게, 읽기는 약 1280 에서 멈춤, 집중은 좁게 | wide · reading · narrow 토큰 (§3.1) |
| P3 | **검색 · 필터는 목록 바로 위 한 줄** | 홈 검색 + 토픽 칩 한 줄 (§4.2) |
| P4 | **목록 왼쪽 · 지도 오른쪽, 지도만 고정** | discover 유지 · 여정 상세에 같은 문법 (§4.8) |
| P5 | **상세 = 미디어 + 짧은 옆 열** | recreeshot 상세 · 여정 상세 · 이벤트 상세 |
| P6 | **"어디인가"는 첫 화면에** | 게시글 상세(완료), 여정 상세 지도 |
| P7 | **같은 물건은 어디서나 같은 모양** | 공통 부품 6종 (§3.5) |

추가 원칙
- **P8 화면은 하나의 헤더.** lg 에서 상단 바(64)가 있으면 페이지의 모바일 헤더(`.app-header` 줄 · 뒤로가기 바)는 숨고, 제목은 본문 안의 페이지 제목 부품이 맡는다.
- **P9 넓어지면 열을 늘린다.** 카드 폭은 고정 범위 안에서 움직이고, 남는 폭은 열 수로 받는다. 가로 줄도 정수 장수로 끊는다.

---

## 2. 현재 평가 (critique, 2026-10-03)

방법
- A 디자인 리뷰: 별도 에이전트가 playwright 로 localhost:3000 을 1024 · 1280 · 1440 · 1920 에서 실측
- B 코드 인벤토리 2건(셸 · 헤더 / 부품 · 글자) + `impeccable detect`
- 로그인 필요 화면(/profile, /profile/edit, /onboarding, /journeys/new · edit)은 화면 실측 못 함 — 코드로만 판단
- /events 상세는 공개된 컬렉션이 없어(`eventCollections: []`) 실측 못 함
- detector: 경고 2건, 둘 다 v1 에서 의도된 것으로 판정(Instagram 폴백 그라데이션, 모바일 시트 height 전환)

### 2.1 페이지 목록 · 헤더 · 폭 (lg, 1440 실측)

> §2 는 설계 당시(2026-10-03, 구현 전) 기록이다. 해결된 것은 §2.2 표의 "지금" 열에 적었다.

| 화면 | 종류 | 상단 바 | 페이지 자체 헤더 (lg 에서도 보임) | 본문 좌/우 (바 40/1385) | 지금 폭 |
|---|---|---|---|---|---|
| `/feed` | wide | O | 검색 + 칩 sticky 126 (보조 바, 이중 아님) | 40 / 1385 | 1440 셸 |
| `/discover` | wide(전폭) | O | 없음 | **0–599 패널(카드 x16) / 지도 1413** | 화면 전체 |
| `/recreeshot` | wide | O | **AppHeader "reCree" 48 — 이중** | 40 / 1385 | 1440 |
| `/recreeshot/[id]` | reading | **X** | 모바일 바(← ⋮) 48 | 376–1048 | 672 |
| `/recreeshot/new`, `/[id]/edit` | narrow | X | 편집기 바 (한 개) | — | 672 |
| `/journeys` | wide | O | **"Journeys" 바 48 — 이중** | 40 / … | 1440, 카드 2장 뒤 75% 빈칸 |
| `/journeys/[id]` | reading | O | 배너 위 뒤로 버튼 | **18 / 1407** | 1440 전폭, lg 처리 없음 |
| `/journeys/new`, `/[id]/edit` | narrow | X | 편집기 바 (한 개) | — | 672 |
| `/saved` | wide | O | **"Saved" 바 48 + 탭 sticky — 이중** | 바 40 · 본문 672 가운데 | 672 |
| `/shop` | wide | O | **"Shop" 바 48 + 탭 45 — 이중(고정 157)** | 40 / 1385 | 1440, 탭 713 × 2 |
| `/topics` | wide | O | **"Your topics" + X 바 — 이중** | 393–1033 | 672 |
| `/topics/[slug]` | wide | O | 배너 위 투명 뒤로 바 | **히어로 x16 · 그리드 x40** | 1440 |
| `/profile` | wide | O | **"reCree" + 메뉴 바 — 이중** (코드) | — | 1024 가운데 |
| `/profile/following` | wide | O | **← "Following" 바 — 이중** | 가운데 | 672 |
| `/profile/edit` | narrow | X | ← 행 (한 개) | — | 448 |
| `/events/…` | reading | O | 포스터 위 ← · 언어 · 공유 | (코드) | 1168, 2열 |
| `/posts/[slug]` | reading | O | lg 에서 숨김 ✓ | 113 / 1313 | 1200 (완료) |
| `/login` | narrow | O | **AppHeader "reCree" — 이중, "reCree" 3번** | 가운데 | 384 |
| `/onboarding` | narrow | X | "reCree" 행 (한 개) | — | 672 |
| `/policy/[type]` | reading | **X** | ← 제목 바 | 349–1072 | 768 |

- **이중 헤더 8곳:** `/recreeshot` · `/login`(AppHeader), `/saved`(SavedHeader), `/shop`(ShopHeader), `/journeys`, `/topics`, `/profile`, `/profile/following`
  - 원인: `.app-header` 가 lg 에서 `top: var(--top-nav-space)` 로 상단 바 아래에 다시 붙는다(당시 `globals.css:239`, 지금 lg 블록의 `.app-header` 규칙). `lg:hidden` 이 있는 곳은 게시글 상세 하나
  - 해결: AppHeader · SavedHeader · ShopHeader · TopicsHeader · journeys · ProfileView · following · policy 헤더에 lg 숨김. 남은 것은 `journeys/loading.tsx` (backlog)
- **상단 바가 사라지는 읽기 화면 2곳:** `/recreeshot/[id]`, `/policy/[type]` — `isBottomNavHidden`(모바일 하단 알약 규칙)을 lg 상단 바가 그대로 따른다
  - 해결: 상단 바는 `isDesktopHeaderHidden`(`src/lib/bottom-nav.ts`)으로 따로 판정한다. 숨기는 곳은 편집기 · 온보딩뿐
- 본문 왼쪽 시작선: 40 / 16 / 18 / 113 / 376 / 393 — 페이지마다 다르다
- 1920 에서 셸이 1440 에 묶여 로고 x=273, 좌우 각 233 이 빈다
- 가로 스크롤: 1024 · 1280 · 1440 · 1920 전부 0 ✓

### 2.2 우선순위 문제

| 등급 | 문제 | 근거 | 지금 |
|---|---|---|---|
| **P0** | 이중 헤더 8곳, 읽기 화면 2곳에서 상단 바 사라짐 | §2.1 | 해결 (청크 3) |
| **P0** | discover 문서가 64 세로 스크롤(docH 964 / 900) | 당시 `layout.tsx:22` lg 위 여백 + 안쪽 기둥 최소 높이 100dvh | 해결 (청크 1, 기둥 최소 높이에서 바 높이를 뺌) |
| **P1** | 정렬축 없음. 시작선 6종, 1920 에서 1440 박스 | §2.1 | 기둥 · 상단 바 · gutter 는 해결 (청크 1). 페이지별 시작선은 청크 4~ |
| **P1** | 모바일을 늘린 컨트롤: "Make it mine" 1389×54, 토픽 Follow 1393×36, shop 탭 713×2, 여정 장소 줄 1389 | 1440 실측 | 남음 |
| **P1** | 672 기둥이 넓은 화면에 떠 있음: /topics, /saved, /following, /recreeshot/[id] | 1440 실측 | 남음 |
| **P2** | 부품이 페이지마다 따로: 페이지 제목 8벌 복붙(`.app-header` 안쪽 `h-12 px-4`), 섹션 제목 17곳 수작업, 탭 2벌 복붙, 빈 화면 18벌, 칩 8종 · 높이 4종, 카드 모서리 6종 · 그림자 3체계 | §2.3 | 페이지 제목만 `PageTitle` 로. 나머지 남음 |
| **P2** | 빈 캔버스: /journeys 카드 2장, 홈 Fresh Drops 465 카드 2열 | 1440 실측 | 남음 |
| **P3** | 글자 크기: 사용자 코드에 26종(임의값 10.5px 17곳, 13px 30곳 …), 이벤트 상세 inline `fontSize` 34곳. 한 화면에 11종 | §2.4 | 남음 (글자 토큰 미정의) |
| **P3** | discover: 칩 줄 사이 50 빈칸, 카테고리 칩 잘림, 저장 아이콘이 카드 위로 5 삐져나옴 | 실측 | 확인 안 함 |

### 2.3 부품 비교표

| 부품 | 지금 | 페이지별 차이 |
|---|---|---|
| 페이지 제목 | 공통 없음 | 헤더 바 `text-base` 700(journeys · saved · shop) / 600(topics · following) / `text-sm`(policy). 본문 h1: 토픽 상세 30, 여정 상세 25, 이벤트 25(inline), 로그인 30, 게시글 lg 28. 오른쪽 행동: New 알약 · X · Menu · Follow 제각각 |
| 섹션 제목 | `HScrollSection` 한 곳(18/700 + "More ›" + lg ‹ ›) | 수작업 17곳: 18/700, 16/600(프로필), 14/700(discover · 토픽 · 댓글), 16.5/800(이벤트 inline), 15/700(편집기). 링크 문구 "More" / "See all ›" / "See all N" |
| 탭 | 공통 없음 | 밑줄 탭 2벌 복붙(saved 가로 스크롤 · shop flex-1), 홈 토픽 알약(링크) |
| 사진 카드 | PostCard · ShopCard · CourseCard `rounded-lg`(10), 배너 `rounded-xl` + 검정 그림자, recreeshot 타일 r0 + `shadow-md` | 가로 줄 카드 폭 고정 px 9종(120 · 140 · 150 · 160 · 180 · 200 · 240, %: 32 · 42 · 46 · 85 · 90) |
| 목록 카드 | `.surface-card` 는 게시글 상세 6곳뿐 | saved 행(구분선) · discover r18 테두리 · 이벤트 r18 노치 · Perk r14 |
| 빈 화면 | 공통 없음 | 18벌. 로그인 유도 3벌은 같음(아이콘 40 · 18/600 · 14 · 라임 알약) — **이것을 기준으로** |
| 그리드 | 공통 없음 | `grid-cols-2 gap-3 md:3 lg:4 xl:5` 4벌 복붙(recreeshot · shop · 토픽 상세 · 여정), saved `md:3` 에서 멈춤, 프로필 `lg:4` |
| 검색창 | HomeSearchBar 42 · DiscoverSearchBar 40 · EventSearchBar 40 · TopicsBrowser 입력 40 | 그림자 `shadow-float` / `shadow-md` / 없음(`bg-muted`) |
| 칩 | `TOPIC_CHIP_*`(32 · 15/500) | shop 태그 32 · 12/600 검정 선택, discover 카테고리 36 · 14/600, 필터 28 · 12/600, 지역 38 |

### 2.4 글자 크기 분포 (사용자 `.tsx`)

| 클래스 | 개수 | | 클래스 | 개수 |
|---|---|---|---|---|
| `text-sm` 14 | 279 | | `text-[13px]` | 30 |
| `text-xs` 12 | 136 | | `text-[11px]` | 24 |
| `text-base` 16 | 56 | | `text-[10px]` | 19 |
| `text-lg` 18 | 21 | | `text-[10.5px]` | 17 |
| `text-xl` 20 | 10 | | `text-[12.5px]` · `text-[11.5px]` | 10 · 10 |
| `text-2xl` · `3xl` · `4xl` | 4 · 2 · 2 | | `text-[15px]` · 기타 11종 | 8 · 각 1–6 |

- `@theme` 에 `--text-2xs`(11) ~ `--text-2xl`(24) 7단이 있다. `text-2xs` 사용 0
- lg 반응형 글자는 게시글 상세에만 있다(`lg:text-base` 5, `lg:text-[28px]` 2 등)

### 2.5 휴리스틱 점수 (A)

| # | 휴리스틱 | 점수 | 핵심 |
|---|---|---|---|
| 1 | 시스템 상태 | 3 | |
| 2 | 현실과 일치 | 3 | |
| 3 | 통제 · 자유 | 2 | 직접 URL 로 들어온 /topics 에 X, 읽기 화면 2곳 상단 바 없음 |
| 4 | 일관성 | **1** | 헤더 패턴 · 시작선이 페이지마다 다름 |
| 5 | 오류 예방 | 3 | |
| 6 | 재인 | 3 | |
| 7 | 효율 | 2 | |
| 8 | 미학 · 최소 | 2 | "reCree" 반복(로그인 3번), 제목 중복, 늘어난 버튼 |
| 9 | 오류 복구 | 3 | 빈 화면 · 로그인 유도는 일관됨 |
| 10 | 도움말 | 2 | |
| | **합계** | **24 / 40** | |

잘 된 것 (지킨다)
- 홈 본문 + sticky 지도 카드, 가로 줄 ‹ ›, discover 목록 + 지도 분할, 게시글 상세 두 열
- recreeshot · shop 그리드가 넓어질 때 열이 늘어난다
- 로그인 유도 빈 화면 3벌이 이미 같은 모양

---

## 3. 공통 체계

### 3.1 폭 · 여백 토큰 (lg 이상에서만 값이 생긴다)

```
--page-gutter     32px (1024–1279) · 40px (1280–1439) · 48px (1440–1919) · 80px (1920+)
--w-wide          1760px   둘러보기 본문 · 상단 바 안쪽의 최대 폭 (1920 에서 꽉 참, 그보다 넓으면 가운데)
--w-reading       1200px   읽기 본문 최대 폭 (+ 좌우 gutter ≈ 1280 에서 멈춤)
--w-narrow        42rem    집중 화면 (지금 data-narrow-layout 의 672 그대로)
```

- **1440 고정 셸을 없앤다.** `layout.tsx` 기둥의 최대 폭은 `--app-col-w` 를 그대로 쓰고, lg 에서 그 값이 `--w-wide` + 2 × `--page-gutter` 가 된다(globals.css lg 블록). 폭은 각 페이지가 위 3토큰 중 하나로 정한다
  - `--app-col-w` 는 모바일 540 · md 42rem 이다. fixed 요소 10곳(ScrollToTop · FAB · 시트 등)도 같은 값을 쓴다. 편집기(`data-narrow-layout`)에서는 lg 에서도 `--w-narrow`
- **상단 바 안쪽** = 최대 폭 `--app-col-w` + 좌우 여백 `--page-gutter`. 결과적으로 wide 본문과 같은 좌우 끝선
  - 읽기 화면에서도 바는 wide. 본문만 reading 폭에서 가운데
- **상단 바는 별도 컴포넌트 `DesktopHeader`** (`src/app/(user)/_components/DesktopHeader.tsx`, 구현 후 결정). 처음 안(BottomNav 를 lg 에서 바로 바꾸고 디자인은 그대로)과 다르다
  - 왼쪽: 로고 reCree + 글자 메뉴 Home · Map · Journeys · recreeshots · Shop (아이콘 18 + 글자)
  - 현재 표시: 검정 굵은 글자 + 바 아래 끝 검정 밑줄 2px. 바 안에 라임은 쓰지 않는다. Create 버튼 없음
  - 오른쪽: 검색(/discover 링크) · 계정. 로그인 = 아바타 드롭다운(Profile · Saved · Following · Log out), 로그아웃 = 검정 Log in 알약
  - 높이 64. 바가 있으면 `html:has([data-desktop-header])` 로 `--top-nav-space` 가 64 가 된다
  - 모바일 하단 알약(BottomNav)은 lg 에서 숨는다. 모바일 알약에도 Journeys 가 들어갔다(왼쪽 Profile · Shop · recreeshots · Journeys, 오른쪽 Home · Map)
- 실제 위치 (스크롤바 15 제외)

| 화면 폭 | gutter | wide 본문 | reading 본문 |
|---|---|---|---|
| 1024 | 32 | 32 – 977 (945) | 32 – 977 (945) |
| 1280 | 40 | 40 – 1225 (1185) | 40 – 1225 (1185) |
| 1440 | 48 | 48 – 1377 (1329) | 112 – 1312 (1200) |
| 1920 | 80 | 80 – 1825 (1745) | 352 – 1552 (1200) |
| 2560 | 80 | 392 – 2152 (1760) | 672 – 1872 (1200) |

- 게시글 상세: 지금 `81rem` + `px-8` + 블록 `px-4` = 본문 1200 이다. reading 토큰과 같은 값이라 1440 · 1920 에서는 모양이 그대로이고, 1024 · 1280 의 바깥 여백만 48 → 32 · 40 이 된다
- 클래스 형태: 페이지 바깥 래퍼 하나(`PageContainer`)가 lg 에서 가운데 정렬 · 최대 폭(폭 토큰 + 좌우 gutter) · 좌우 여백 gutter 를 갖는다.
  - 문서에 Tailwind 클래스 모양의 글자를 그대로 적지 않는다. Tailwind 가 docs 까지 훑어 그 글자로 CSS 를 만들고, 잘못된 값이면 dev 전체가 500 이 된다(2026-10-03 실제로 겪음). 지금은 globals.css 의 `@source not` 으로 docs/ 를 스캔에서 뺐지만 규칙은 유지한다
  - 래퍼 안의 콘텐츠가 모바일용 `px-4` 를 가진 경우는 lg 에서 `lg:px-0` 으로 지운다(게시글 상세처럼 블록이 px-4 를 품은 곳은 gutter 에서 16 을 빼서 맞춘다)

### 3.2 간격 단위 (lg)

4 기반. lg 에서 쓰는 값: `8 · 12 · 16 · 24 · 32 · 48`.

| 이름 | 값 | 관계 |
|---|---|---|
| `--space-page-top` | 32 | 상단 바 → 첫 콘텐츠 (페이지 제목 · 검색 줄 · 미디어) |
| (섹션 사이) | 48 | 섹션 사이. 토큰은 처음 쓸 때 만든다 (`--space-section` 은 쓰는 곳이 없어 지웠다) |
| (클래스) | 16 | 섹션 제목 → 내용, 카드 사이 |
| (클래스) | 24 | 페이지 제목 → 탭 · 칩 줄 → 본문 |

- 게시글 상세의 위 여백(지금 24)은 32 로 맞춘다(구조 변경 아님)
- discover 는 지도 화면이라 위 여백 16 예외

### 3.3 글자 토큰 (lg 이상에서만 한 단계 커진다)

| 토큰 | 모바일 = 지금 | lg | 쓰는 곳 |
|---|---|---|---|
| `text-page-title` | 20 (`text-xl`) | 28 | 페이지 제목 부품 h1, 상세 h1 |
| `text-section-title` | 18 (`text-lg`) | 22 | 섹션 제목 부품 |
| `text-card-title` | 14 (`text-sm`) | 16 | 카드 제목 |
| `text-body` | 14 (`text-sm`) | 16 | 본문 · 목록 설명 |
| `text-meta` | 12 (`text-xs`) | 14 | 부제 · 장소 · 분류 · 개수 · 날짜 |

- 구현: `@theme` 에 `--text-*` 5개를 두고 lg 미디어쿼리에서 값만 바꾼다. 행간도 짝으로 둔다. 폰트 · 굵기 · 색 클래스는 손대지 않는다
- **교체 규칙: 모바일 값이 같은 것만 바꾼다.** `text-sm` 인 카드 제목 → `text-card-title` 처럼 모바일 크기가 정확히 같을 때만. `text-[13px]` · `text-[10.5px]` 등 토큰과 모바일 값이 다른 것은 **그대로 두고 목록으로 보고**한다(모바일 변화 0 이 우선)
- 역할이 아닌 글자(배지 · 버튼 라벨 · 칩 · 타일 위 작은 글자)는 토큰으로 바꾸지 않는다. PC 에서 커질 이유가 없다
- 이벤트 상세 inline `fontSize` 34곳은 같은 규칙으로 클래스로 옮긴다(값이 토큰과 같은 것만)
- `:root` 안에서는 여러 줄 주석을 쓰지 않는다(CLAUDE.md)

### 3.4 표면 · 검색창 · 칩 (v1 §3.4–3.6 그대로)

검색창 — 홈 `HomeSearchBar` 기준
- 42 높이, `rounded-full`, 테두리 없음, `bg-background` · `shadow-float`, 아이콘 20, 글자 16
- 옆 원형 버튼 42, `shadow-chip`. 열린(입력 중) 상태의 `bg-muted` + 라임 제출 버튼은 기능 상태라 유지
- 적용: discover 닫힌 검색창 · `EventSearchBar` · `/topics` 검색 입력. placeholder 문구는 그대로

칩 — 홈 토픽 칩 `TOPIC_CHIP_*` 기준
- 32 높이, `rounded-full`, px 14, 15/500, 기본 `bg-background` + `shadow-chip`, 선택 `bg-brand`, 누름 `active:opacity-70`
- 적용: discover 카테고리 · 필터 칩, shop 태그 칩. 태그 배지(`.pill-badge`)는 누르는 물건이 아니라 제외. 홈 지역 칩 38 은 높이만 예외

카드 · 그림자 · 모서리 — `surface.md`
- 흐름 안의 카드 = `.surface-card`(배경 + r20 + `shadow-card`, 테두리 없음)
- 사진이 주인공인 카드 = 사진 r16, 카드 바탕 · 그림자 없이 사진 + 아래 글자
- 카드 안 사진 r12(여백 8) · r8(여백 12), 썸네일 r0 금지
- 검정 rgba 그림자 리터럴, Tailwind `shadow-sm/md/lg` 는 lg 표면에 쓰지 않는다
- **모바일 변화 0 이므로 모서리 · 그림자는 `lg:` 값으로만 바꾼다.** 모바일과 PC 의 카드 모서리가 달라지는 것은 이번 범위의 의도된 결과다

recreeshot 타일(폴라로이드)은 예외 — 흰 테두리 + 그림자가 recreeshot 의 정체성이라 모양을 유지하고, `shadow-md` 만 같은 색 계열 `shadow-card` 로 맞춘다

### 3.5 공통 부품 (새 이름은 승인 필요 — §8)

| 부품(가칭) | 내용 | 모바일 | lg | 대체하는 것 |
|---|---|---|---|---|
| `PageTitle` | h1 + 부제(선택) + 오른쪽 행동(선택) | **렌더하지 않음** — 모바일은 지금 헤더 바가 계속 맡는다 | `text-page-title` 700, 부제 `text-meta` muted, 행동은 알약 버튼 자동 폭. 아래 24 | 이중 헤더 8곳의 제목 역할 |
| `SectionHeader` | 제목 + "More ›" + lg ‹ › | `HScrollSection` 의 지금 모양 그대로 | `text-section-title`, 링크 `text-meta` | HScrollSection 안쪽 머리 + 수작업 17곳 중 모바일 모양이 같은 것 |
| `UnderlineTabs` | 밑줄 탭 | saved · shop 지금 모양 그대로(두 배치: 스크롤 / 꽉 채움) | 왼쪽 정렬 · 글자 폭(`flex-none px-5`), 탭 줄 아래 선은 본문 폭 | saved · shop 탭 복붙 |
| `EmptyState` | 아이콘(선택) + 제목 + 설명 + CTA(선택) | 로그인 유도 3벌의 모양(아이콘 40 · 18/600 · 14 · 라임 알약) | 같은 모양, 글자만 토큰 | 18벌 중 모바일 모양이 같은 것부터. 나머지는 차이를 보고 |
| `CardGrid` | 카드 그리드 | 지금 `grid-cols-2 gap-3` 그대로 | `repeat(auto-fill, minmax(var(--card-min), 1fr))` gap 16 — 열 수가 폭으로 정해진다 | 그리드 4벌 복붙 + saved · 프로필 |
| `PageContainer` | 폭 래퍼 `variant: wide · reading · narrow` | 클래스 없음(모바일 무변화) | §3.1 | 페이지마다 흩어진 `max-w-*` · `lg:px-10` |

- **구현 (확정 이름):** `PageContainer` · `PageTitle` 은 `src/app/(user)/_components/` 에 있다. `PageTitle` 의 h1 은 아직 글자 토큰 없이 28 리터럴이다
- **`PageTitle` 규칙 (PageTitle.tsx:6):** 상단 바 메뉴에 이름이 있는 화면(recreeshots · Shop 등)은 쓰지 않는다 — 바가 이미 어디인지 말한다. 지금 쓰는 곳: /saved · /topics · /profile/following

**카드 최소 폭 `--card-min` (P9)**

| 카드 계열 | 최소 폭 | 1024 | 1280 | 1440 | 1920 |
|---|---|---|---|---|---|
| 사진 카드 4:3 (PostCard · ShopCard · CourseCard) | 220 | 4열 | 5열 | 5열 | 7열 |
| recreeshot 타일 4:5 | 168 | 5열 | 6열 | 7열 | 9열 |
| 목록 카드 (saved 게시글 · 이벤트 등) | 400 | 2열 | 2열 | 3열 | 4열 |

- **가로 줄(캐러셀)** 도 같은 계열 표를 쓴다. `HScrollSection` 안 카드 폭 = `(줄 폭 − 간격 × (n−1)) / n`, n 은 줄의 **컨테이너 폭** 기준(container query) — 홈 본문 열처럼 옆에 지도 카드가 있는 곳도 맞는다
  - lg 에서는 마지막 카드가 몇 px 삐져나오는 일이 없다. 넘김은 ‹ › 로만
  - 모바일 · 태블릿은 지금 폭(120 · 160 · 85% …)과 엿보기 그대로
- 배너는 1024 · 1280 에서 2장, 1440 이상 3장

---

## 4. 페이지별 PC 배치 (1440 × 900 기준 그림, 구성 요소 종류 · 순서는 그대로)

공통: 상단 바 64 → 32 → 페이지 제목(있으면) → 24 → 본문. 좌우 선은 wide 48 / 1377.

### 4.1 게시글 상세 (완료 — 토큰만)

- 구조 · 동작(유튜브 자동재생 · 지도 카드 · 열 순서 · `display: contents` 모바일 순서)은 손대지 않는다
- 적용: `PageContainer reading`(1200, 지금과 같은 값), 위 여백 24 → 32, 섹션 제목 · 본문 · 메타를 글자 토큰으로(이미 lg 값이 따로 있는 곳은 같은 값이면 토큰으로 바꾸고, 다르면 지금 값을 둔다)
- 확인: 1440 · 1920 에서 모양 변화 0, 1024 · 1280 은 바깥 여백만

### 4.2 홈 `/feed` (wide)

```
┌ 상단 바 ───────────────────────────────────────────────────────────────┐
x=48 [🔍 Search ········· 420]  [Hot][BTS][SVT][Itaewon Class][+] →    x=1377  ← sticky 72
     ┌ 본문 1fr ──────────────────────────────────┐ 48 ┌ 지도 카드 360 ┐
     │ 배너 3장 (1280: 2장)                 ‹ ›   │    │ sticky        │
     │ Fans recreating the scene  More ‹ ›        │    │               │
     │ [][][][][][]  타일 계열 n 장 (잘림 없음)     │    └───────────────┘
     │ Must-Visit Photo Spots     More ‹ ›        │
     │ [  ][  ][  ][  ]  사진 카드 계열            │
     │ Fresh Drops                                │
     │ [   ][   ][   ]  3열 (지금 2열 465)         │
     └────────────────────────────────────────────┘
```

- 검색 + 토픽 칩 한 줄(v1 4.2): sticky 190 → 136, 검색 오른쪽 770 빈칸 제거. 줄 좌우 = gutter
- 섹션 사이 48, 섹션 제목 `SectionHeader`
- Fresh Drops(`InfiniteFeed`) lg 2열 → `CardGrid` 영상 카드 최소 300 (1440 본문 921 → 3열)
- 배너 r14 + 검정 그림자 → 사진 r16(lg)
- 첫 배너 줄 제목 유무는 v1 부터 열린 콘텐츠 결정 — 이번에도 넣지 않는다

### 4.3 discover (wide, 화면 전체)

```
x=48 ┌ 패널 clamp(440, 40%, 600) ┐ 24 ┌ 지도 r24 ──────────────────┐ x=1377
y=80 │ [🔍 Search places ··][⚙][⌑]│    │                     [◎][⛶] │
     │ [+][BTS][SVT] →            │    │   Topic 색 마커             │
     │ [🍴Food][☕Cafe] →          │    │                             │
     │ ┌ surface-card ─────────┐  │    │                             │
     │ │[썸 r8] 제목 · 메타   ⌑│  │    │                             │
     └────────────────────────────┘    └─────────────────────────────┘ 바닥 16
```

- v1 4.3 그대로: 패널 왼쪽 = gutter, 지도 오른쪽 = 화면 − gutter, P0 문서 높이 수정, 검색창 · 칩 공통, 목록 카드 `.surface-card`, 저장 아이콘 카드 안쪽으로, 칩 줄 사이 8
- 1920 에서도 지도는 끝까지(wide 1760 제한을 받지 않는 유일한 화면 — 지도는 전폭)

### 4.4 recreeshot 목록 `/recreeshot` (wide)

```
     recreeshot                                         [⊞ Topics] [+ New]   ← PageTitle
     [타일][타일][타일][타일][타일][타일][타일]   7열 (지금 5열 259)
```

- AppHeader 는 lg 에서 숨김. 그 안의 토픽 아이콘 링크는 PageTitle 오른쪽 행동으로 옮긴다(기능 유지)
- 오른쪽 아래 떠 있는 "+" FAB → lg 에서 PageTitle 의 "+ New" 알약(같은 동작). 모바일 FAB 그대로
- 제목 문구 "recreeshot" 은 화면에 새로 생기는 글자 — §8 결정 2

### 4.5 recreeshot 상세 `/recreeshot/[id]` (reading)

```
┌ 상단 바 (지금은 없음 → lg 에서 보이게) ───────────────────────────────┐
      ┌ 사진 (높이 ≤ 화면 − 바 − 64) ──┐ 48 ┌ 옆 열 400 ──────────────┐
      │ 폴라로이드 원본 크기            │    │ 작성자 · 날짜      ⋮    │
      │                                │    │ ♡ ⌑                    │
      │                                │    │ 스토리                 │
      │                                │    │ 장소 · 원본 게시글 링크 │
      └────────────────────────────────┘    └────────────────────────┘
```

- 모바일 바(← ⋮)는 lg 숨김, ⋮ 는 옆 열 작성자 줄 오른쪽으로(같은 컴포넌트)
- 모바일 순서(사진 → 작성자 → 행동 → 스토리 → 장소)는 DOM 그대로, lg 에서 두 열로만 감싼다

### 4.6 여정 목록 `/journeys` (wide)

```
     Journeys                                                    [+ New]   ← PageTitle
     My Journeys
     [카드][카드][카드][카드][카드]    사진 카드 계열 5열
     Public Journeys
     [카드][카드] …
```

- "Journeys" 바 lg 숨김 → PageTitle(New 알약을 오른쪽 행동으로 그대로 옮김)
- 섹션 제목 · 빈 화면은 공통 부품. 섹션 사이 48

### 4.7 여정 편집 `/journeys/new`, `/[id]/edit` (narrow)

- 편집기 바(← 제목 Done) 하나뿐이라 이중 헤더 아님. 상단 바 없음 유지(집중 화면)
- 바꾸는 것: 폭 토큰(`--w-narrow`, 지금과 같은 672), 위 여백, 글자 토큰. 시트는 이미 lg 대화상자
- 로딩 스켈레톤(`CourseEditorSkeleton`)에 `data-narrow-layout` 이 빠져 로딩 중에만 1440 으로 퍼진다 — 같이 고친다

### 4.8 여정 상세 `/journeys/[id]` (reading)

```
      ┌ 배너 (reading 폭, r24, 높이 222→280) ──────────────────────────────┐
      │ ←  BTS Busan Course                                               │
      └───────────────────────────────────────────────────────────────────┘
      ┌ 왼쪽 1fr ──────────────────────────┐ 48 ┌ 옆 열 400 sticky ──────┐
      │ 통계 타일 2개                       │    │ 지도 (높이 320)         │
      │ 장소 목록 (번호 · 사진 · 이름 · 배지) │    │ [ Make it mine ] 자동폭  │
      │ …                                  │    │  (열 폭 꽉 채움 400)     │
      └────────────────────────────────────┘    └────────────────────────┘
```

- 지금 lg 처리가 전혀 없어 1389 폭으로 퍼진다(지도 띠 1389×172, CTA 1389×54)
- 지도(`CourseMiniMap`)와 "Make it mine"(`CopyCourseButton`, 모바일 sticky 바닥)을 lg 에서 옆 열 sticky 로. 모바일 순서 그대로, lg 에서만 열로 감싼다
- 배너 위 뒤로 버튼: lg 에서 숨김(상단 바가 있음). 편집 알약은 유지

### 4.9 저장 `/saved` (wide)

```
     Saved                                                                  ← PageTitle
     Posts   Places   Events   recreeshots                                  ← UnderlineTabs 왼쪽 정렬
     ─────────────────────────────────────────────────────
     [목록 카드][목록 카드][목록 카드]        목록 카드 계열 3열
     (recreeshot 탭) [타일]×7                 타일 계열
```

- SavedHeader lg 숨김. 탭 sticky 기준은 상단 바 바로 아래(지금은 바 + 48)
- 본문 672 가운데 → wide. 게시글 · 장소 · 이벤트 행은 lg 에서 목록 카드(`.surface-card`) 그리드로, 구분선은 lg 에서 없앤다
- 로그인 유도는 `EmptyState`

### 4.10 샵 `/shop` (wide)

```
     Shop                                                                   ← PageTitle
     K-Beauty   K-Item                                                      ← 탭 왼쪽 정렬 (지금 713 × 2)
     [All][Skincare][Makeup] …                                              ← 칩 공통 32
     [카드][카드][카드][카드][카드]    사진 카드 계열
```

- ShopHeader lg 숨김. 고정 영역 157 → 탭 줄 하나(sticky)

### 4.11 토픽 `/topics` (wide)

```
     Your topics                                                            ← PageTitle (X 는 lg 숨김)
     [🔍 Search topics ··············· 420]
     Following
     [토픽][토픽][토픽]    ← 줄 목록을 3열 그리드로
     K-POP (21)            K-DRAMA (14)          ACTOR (9)                  ← 그룹 3열, 각 그룹 접기 유지
     ·토픽 행 Follow       ·토픽 행 Follow       ·토픽 행 Follow
```

- 672 시트 모양 → wide. 그룹을 열로 나란히(같은 순서로 왼쪽 → 오른쪽, 위 → 아래)
- 검색 입력은 공통 검색창 모양

### 4.12 토픽 상세 `/topics/[slug]` (wide)

```
     ┌ 히어로 (wide 폭, r24, 높이 240) ──────────────────────────────────┐
     │  Itaewon Class                                    [Follow] 자동폭  │
     └──────────────────────────────────────────────────────────────────┘
     [카드][카드][카드][카드][카드]    사진 카드 계열
```

- 히어로 글자 x16 · 그리드 x40 불일치 → 둘 다 gutter
- Follow 1393 → 자동 폭 알약, 히어로 오른쪽 아래. 투명 뒤로 바는 lg 숨김
- `<title>` 접미사 중복("| reCree | reCree")은 발견만 — 범위 밖, 보고

### 4.13 프로필 `/profile` (wide, 화면 실측 못 함)

```
     ┌ 프로필 카드 320 sticky ┐ 48 ┌ 본문 1fr ───────────────────────────────┐
     │ 아바타                 │    │ My Journeys              See all N ‹ ›  │
     │ 닉네임 · 통계           │    │ [카드][카드][카드][카드]                 │
     │ edit profile   ☰       │    │ recreeshots                            │
     └────────────────────────┘    │ [타일][타일][타일][타일][타일][타일]       │
                                   └────────────────────────────────────────┘
```

- "reCree" + 메뉴 바 lg 숨김. 메뉴(설정 드로어)는 프로필 카드 오른쪽 위 아이콘으로(같은 버튼). 드로어는 lg 에서 버튼에 붙은 팝오버 — `desktop-layout.md` §3.6 의 기존 계획
- 1024 가운데 상자 → wide. 프로필 → 여정 → recreeshot 순서는 그대로(왼쪽 → 오른쪽 위 → 아래)
- 구현 청크에서 로그인한 상태로 실측이 필요하다 — §8

### 4.14 팔로잉 `/profile/following` · 프로필 편집 `/profile/edit`

- following(wide): "← Following" 바 lg 숨김 → PageTitle "Following" + 부제(개수). 목록 행 → 토픽 그리드와 같은 3열
- edit(narrow): 상단 바 없음 유지, 폭만 `--w-narrow` 안 448 그대로

### 4.15 이벤트 상세 `/events/…` (reading, 실측 못 함)

- 지금 `73rem` 2열(포스터 sticky + 정보) → `PageContainer reading`(1200). 구조 그대로
- 포스터 위 ← 는 lg 숨김, 언어 · 공유는 유지
- inline `fontSize` 34곳 → 토큰 · 클래스(값이 같은 것만)
- 공개 컬렉션이 없어 화면 확인은 dev DB 데이터가 생길 때까지 코드 · 빌드로만

### 4.16 로그인 · 온보딩 · 약관

- `/login`(narrow): AppHeader lg 숨김 → "reCree" 가 상단 바 로고 + h1 두 번으로 줄어든다. 배치는 가운데 그대로
- `/onboarding`(narrow): 바 하나라 그대로. 폭 토큰만
- `/policy/[type]`(reading): lg 에서 상단 바 보이게, ← 바 숨김 → PageTitle(문서 제목). 본문 `text-body`(14 → 16) — 긴 글 읽기 폭 720 유지

---

## 5. 하지 않는 것

- 768 미만 · 768–1023 배치 변화
- 색 · 폰트 교체, 새 색, impeccable bolder · overdrive · init
- DB · prisma · admin, 라우트 · 데이터 변경
- 페이지 구성 요소의 종류 · 순서 변경 (배치만)
- 게시글 상세 구조 · 유튜브 자동재생 · 지도 카드 동작
- 상단 바 디자인(로고 · 아이콘 · 크기 · 간격 · 높이 · 색 · 현재 표시)
  - 이후 변경: 상단 바는 별도 `DesktopHeader` 로 새로 만들었다(글자 메뉴 · 검정 밑줄 · 계정 드롭다운, §3.1). 이 항목은 당시 계획이다

## 6. 구현 청크

각 청크: `pnpm build` 통과 · 390px HEAD 대비 회귀 0(요소 좌표 · 계산 스타일 비교) · 1024 · 1280 · 1440 · 1920 가로 스크롤 0. 끝날 때마다 멈추고 보고.

| # | 청크 | 확인 |
|---|---|---|
| 1 | **셸 · 폭 토큰.** `--page-gutter` · `--w-*` · `--space-page-top`, 1440 기둥 해제, 상단 바 안쪽 정렬, `PageContainer`, discover 문서 높이 P0 | 상단 바 로고 x = gutter(32/40/48/80), discover docH = 뷰포트 |
| 2 | **글자 토큰 + 공통 부품 뼈대.** `text-*` 5개, `PageTitle` · `SectionHeader`(HScrollSection 에서 추출) · `UnderlineTabs` · `EmptyState` · `CardGrid` | 모바일 계산 스타일 HEAD 와 동일, HScrollSection 쓰는 6곳 모양 그대로 |
| 3 | **이중 헤더 정리.** 8곳 `.app-header` lg 숨김 + `PageTitle`, recreeshot 상세 · 약관 lg 상단 바 | lg 에서 64 바 아래 sticky 헤더 0개 |
| 4 | **그리드 · 가로 줄 열 규칙.** `CardGrid` 적용(recreeshot · shop · 토픽 상세 · 여정 · saved · 프로필), HScrollSection 카드 폭 = 열 기준 | 가로 줄 마지막 카드 잘림 0 |
| 5 | 홈 · discover (v1 4.2 · 4.3, 검색창 · 칩 · 목록 카드 표면) | sticky 136, 홈 · discover 검색창 · 칩 계산 스타일 같음 |
| 6 | 저장 · 샵 · 토픽 · 토픽 상세 | 탭 자동 폭, Follow 자동 폭 |
| 7 | 여정 목록 · 상세 · 편집 | CTA ≤ 400, 지도 sticky |
| 8 | recreeshot 상세 · 프로필 · 팔로잉 | 로그인 상태 실측 |
| 9 | 이벤트 상세 · 게시글 상세 토큰 · 로그인 · 온보딩 · 약관 | 게시글 1440 · 1920 모양 변화 0 |
| 10 | 전체 회귀 · `impeccable audit` · detect | 390 · 1024 · 1280 · 1440 · 1920 스크린샷 |

글자 토큰 교체는 2에서 토큰만 만들고, 각 페이지 청크에서 그 페이지 것을 바꾼다(한 청크 diff 를 작게).

## 7. 위험

- **fixed 요소 10곳이 `--app-col-w` 로 폭을 맞춘다**(BottomNav · ScrollToTop · FAB · 시트 4곳 · 게시글 · 토픽 헤더). 1 에서 lg 값을 wide 로 바꿀 때 하나씩 확인
- `scrollbar-gutter: stable` 때문에 실제 폭은 화면 − 15. 표 §3.1 은 이를 반영했다
- `PageTitle` 을 모바일에서 렌더하지 않으므로 h1 이 lg 에서만 생기는 화면이 있다(목록 화면). 모바일 접근성 구조는 지금과 같다
- 글자 토큰 교체 범위가 넓다(`text-sm` 279곳). 역할이 분명한 곳만 바꾸고, 기계적 일괄 치환은 하지 않는다

## 8. 정할 것

1. **새 이름 6개** — `PageContainer` · `PageTitle` · `SectionHeader` · `UnderlineTabs` · `EmptyState` · `CardGrid`, 토큰 `--page-gutter` · `--w-wide/reading/narrow` · `--space-page-top`(섹션 간격 토큰은 처음 쓸 때) · `text-page-title/section-title/card-title/body/meta`
2. **로고만 있던 헤더 화면의 PC 제목** — `/recreeshot` 에 "recreeshot" 제목을 새로 둘지(추천: 둔다. 토픽 아이콘 링크 · New 를 붙일 자리가 필요), `/profile` · `/login` 은 제목 없음(추천)
3. **읽기 화면 상단 바** — `/recreeshot/[id]` · `/policy` 에서 lg 상단 바를 보이게(추천). 편집기 · 온보딩 · 프로필 편집은 지금처럼 바 없이 — 적용됨(`isDesktopHeaderHidden`, 프로필 편집은 `/edit` 끝 규칙으로 함께 숨김)
4. **폭 값** — gutter 32/40/48/80, wide 1760, reading 1200, 위 여백 32 · 섹션 48 (적용됨, 섹션 48 은 토큰 없이)
5. **로그인 화면 실측** — 프로필 · 온보딩 · 여정 편집은 로그인이 필요하다. 청크 7 · 8 전에 playwright 브라우저에서 한 번 로그인해 주면 실측한다
