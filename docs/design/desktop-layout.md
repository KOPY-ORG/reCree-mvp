# 데스크톱 레이아웃 설계 v1

> 작성 2026-09-30 · 상태: 구현됨 (커밋 전) — lg 방향은 구현 중 바뀌었다. 맨 아래 "구현 기록" §8 이 기준이다
>
> 범위: `src/app/(user)` 사용자 화면. admin 제외.
> 브랜드 표기·색은 현재 코드 기준(`BRAND.name`, `var(--brand)`)을 따른다.
> CLAUDE.md 의 디자인 토큰 표(#C8FF09 등)는 최근 리브랜딩 커밋과 어긋나 있어 인용하지 않는다.

---

## 0. 원칙

| 폭 | 동작 |
|---|---|
| `< 768` | **지금과 픽셀 단위로 동일.** 변경은 전부 `md:` · `lg:` 접두어 또는 `@media (min-width)` 안에서만 |
| `768 – 1023` (md) | 지금 레이아웃을 넓힌 것. 하단 알약 내비 유지, 컬럼만 넓어지고 그리드 열 수가 는다 |
| `≥ 1024` (lg) | 같은 재료(색 · 둥근 카드 · 알약 · 타이포)로 PC 정보 배치를 새로 짠다 |

- **분기보다 변수.** 지금도 탭바 높이를 `--bottom-nav-space` 한 변수로 17곳이 나눠 쓴다.
  데스크톱도 같은 방식으로 간다 — 컴포넌트 안에 `isDesktop` 분기를 넣지 않고,
  CSS 변수 값이 폭에 따라 바뀌게 해서 소비처가 알아서 맞춰지게 한다.
- JS 로 폭을 판정하지 않는다 (`matchMedia` · `useMediaQuery` 도입 안 함). 현재 코드에도 없다.
  SSR 첫 페인트에서 모바일/PC 가 뒤바뀌는 깜빡임을 원천 차단한다.
- 만드는 흐름(recreeshot 편집기, 코스 편집기, 온보딩, 로그인)은 PC 에서도 **좁은 컬럼**을 유지한다.
  집중 작업이라 넓힐 이유가 없고, 회귀 위험이 가장 큰 곳이기도 하다.

---

## 1. 정찰 결과 요약

### 1.1 모바일 폭을 고정하는 곳

| 위치 | 내용 |
|---|---|
| `src/app/(user)/layout.tsx:20` | 모든 사용자 화면을 감싸는 `max-w-[540px] mx-auto` 컬럼. 바깥은 `bg-muted` |
| `max-w-[540px]` 하드코딩 | 12개 파일 — BottomNav, ScrollToTopButton, NewReCreeshotFab, PostDetailHeader, TopicDetailHeader, ExploreTabBar(미사용), AttractionDetailSheet, PlaceAddSheet, TopicPickSheet, ScoreSheet, StickerPanel ×2 |
| 컬럼 폭 변수 | **없음.** 540 은 파일마다 리터럴 |
| 페이지 내부 `max-w-2xl` · `max-w-md` · `max-w-3xl` | feed, posts, recreeshot, topics, saved, policy 등. 540 안이라 지금은 무효. 넓히면 살아난다 — 의도를 재확인해야 함 |

### 1.2 컨테이너 폭·탭바 높이에 의존하는 위치 계산

- `--bottom-nav-*` (globals.css `:root`, 128–137) · JS 짝 `BOTTOM_NAV_SPACE = 90` (`src/lib/bottom-nav.ts`)
- JS 사용처: `PlaceListSheet.tsx:69-70` (스냅), `InteractiveMap.tsx:64,225` (카메라 bottomOffset 기본값)
- `fixed inset-x-0` + 안쪽 `max-w-[540px] mx-auto` 패턴: BottomNav, ScrollToTopButton, NewReCreeshotFab, PostDetailHeader, TopicDetailHeader
- 뷰포트 중앙 `left-1/2 -translate-x-1/2` + `bottom-[var(--bottom-nav-space)]` 토스트 알약 10곳
- 전역 토스트 `components/toast-provider.tsx:41-51` — `bottom: 88` 하드코딩
- 뷰포트 기준이라 컬럼을 벗어나는 것: ProfileView 설정 드로어(`right-0 w-72`), DiscoverSearchBar 전체화면 오버레이, GuideVideoCard, ImageCropOverlay, AddPlaceOverlay
- `window.innerHeight`: PlaceListSheet, InteractiveMap. `innerWidth` · `matchMedia`: 없음

### 1.3 바텀시트 · 캐러셀 · 모달

- **Radix Sheet `side="bottom"`** 5종: AttractionDetailSheet(feed · discover · posts 에서 사용), PlaceAddSheet, TopicPickSheet, ScoreSheet, StickerPanel. 전부 스스로 `mx-auto max-w-[540px]` 를 다시 건다. admin 은 `side="bottom"` 을 쓰지 않는다.
- **커스텀 시트**: PlaceListSheet(드래그, 높이를 인라인 style 로 애니메이션), DiscoverFilterSheet(translate-y), PlaceBottomSheet(떠 있는 카드)
- **캐러셀**: 라이브러리 없음. 전부 네이티브 `overflow-x-auto` + snap. 카드 폭은 `w-[140/150/160px]`, `%`(85·90·42), `md:w-[200px]` 한 곳. BannerCarousel 만 transform 트랙 + `sm:flex` 화살표
- **모달**: Radix Dialog(로그인 유도 4곳), 커스텀 `fixed inset-0` 모달(confirm-dialog, ReportDialog, recreeshot 삭제 확인 2종, 업로드·프로필 하단 정렬 확인창)

### 1.4 기존 반응형 클래스

거의 없다. `PostCard.tsx:112 md:w-[200px]`, `FollowFeedSkeleton md:w-[200px]`, `TopicHero md:h-[240px]`,
`BannerCarousel sm:flex`, `OriginalSourceCards sm:/md:/lg:`, `ReportDialog sm:items-center`, ui 프리미티브.
**이들은 뷰포트 기준이라 지금 이미 PC 에서 540 컬럼 안에 발동하고 있다** (PC 로 보면 카드가 200px).

---

## 2. 공통 셸

### 2.1 변수 체계

globals.css 에 폭 변수를 추가하고, 기존 탭바 변수를 lg 에서 0 으로 만든다.

```
                 < md        md          lg
--app-col-w      540px       720px       (사용 안 함, 셸이 그리드로 바뀜)
--bottom-nav-*   현행         현행         0  ← 하단 알약이 사라지므로
--side-nav-space 0           0           레일 폭 + 여백 (≈ 98px)
```

- `--bottom-nav-space` 를 lg 에서 0 으로 두는 한 줄이 17개 소비처(지도 높이 · 시트 · FAB ·
  sticky CTA · 토스트)를 한꺼번에 PC 에 맞춘다. 조건 분기를 추가하지 않고 문제를 없애는 방식.
- 12곳의 `max-w-[540px]` → `max-w-[var(--app-col-w)]` 치환. 모바일 값은 540 그대로라 무변화.
- `:root` 안에 여러 줄 주석 금지 (CLAUDE.md). 한 줄 주석만 쓴다.

### 2.2 PC 내비게이션 — 왼쪽 세로 알약 레일

```
┌──────┬──────────────────────────────────────────────┐
│ logo │                                              │
│      │                                              │
│ ╭──╮ │                                              │
│ │⌂ │ │           콘텐츠 (페이지별 그리드)             │
│ │◎ │ │                                              │
│ ╰──╯ │                                              │
│      │                                              │
│ ╭──╮ │                                              │
│ │📷│ │                                              │
│ │🛍│ │                                              │
│ │👤│ │                                              │
│ ╰──╯ │                                              │
└──────┴──────────────────────────────────────────────┘
  20 + 58 + 20
```

- **형태**: 지금 하단의 "떠 있는 알약 두 개"를 90° 세운다. 같은 부품(`Pill`, `NavItem`),
  같은 표면(흰 93% · blur · 그림자), 같은 48 칸, 같은 활성 원(`--brand`), 같은 `nav-pop`.
  위 알약 = 홈 · 지도, 아래 알약 = recreeshot · shop · profile. 화면 가장자리에서 20 씩 떠 있다.
- **라벨**: 아이콘만 두고 hover · focus 시 오른쪽에 툴팁 알약(Pretendard Medium 14)을 띄운다.
  aria-label 은 그대로.
- **왜 왼쪽 레일인가**
  1. 지도(/discover)가 핵심 화면이다. 상단 바는 지도의 세로를 먹고, 레일은 가로에서 98px 만 가져간다
     — 16:9 화면에서 남는 건 가로다.
  2. 지금 알약은 "지도 위에 떠 있어야 반투명·blur 가 의미를 갖는다"(bottom-nav.ts 주석)는 전제로 만들어졌다.
     세로 레일도 지도 위에 떠 있어 그 전제를 그대로 가져간다.
  3. 새 부품이 아니라 같은 물체의 회전이라, 모바일↔PC 를 오가도 같은 앱으로 읽힌다.
  4. 5개 항목은 레일에 여유 있게 들어가고, 상단 바를 쓰면 기존 페이지별 헤더(HomeTopBar, SavedHeader 등)와
     2단으로 쌓인다.
- **md (768–1023)**: 하단 알약 그대로. `justify-between` 이라 컬럼이 넓어지면 알약이 양끝으로 간다.
- **숨김 규칙**: `isBottomNavHidden` 을 레일도 그대로 쓴다 (편집기 · 온보딩 · 상세 일부는 레일도 없음).
  → **합의 필요 1**: PC 에서는 recreeshot 상세처럼 모바일에서 숨기는 화면에도 레일을 보일지.
- **구현 방식**: BottomNav 한 컴포넌트가 `lg:` 클래스로 방향만 바꾼다 (`flex-row` → `lg:flex-col`,
  `bottom` → `lg:left`). 컴포넌트를 둘로 나누지 않는다. `nav-tuckable` 의 숨김은
  `max-lg:` 로 한정한다 (PC 는 지도 시트가 없어 숨을 일이 없다).

### 2.3 셸 레이아웃

```
lg:  body ─ grid [ 레일 자리(--side-nav-space) | 콘텐츠 ]
            콘텐츠 = 페이지가 정한다. 기본 max-w 1200, 가운데 정렬, 좌우 32
```

- `layout.tsx` 의 540 컬럼은 `lg:max-w-none lg:pl-[var(--side-nav-space)]` 로 풀고,
  배경 `bg-muted` + 컬럼 그림자는 lg 에서 끈다 (전체가 `bg-background`).
- 각 페이지는 자기 최대폭을 스스로 정한다. 읽는 화면(게시글 · 정책)은 좁게, 둘러보는 화면(홈 · 그리드)은 넓게.
- `fixed` 전역 요소(토스트, ScrollToTopButton)의 가로 중심을 `calc(50% + var(--side-nav-space)/2)` 로.
  모바일은 변수 0 이라 무변화.
- 공통 헤더 `.app-header`(AppHeader · SavedHeader · ShopHeader): lg 에서 높이·여백만 키우고 구조 유지.
  AppHeader 의 로고는 레일 상단 로고와 겹치므로 `lg:hidden`.
- PC 에는 hover · `focus-visible` 상태를 새로 준다. 지금은 `active:scale-95` 등 터치 상태만 있다.

---

## 3. 페이지별 PC 레이아웃 (lg)

md 는 공통으로 "컬럼 720 + 그리드 2→3열" 이고, 아래는 lg 만 적는다.

### 3.1 홈 `/feed`

```
┌ HomeTopBar (검색 + 탭)  ─────────────────────────────┬───────────────┐
│ Banner  [ 85% 한 장 → 2장 나란히 ]                     │ KoreaMapCard  │
│ Follow feed / Popular recreeshot / Curated (가로 줄)   │ (sticky)      │
│ Festival · Journey                                     │               │
│ FreshDrops  [ FeedCard 2열 ]                           │ Feedback 링크 │
└────────────────────────────────────────────────────────┴───────────────┘
        메인 ~ 760                                          사이드 320
```

- KoreaMapCard 를 오른쪽 sticky 사이드로 뺀다. 홈에서 "지역으로 가는 길"이 스크롤해도 남는다.
- 가로 줄(HScrollSection) 은 줄 그대로 두고 화살표 버튼을 붙인다 (§4.2).
- FreshDrops 의 무한 피드는 2열.
- `HomeTopBar` 는 이미 sticky 라 그대로. 사이드 sticky 를 위해 MainArea 의 `overflow-x-hidden` 이
  문제된다 (§6 위험 3).

### 3.2 지도 `/discover` — 가장 큰 변화

```
┌─ 레일 ─┬── 패널 400 ──────────┬───────────── 지도 ─────────────┐
│        │ 검색바               │                                │
│        │ 토픽 칩 · facet       │         마커                   │
│        │ ─────────────        │                                │
│        │ 리스트 / 섹션         │                    [⊕][◎]     │
│        │  (PlaceListSheet     │                                │
│        │   내용 그대로)        │                                │
│        │                     │                                │
└────────┴─────────────────────┴────────────────────────────────┘
```

- **PlaceListSheet → 왼쪽 고정 패널.** 드래그 · 스냅 · half/full 상태가 lg 에서는 의미가 없다.
  같은 컴포넌트가 lg 에서 `static h-full w-[400px] rounded-none` 이 되고, 핸들은 `lg:hidden`.
  시트 안의 내용(DiscoverSheetHeader, 섹션, PlaceListSheetCard)은 손대지 않는다.
- **PlaceBottomSheet(장소 카드)** → 패널 안에서 리스트를 대체하는 상세 뷰 (뒤로 가면 리스트).
  지도 위 떠 있는 카드는 lg 에서 쓰지 않는다.
- **DiscoverFilterSheet** → 패널 폭 안에서만 덮는 슬라이드 (지금 `absolute` 이므로 부모를 패널로 옮기면 끝).
- **DiscoverSearchBar 전체화면 오버레이** → 패널 영역 안으로 한정.
- **지도 카메라 패딩**: `bottomOffset` 대신 lg 에서는 왼쪽 패딩 400 (패널에 가린 영역). §6 위험 2.
- 탭바가 지도 위에 떠 있던 것처럼, 레일도 지도 위에 떠 있다 — 레일 뒤로 지도가 비치도록
  지도는 레일 영역까지 깔고, 패널은 레일 오른쪽에서 시작.

### 3.3 게시글 상세 `/posts/[slug]`

```
┌─────────────── max-w 1200 ─────────────────────────────┐
│ ┌── 미디어 (sticky) ─────┐ ┌── 본문 ───────────────┐   │
│ │ BannerCarousel         │ │ PostMetaBar            │   │
│ │ OriginalSourceCards    │ │ PostActionBar · 구매    │   │
│ │                        │ │ 하이라이트              │   │
│ │ LocationCard (지도)     │ │ MarkdownContent (~68ch)│   │
│ └────────────────────────┘ │ Source · Credit        │   │
│                            └────────────────────────┘   │
│ recreeshot 줄 · Nearby attractions (전체 폭 가로 줄)      │
│ Comments (본문 폭)                                        │
└──────────────────────────────────────────────────────────┘
```

- 왼쪽 미디어 7 : 오른쪽 본문 5. 긴 본문을 스크롤하는 동안 사진과 위치가 남는다 —
  "이 장소를 재현한다"는 서비스의 핵심 동선.
- `PostDetailHeader`(fixed, 전체 폭)는 lg 에서 콘텐츠 영역 상단의 sticky 로.
- 이미 있는 `OriginalSourceCards` 의 `sm:/md:/lg:` 값은 540 컬럼 가정으로 들어간 것이라 재검토.

### 3.4 recreeshot

- `/recreeshot` (홀): `HallGrid` 2열 → md 3열 → lg 4열. `NewReCreeshotFab` 는 lg 에서 숨기고
  헤더 오른쪽에 같은 동작의 버튼.
- `/recreeshot/[id]`: 이미지 왼쪽(최대 높이 = 화면 높이), 작성자 · 스토리 · 장소 링크 오른쪽.
- `/recreeshot/new`, `/recreeshot/[id]/edit`: **좁은 컬럼 유지** (540 가운데). 편집기 시트는 §4.1 로
  대화상자가 된다. 편집기 자체를 캔버스+사이드 도구 패널로 바꾸는 건 v2.

### 3.5 journeys

- `/journeys`: 카드 그리드 2 → md 3 → lg 4.
- `/journeys/[id]`: 지도 페이지와 같은 문법 — 왼쪽 순서 목록 패널, 오른쪽 `CourseMiniMap` 을 크게 (sticky).
  `CopyCourseButton` 의 `sticky bottom-[var(--bottom-nav-space)]` 는 변수 0 으로 자동 정렬.
- `/journeys/new`, `/edit` (`CourseEditor`): 좁은 컬럼 유지. PlaceAddSheet · TopicPickSheet 는 대화상자.

### 3.6 프로필 `/profile`

```
┌ 프로필 카드 (sticky, 320) ┬ recreeshot · 코스 (그리드) ────────┐
│ 아바타 · 닉네임 · 통계     │ 가로 줄 → lg 에서 3~4열 그리드      │
│ Edit profile · Settings   │                                     │
└───────────────────────────┴─────────────────────────────────────┘
```

- 설정 드로어(`fixed right-0 w-72`)는 lg 에서 설정 버튼에 붙은 팝오버로.
  지금도 뷰포트 오른쪽 끝에서 열려 PC 에서 이미 컬럼과 떨어져 보인다.
- `/profile/edit`: `max-w-md` 가운데. `/profile/following`: 목록 `max-w-2xl` 가운데.

### 3.7 나머지

| 화면 | lg |
|---|---|
| `/saved` | 탭 유지, 목록은 2열 · recreeshot 그리드 4열 |
| `/shop` | 칩 줄 + 그리드 2 → 3 → 4열 |
| `/topics` | 그룹 섹션을 2열 목록으로 |
| `/topics/[slug]` | Hero 넓게(이미 `md:h-[240px]`), PostsGrid 4열. 헤더는 게시글 상세와 같은 처리 |
| `/events/…` | 게시글 상세와 같은 2단: 포스터 왼쪽 sticky, 정보 · 지도 · 장소 목록 오른쪽 |
| `/login`, `/onboarding`, `/policy` | 가운데 좁은 카드. 구조 변경 없음 (`/policy` 는 이미 `max-w-3xl`) |

---

## 4. 바텀시트 · 캐러셀 · 모달의 PC 대응

### 4.1 바텀시트 → 가운데 대화상자

- Radix `Sheet side="bottom"` 5종은 lg 에서 **가운데 대화상자**가 된다
  (`lg:inset-auto lg:top-1/2 lg:left-1/2 -translate-1/2 lg:rounded-2xl lg:max-h-[80vh] lg:w-[560px]`,
  슬라이드 대신 fade + zoom).
- 5곳이 같은 껍데기(`mx-auto max-w-[540px] rounded-t-2xl`)를 복사해 쓰고 있으므로 한 곳으로 모은다.
  `sheet.tsx` 의 `side="bottom"` 스타일에 lg 변형을 넣는 것이 가장 적은 변경 — admin 은 `side="bottom"` 미사용이라 영향 없음.
  → **합의 필요 2**: shadcn 프리미티브(`sheet.tsx`)를 직접 고칠지, 공유 클래스 상수를 새로 둘지.
- 장식용 핸들은 `lg:hidden`. safe-area 여백은 PC 에서 0 이라 그대로 둬도 무해.
- 커스텀 시트(PlaceListSheet · DiscoverFilterSheet · PlaceBottomSheet)는 §3.2 처럼 패널로 흡수.
- 하단 정렬 커스텀 확인창(confirm-dialog, 업로드 · 프로필 확인창)은 `lg:items-center`.
  ReportDialog 는 이미 `sm:items-center`.

### 4.2 가로 캐러셀

| 종류 | lg |
|---|---|
| 카드 줄 (`HScrollSection` + PostCard 160/200) | 줄 유지 + 양끝 화살표 버튼 (hover 시 표시, 스크롤 끝이면 숨김). 휠 · 트랙패드 가로 스크롤은 이미 됨 |
| 퍼센트 폭 (Banner 85%, EventPeek 90%, EventVertical 42%) | 뷰포트가 넓어지면 카드가 거대해진다 → `lg:w-[…px]` 고정폭 또는 2~3장 동시 노출 |
| 칩 · 탭 줄 | 대부분 PC 폭에 다 들어간다. 줄 그대로, 넘칠 때만 스크롤 |
| BannerCarousel (게시글) | 이미 `sm:flex` 화살표. 미디어 칼럼 폭에 맞춰짐 |
| 프로필 · 저장의 가로 줄 | lg 에서 그리드로 (항목 수가 적고, 한 사람의 모음이라 한눈에 보는 편이 낫다) |

- 화살표는 공용 부품 하나로 만들어 `HScrollSection` 에만 붙인다 — 각 캐러셀에 따로 넣지 않는다.

### 4.3 이미지 `sizes`

`50vw` · `85vw` · `100vw` 등 폰 가정 값이 PC 에서 과다 다운로드를 만든다. 레이아웃 청크마다
그 화면의 `sizes` 를 `(min-width:1024px) 300px, 50vw` 식으로 함께 고친다.

---

## 5. 작업 순서 (청크)

각 청크는 **모바일 360/390/430 스크린샷 비교 → md 800 → lg 1280/1440** 으로 독립 검증한다.

| # | 청크 | 예상 변경 파일 |
|---|---|---|
| 1 | **폭 변수 도입 (무변화 리팩터)** — `--app-col-w` 추가, 540 리터럴 12곳 치환. 모바일 · PC 모두 화면 무변화가 합격 기준 | `globals.css`, `(user)/layout.tsx`, BottomNav, ScrollToTopButton, NewReCreeshotFab, PostDetailHeader, TopicDetailHeader, AttractionDetailSheet, PlaceAddSheet, TopicPickSheet, ScoreSheet, StickerPanel (ExploreTabBar 는 미사용 — 손대지 않고 보고만) |
| 2 | **md 확장** — `--app-col-w: 720px` at md, 그리드 열 수 md:3 | `globals.css`, HallGrid, journeys 그리드, ShopClient, SavedClient, PostsGrid, ProfileView 그리드 |
| 3 | **PC 셸 + 레일** — `--bottom-nav-*` lg 0, `--side-nav-space`, BottomNav 세로 전환 + 툴팁, layout 컬럼 해제, 토스트 · 맨위로 중심 보정, `nav-tuckable` max-lg 한정 | `globals.css`, `(user)/layout.tsx`, BottomNav, `lib/bottom-nav.ts`(주석·상수), MainArea, ScrollToTopButton, `toast-provider.tsx`, AppHeader |
| 4 | **시트 → 대화상자, 하단 확인창 가운데 정렬** | `components/ui/sheet.tsx`(또는 공유 상수), 시트 5종의 핸들, `confirm-dialog.tsx`, ReCreeshotUploadFlow, ProfileView |
| 5 | **캐러셀 화살표 + 퍼센트 폭 카드** | `curation/HScrollSection.tsx`, HomeBannerCarousel, EventPeekCarousel, EventVerticalCarousel, PostCardCarousel |
| 6 | **홈** | `feed/page.tsx`, KoreaMapCard, InfiniteFeed/FreshDrops, HomeTopBar |
| 7 | **게시글 상세 · 이벤트 상세** | `posts/[slug]/page.tsx`, PostDetailHeader, OriginalSourceCards, LocationCard / `events/…/page.tsx` |
| 8 | **지도** (가장 큼, 필요하면 8a 패널 · 8b 장소 상세 · 8c 필터·검색으로 분할) | ExploreMapView, PlaceListSheet, `useSheetDrag`, PlaceBottomSheet, DiscoverFilterSheet, DiscoverSearchBar, InteractiveMap |
| 9 | **그리드 화면들** — recreeshot 홀·상세, journeys 목록·상세, shop, saved, topics | 각 page · `_components` |
| 10 | **프로필** | ProfileView, following, edit |
| 11 | **이미지 sizes · hover/focus 정리** | 각 청크에서 못다 한 것 |

지도(8)를 뒤에 둔 이유: 셸(3) · 시트(4) 가 먼저 안정돼야 지도가 그 위에서 조립되고,
인라인 높이 리팩터(§6 위험 1)가 모바일 지도에 닿는 유일한 청크라 단독으로 검증하고 싶다.

---

## 6. 위험 요소 (모바일 회귀 가능성 순)

1. **인라인 style 은 `lg:` 로 덮을 수 없다.** PlaceListSheet 높이(`getSheetHeight` → `style.height`),
   BottomNav 의 `bottom` · padding · gap, toast-provider 의 `bottom: 88` 등이 인라인이다.
   lg 에서 바꾸려면 인라인 값을 CSS 변수로 옮기고 클래스가 변수를 읽게 해야 한다
   (`style={{"--sheet-h": …}}` + `h-[var(--sheet-h)] lg:h-full`). **모바일 코드 경로를 건드리는 리팩터**라
   청크 1·3·8 에서 모바일 시트 드래그 · 스냅 · 탭바 퇴장을 반드시 실기기로 확인한다.
2. **JS 쪽 탭바 상수 `BOTTOM_NAV_SPACE = 90`.** CSS 변수를 0 으로 해도 `InteractiveMap` 카메라 패딩과
   `PlaceListSheet` 스냅은 90 을 계속 쓴다. lg 에서는 시트가 없어 스냅은 무관하지만, 카메라 패딩은
   지도 청크에서 CSS 변수를 읽어오는 방식(getComputedStyle 1회)으로 바꿔야 한다 — JS 폭 판정을 새로 넣지 않기 위해.
3. **MainArea 의 `overflow-x-hidden`** 때문에 `/feed` 외에는 sticky 가 동작하지 않는다.
   PC 의 sticky 사이드(홈 지도 카드, 게시글 미디어, 프로필 카드)는 이게 필요하다.
   전부 `clip` 으로 바꾸면 모바일의 /saved · /shop 탭바가 되살아나 헤더 뒤로 숨는다(주석에 기록된 회귀).
   → `lg:overflow-x-clip` 으로 PC 만 바꾸고, /saved · /shop 탭바는 lg 에서 top 오프셋을 따로 준다.
4. **이미 발동 중인 `md:` · `sm:` 클래스.** `PostCard md:w-[200px]` 등은 지금도 PC 에서 540 안에 적용된다.
   레이아웃이 바뀌면 이 값들이 새 맥락에서 다르게 보인다. 모바일(<768)에는 영향 없음.
5. **CSS 캐시 함정.** `html[data-nav-tucked] .nav-tuckable` 선택자는 이미 한 번 `.next` 캐시에 깨진 적 있다
   (CLAUDE.md). 이번에 `globals.css` 를 가장 많이 건드리므로 청크마다 `rm -rf .next` 후 확인,
   `:root` 안 여러 줄 주석 금지를 지킨다.
6. **Tailwind 는 조립된 클래스 문자열을 못 읽는다** (BottomNav 주석). `lg:` 변형을 템플릿 문자열로
   만들면 유틸리티가 생성되지 않는다. 전부 리터럴로 쓴다.
7. **페이지 내부의 무효였던 `max-w-2xl` 이 살아난다.** md 에서 720 컬럼 안 672 가 되어
   좌우 여백이 생긴다. 청크 2 에서 화면마다 유지/제거를 정한다.
8. **dvh 기반 높이** (`h-[100dvh]` 지도, `calc(100dvh-3rem)` 업로드). PC 브라우저에서는 문제없지만,
   지도 패널 전환 시 `100dvh` 와 레일 · 패널 폭 계산이 섞이지 않게 한다.

---

## 7. 합의가 필요한 것

1. PC 에서 모바일 숨김 화면(recreeshot 상세 등)에도 레일을 보일지 — 기본안: `isBottomNavHidden` 그대로
2. 바텀시트 lg 변형을 `sheet.tsx` 에 직접 넣을지, 공유 상수를 새로 둘지 — 기본안: `sheet.tsx`
3. 편집기(recreeshot · 코스)를 v1 에서 좁은 컬럼으로 둘지 — 기본안: 좁은 컬럼 유지
4. 새 이름: `--app-col-w`, `--side-nav-space` — 기존 `--bottom-nav-*` 명명을 따른 제안

---

# 구현 기록 (2026-09-30)

> 위 §1~§7 은 처음 제안이다. 구현 중에 lg 방향이 바뀌었다 — 바뀐 내용은 아래 **8. 방향 변경** 이 기준이다.
> 커밋은 하지 않았다. 아래 목록대로 사람이 나눠 커밋한다.

## 8. 방향 변경

| 순서 | 요청 | 반영 |
|---|---|---|
| 1 | 원안 (§2~§4) | 가운데 42rem 기둥을 기본으로, 넓은 화면만 `data-wide-layout` 로 폭 해제 |
| 2 | 에어비앤비 검색 화면 레퍼런스 | 기본을 **1440 넓은 컨테이너**로 뒤집음. 편집기만 `data-narrow-layout` 으로 42rem 유지. `data-wide-layout` 은 제거 |
| 3 | discover = 목록 + 지도 | 목록 패널 `clamp(min(440px, 50% - 12px), 42%, 680px)` + 오른쪽 지도 전부(둥근 모서리). 레일 오른쪽부터 화면 끝까지 `fixed` 로 채움 (1440 컨테이너 안 씀) |
| 4 | discover 장소 선택 | 목록 유지 · 선택 항목 링 강조 · 마커 클릭 → 목록 스크롤 · 목록 클릭 → 지도 이동 · X / Esc / 지도 클릭으로 닫기 |
| 5 | 플로팅 장소 카드 | 지도 폭 − 좌우 16, 저작권 줄 위 16, 높이 지도의 40% 이하, 한 줄 헤더, 240px 작은 카드 가로 스크롤 |
| 6 | 게시글 상세 | 왼쪽 = 사진 → 제목 블록 → 위치 카드 → From the Source, 오른쪽 = 나머지. sticky 없음. 블록은 한 번만 렌더 |

진행 범위도 바뀌었다 — 청크 5(캐러셀 화살표) · 9(그리드 화면) · 10(프로필) · 11(이미지 sizes) 은 **다음 라운드**.
다만 방향 2(넓은 컨테이너)가 그리드 화면을 1440 으로 펼치게 되어, 그 화면들이 깨지지 않을 만큼의 최소 대응
(열 수 · 좌우 여백)은 이번에 넣었다. 세부 배치는 다음 라운드다.

## 9. 청크별 변경 파일 (커밋 단위)

한 파일이 여러 청크에 걸친 것은 `*` 로 표시했다 — `git add -p` 로 나누거나, 뒤 청크에 합쳐 커밋한다.
`src/lib/brand.ts` · `src/app/icon.png`(삭제) · `src/app/icon.tsx` · `src/app/apple-icon.tsx` · `src/assets/` 는
**이 작업이 만든 변경이 아니다** (다른 세션 작업으로 보임). 이 커밋들에 넣지 않는다.

### 청크 1 — 폭 변수 도입 (화면 무변화)
`refactor(layout): replace hard-coded 540px column with --app-col-w`
- `src/app/globals.css`* (`--app-col-w: 540px`)
- `src/app/(user)/layout.tsx`*
- `src/app/(user)/_components/BottomNav.tsx`* · `ScrollToTopButton.tsx`*
- `src/app/(user)/recreeshot/_components/NewReCreeshotFab.tsx`*
- `src/app/(user)/posts/[slug]/_components/PostDetailHeader.tsx`* · `AttractionDetailSheet.tsx`*
- `src/app/(user)/topics/[slug]/_components/TopicDetailHeader.tsx`*
- `src/app/(user)/journeys/_components/PlaceAddSheet.tsx`* · `TopicPickSheet.tsx`*
- `src/app/(user)/recreeshot/new/_components/editor/ScoreSheet.tsx`* · `StickerPanel.tsx`*

### 청크 2 — md 확장
`feat(layout): widen app column to 42rem on md`
- `src/app/globals.css`* (md `--app-col-w: 42rem`)
- 그리드 `md:grid-cols-3`: `recreeshot/_components/HallGrid.tsx`* · `shop/_components/ShopClient.tsx`* · `shop/loading.tsx`* ·
  `saved/_components/SavedClient.tsx`* · `topics/[slug]/_components/PostsGrid.tsx`* · `profile/_components/ProfileView.tsx`* ·
  `journeys/page.tsx`* · `journeys/loading.tsx`*

### 청크 3 — PC 셸 · 왼쪽 레일 · 넓은 컨테이너
`feat(layout): add desktop shell with side rail and wide container`
- `src/app/globals.css`* (lg 변수 · 탭바 퇴장 max-lg 한정 · `.app-header` 좌우 여백 · `data-narrow-layout`)
- `src/app/(user)/layout.tsx`* · `_components/MainArea.tsx` · `_components/BottomNav.tsx`* · `_components/ScrollToTopButton.tsx`*
- `src/app/(user)/recreeshot/_components/NewReCreeshotFab.tsx`*
- `src/app/(user)/shop/_components/ShopClient.tsx`* · `saved/_components/SavedClient.tsx`* (sticky 탭바 `lg:top-12`)
- `src/app/(user)/posts/[slug]/_components/PostDetailHeader.tsx`* · `topics/[slug]/_components/TopicDetailHeader.tsx`* (레일 비키기)
- `data-narrow-layout`: `journeys/_components/CourseEditor.tsx` · `recreeshot/new/_components/ReCreeshotUploadFlow.tsx`* ·
  `recreeshot/[id]/edit/page.tsx` · `onboarding/_components/OnboardingFlow.tsx`
- `src/lib/bottom-nav.ts`* (`BOTTOM_NAV_SPACE_LG` · `isRailLayout` · `bottomNavSpace`)

### 청크 4 — 바텀시트 → 가운데 대화상자
`feat(ui): show bottom sheets as centered dialogs on desktop`
- `src/components/ui/sheet.tsx`
- 핸들 `lg:hidden`: `AttractionDetailSheet.tsx`* · `PlaceAddSheet.tsx`* · `TopicPickSheet.tsx`* · `ScoreSheet.tsx`* · `StickerPanel.tsx`*
- 하단 확인창 가운데: `src/components/ui/confirm-dialog.tsx` · `ReCreeshotUploadFlow.tsx`* · `ProfileView.tsx`*

### 청크 6 — 홈
`feat(feed): add desktop layout with sticky map card`
- `src/app/(user)/feed/page.tsx` · `feed/_components/KoreaMapCard.tsx` (`layout="stacked"`) · `feed/_components/HomeTopBar.tsx`
- `src/app/(user)/_components/HomeBannerCarousel.tsx` · `_components/InfiniteFeed.tsx`

### 청크 7 — 게시글 상세 · 이벤트 상세
`feat(post): add two-column desktop layout for post and event detail`
- `src/app/(user)/posts/[slug]/page.tsx` · `posts/[slug]/_components/PostDetailHeader.tsx`*
- `src/app/(user)/events/[collectionSlug]/[eventSlug]/page.tsx`

### 청크 8 — 지도 (목록 패널 + 지도, 장소 선택)
`feat(discover): add list-and-map desktop layout`
- `src/app/globals.css`* (`--discover-panel-w`)
- `src/app/(user)/discover/_components/ExploreMapView.tsx` · `DiscoverSearchBar.tsx` · `EventSearchBar.tsx` · `DiscoverTopicChips.tsx` ·
  `DiscoverActiveFacets.tsx` · `DiscoverFilterSheet.tsx` · `EventPeekCarousel.tsx`
- `src/components/maps/PlaceListSheet.tsx` · `PlaceListSheetCard.tsx` · `PlaceBottomSheet.tsx` · `PostCardCarousel.tsx` · `InteractiveMap.tsx`
- `src/app/(user)/_hooks/useRailLayout.ts` (신규) · `src/lib/bottom-nav.ts`*

### (다음 라운드 몫의 최소 대응) — 넓은 컨테이너에서 그리드 화면
`feat(layout): scale grid screens to the wide container`
- `recreeshot/page.tsx` · `HallGrid.tsx`* · `ShopClient.tsx`* · `shop/loading.tsx`* · `journeys/page.tsx`* · `journeys/loading.tsx`* ·
  `topics/[slug]/page.tsx` · `PostsGrid.tsx`* · `SavedClient.tsx`* · `ProfileView.tsx`*

## 10. 스스로 결정한 사항과 이유

| 결정 | 이유 |
|---|---|
| md 기둥 폭 = **42rem(672)** | 페이지 안쪽에 이미 있는 `max-w-2xl` 과 같은 폭이라 그 캡들이 계속 무효로 남는다. md 에서 페이지를 하나도 안 고쳐도 된다 |
| lg `--bottom-nav-space` = **24px** (0 이 아님) | 0 이면 이 변수를 쓰는 토스트 · 맨 위로 · 코스 복사 버튼이 화면 바닥에 붙는다. "떠 있는 요소가 바닥에서 띄우는 거리"로 의미를 바꿨다 |
| 레일 = 하단 알약을 90° 세운 것, 로고 없음 | 새 부품 없이 같은 물체로 읽힌다. 레일 폭 98 에 워드마크가 들어가지 않고, 홈 상단 바에 로고가 이미 있다 |
| 레일 라벨은 hover · focus 툴팁, 소문자 그대로 | 모바일에서 라벨을 뺀 이유(10px)는 PC 에도 있고, `capitalize` 는 recreeshot 소문자 규칙을 깬다 |
| 전역 토스트(`toast-provider`)는 손대지 않음 | admin 과 같이 쓰는 컴포넌트다. 뷰포트 가운데 · 바닥 88 은 PC 에서도 문제가 없다 |
| 인라인 style 은 옮기지 않고 `lg:…!`(important) 로 덮음 | `useSheetDrag` 가 드래그 중 `style.height` 를 직접 쓰고 React 가 되돌리는 구조라, CSS 변수로 옮기면 드래그 높이가 남는다(모바일 버그). 인라인을 그대로 두는 쪽이 모바일 코드 경로를 바꾸지 않는다 |
| JS 폭 판정은 `isRailLayout()`(계산) · `useRailLayout()`(동작) 두 곳만 | 배치는 전부 `lg:` 클래스. 카메라 여백 · 스냅(계산)과 discover 장소 선택(동작)만 폭에 따라 로직이 갈린다. 서버 스냅샷은 false 라 모바일 SSR 과 같다 |
| 홈 지도 카드는 두 벌 렌더(모바일 흐름 · lg 사이드) | 서버 컴포넌트 SVG 라 비용이 작고, DOM 순서를 바꾸면 모바일 순서가 흔들린다. SVG id 충돌은 `layout` 별 접미사로 막았다. (게시글 지도 카드는 iframe 이라 이 방식을 쓰지 않았다 — 아래) |
| 게시글 상세는 DOM 을 lg 두 열 모양으로, 모바일은 `display: contents` + `order` | 요구가 "한 번만 렌더". 대신 flex 항목 사이 마진이 겹치지 않아, 겹치던 두 경계(From the Source 뒤, 두 열의 끝)를 `sourceGapFix` · `tailGapFix` 로 보정했다 |
| discover 목록 2열 기준 = **패널 폭 600px 이상**(컨테이너 쿼리), xl 이 아님 | 1280~1440 에서 패널은 480~540 이라 가로형 카드 두 장이면 제목이 두 단어에서 잘렸다(스크린샷 확인). 카드 스타일을 바꾸지 않는 선에서 "넓을 때 2열"을 지키는 기준 |
| discover 패널 최소 440 은 `50% - 12px` 에 양보 | 1024 에서 440 을 지키면 지도가 목록보다 좁아진다. "지도 ≥ 목록" 을 우선했다 |
| 플로팅 카드 바닥 = 지도 아래 끝 + 42(저작권 줄 26 + 16) | "하단 16" 과 "로고 · 저작권 비가림"을 둘 다 지키려면 16 을 저작권 줄 위에서 잰다 |
| 선택 시 마커를 지도 높이 10% 위로 | 카드가 아래 40% 까지 오므로 가운데보다 조금 위에 두면 항상 카드 위 영역에 보인다. 마커 위치를 매번 재지 않는 단순한 방식 |
| discover FAB 는 lg 에서 지도 오른쪽 위 | 가운데 아래 카드와 겹치지 않게 |
| discover 목록 "맨 위로" 버튼은 lg 에서 숨김 | 화면 오른쪽 아래(지도 저작권 위)에 뜨게 된다. 마우스 환경이라 목록 휠 스크롤로 충분하다 |
| 프로필은 lg 에서 `max-w-5xl` | 한 사람의 모음이라 1440 전체로 펼치면 비어 보인다(프로필 본격 대응은 다음 라운드) |
| 저장(saved) 목록은 lg 에서도 672 가운데 | 목록형 카드라 넓히면 줄이 길어져 읽기 어렵다 |
| discover 목록 패널 위쪽 빈 줄(96~136) 유지 | 모바일도 facet 자리를 늘 비워 둔다(`needsTopReserve = true`). 같은 규칙을 따랐다 |

## 11. 검증

- 매 단계 `pnpm tsc --noEmit` · `pnpm build` 통과. 마지막 빌드 기준.
- **390px 회귀**: HEAD 를 scratchpad 워크트리에 따로 빌드해 두 프로덕션 서버를 띄우고, 15개 화면
  (feed · discover · 게시글 · recreeshot 홀·상세 · journeys 목록·상세 · topics · shop · saved · profile · login · policy · following · recreeshot/new)의
  보이는 모든 요소 좌표를 비교. **14개 화면 완전 일치.** 게시글 상세는 새 래퍼 박스(article · 두 열 래퍼)의 좌표만 다르고,
  글 · 이미지 · 버튼 · iframe 90개의 좌표와 페이지 높이(2399)는 완전 일치.
- 1024 · 1280 · 1440 에서 위 화면 모두 가로 스크롤 없음. 게시글 상세의 지도 iframe 은 1개.
- 비교의 한계: **로그아웃 상태, 시트 · 대화상자가 닫힌 첫 화면**만 비교했다. 이벤트 상세는 URL 을 찾지 못해 비교하지 못했다.

## 12. 직접 확인할 모바일 회귀 목록 (768 미만)

자동 비교가 닿지 않는 곳이다. 실기기(또는 DevTools 모바일)에서 본다.

1. **지도 시트 드래그 · 스냅 · 탭바 퇴장** — `PlaceListSheet` 에 lg 클래스가 붙었고, 스냅 계산이 `bottomNavSpace()` 를 거친다.
   tab-only ↔ half ↔ full 을 끌어 보고, full 에서 탭바가 가라앉는지.
2. **지도 카메라** — 마커 탭 · 목록 카드 탭 · "전체 보기" 에서 초점이 예전처럼 시트 위쪽에 오는지 (`InteractiveMap` 의 `cameraInsets`).
3. **장소 카드(PlaceBottomSheet)** — 헤더에 `lg:contents` · `order` 가 붙었다. 모바일에서 장소명 · 아이콘 · 주소 두 줄 배치 그대로인지. 캐러셀 점 표시가 있는지.
4. **게시글 상세, 경우별 간격** — 배너 없는 글 · From the Source 없는 글 · 크레딧 없는 글 · Nearby 가 안 뜨는 글(shop 글) 에서
   블록 사이 간격이 예전과 같은지. 이 네 경우는 자동 비교에 없다.
5. **바텀시트 5종** (AttractionDetailSheet · PlaceAddSheet · TopicPickSheet · ScoreSheet · StickerPanel) — 여는 애니메이션 · 핸들 · 폭.
6. **확인창** (댓글 삭제 · 팔로우 해제 · 코스 편집기 3종 · 업로드 이탈 · 탈퇴) — 아래 정렬 그대로인지.
7. **탭바** — 아이콘 · 활성 원 · 등장 애니메이션. 키보드 포커스 링은 lg 에만 추가했다.
8. **/saved · /shop 탭바** — 모바일에서는 여전히 붙지(sticky) 않아야 한다(기존 동작).
9. **이벤트 상세** — 포스터 위로 22px 겹치는 시트(인라인 marginTop 을 같은 값의 클래스로 옮김).
10. **홈** — 배너 캐러셀 · 무한 피드 · 지도 카드(두 벌 중 모바일 것만 보이는지).

## 13. 다음 라운드

- 청크 5: 가로 캐러셀 화살표(HScrollSection), 퍼센트 폭 카드(EventVertical 42%, PostCardCarousel 모바일 85% 등)
- 청크 9: 그리드 화면 세부 배치(recreeshot 홀 FAB → 헤더 버튼, recreeshot 상세 2단, journeys 상세 목록+지도, topics 2열)
- 청크 10: 프로필 PC 배치(왼쪽 프로필 카드 sticky, 설정 드로어 → 팝오버)
- 청크 11: 이미지 `sizes` 전면 정리, hover · focus-visible 상태
- 알려진 것: 게시글 댓글은 lg 에서 1440 전체 폭으로 펼쳐진다(읽기 폭 제한 필요). recreeshot 상세 · 편집 계열은 레일 없이(`isBottomNavHidden`) 좁은 기둥.
