# E2b 착수 전 정찰 보고서 (READ-ONLY)

작성 시점 기준 실제 브랜치: **`feature/#253`** (지시문에는 `feature/#250` 으로 적혀 있었다).
워킹 트리 clean. 파일 수정·커밋·`.next` 삭제 없음. 이 보고서 파일만 새로 만들었다.

지시문 원문이 중간에 잘려 있었다 —
항목 2 의 번호가 없고, 항목 4 의 두 번째 줄이 `PUBLIC_RECREESHOT_WHERE` 도중에
끊겨 항목 **5 가 무엇을 묻는지 확인할 수 없다**. 항목 4 는 남은 단서(`visibility.ts` 전체,
두 상수)까지 조사했고, 항목 6(로딩 구조)·7 은 그대로 조사했다.
**항목 5 는 조사하지 못했다** — 무엇을 묻는지 못 찾음.

---

## 1. Hot 탭 현재 구조

### 1.1 라우트와 데이터 fetch 위치

`/` 는 `/feed` 로 redirect 만 한다 — `src/app/(user)/page.tsx:4`.
실제 홈은 **`src/app/(user)/feed/page.tsx`** (async 서버 컴포넌트).

데이터는 **전부 page 에서 한 번에** 받는다. 섹션 컴포넌트 안에서 조회하는 것은 없다.

| 순서 | 호출 | 근거 |
|---|---|---|
| 1 | `getCurrentUser()` | `feed/page.tsx:24` |
| 2 | `getMyFollows(user.id)` — 탭바가 먼저 필요해 단독 await | `feed/page.tsx:28` |
| 3 | `resolveFeedTab(tab, tabTopics)` | `feed/page.tsx:34` |
| 4 | `Promise.all` 6종: `getHomeBanners()` · `getCuratedSections({showOnHome:true})` · `prisma.tagGroupConfig.findMany` · `getSavedPostIds()` · `fetchLatestFeed({})` · `prisma.guideVideo.findFirst` | `feed/page.tsx:37-47` |
| 5 | `getSectionData(sections)` — 4번 결과에 의존해 뒤에 남음 | `feed/page.tsx:50` |

`searchParams.tab` 을 읽으므로 이 페이지는 동적 렌더링이다 (`feed/page.tsx:21-22`).

### 1.2 E2a 에서 추출된 섹션 컴포넌트

E2a 해당 커밋은 `0f1478a refactor(feed): extract home sections and unify empty state`
(CuratedSections·FreshDrops 신설) 과 `eb68ca2 feat(feed): replace home header with sticky search and tab bar`
(HomeTopBar·HomeSearchBar 신설) 두 건이다. 디렉토리 전체가 5개 파일이다.

| 컴포넌트 | 경로 | 종류 | props |
|---|---|---|---|
| `HomeTopBar` | `src/app/(user)/feed/_components/HomeTopBar.tsx:23` | 서버 | `{ activeTab: FeedTab; topics: readonly TabTopic[]; isLoggedIn: boolean }` |
| `HomeSearchBar` | `src/app/(user)/feed/_components/HomeSearchBar.tsx:13` | 서버 | 없음 (props 0개) |
| `HomeTabBar` | `src/app/(user)/feed/_components/HomeTabBar.tsx:51` | 서버 | `{ activeTab: FeedTab; topics: readonly TabTopic[]; isLoggedIn: boolean }` |
| `CuratedSections` | `src/app/(user)/feed/_components/CuratedSections.tsx:17` | 서버 | `{ sections: CuratedSectionWithSlug[]; sectionData: SectionData[]; tagGroupMap: TagGroupColorMap; savedPostIds: Set<string>; guideVideo: GuideVideo \| null }` |
| `FreshDrops` | `src/app/(user)/feed/_components/FreshDrops.tsx:7` | 서버 | `{ initialPosts: PostItem[]; initialCursor: string \| null; savedPostIds: Set<string>; tagGroupMap: TagGroupColorMap }` |

`feed/_components` 안에 `"use client"` 파일은 **하나도 없다** (5개 전부 서버 컴포넌트).
`GuideVideo` 는 `CuratedSections.tsx:9` 에 로컬 타입으로 선언돼 있다
(`{ videoUrl: string; thumbnailUrl: string | null; titleEn: string }`).

홈이 쓰는 그 아래 컴포넌트의 경계:

| 컴포넌트 | 경로 | 종류 |
|---|---|---|
| `HomeBannerCarousel` | `src/app/(user)/_components/HomeBannerCarousel.tsx` | 서버 |
| `HScrollSection` | `src/components/curation/HScrollSection.tsx:5` | 서버 · props `{ title; moreHref?; showMore=true; children }` |
| `PostCard` | `src/app/(user)/_components/PostCard.tsx` | 서버 |
| `ReCreeshotImage` | `src/components/recreeshot-image.tsx` | 서버 |
| `GuideVideoCard` | `src/app/(user)/_components/GuideVideoCard.tsx` | **CLIENT** |
| `InfiniteFeed` | `src/app/(user)/_components/InfiniteFeed.tsx` | **CLIENT** (FreshDrops 가 감싼다) |
| `FeedbackForm` | `src/components/feedback/FeedbackForm.tsx` | **CLIENT** |

### 1.3 `HotTabStub.tsx`

**아직 쓰인다. 단, 홈이 아니라 discover 에서.**

- 정의: `src/app/(user)/discover/_components/HotTabStub.tsx:19`
- import: `src/app/(user)/discover/_components/ExploreMapView.tsx:26`
- 렌더: `src/app/(user)/discover/_components/ExploreMapView.tsx:873` —
  `PlaceListSheet` 안에서 `hasFilters` 가 거짓일 때(= discover 의 "필터 없음" 상태) 그려지는 쪽.

`feed` 트리에서 `HotTabStub` 을 참조하는 곳은 없다. props 는 전부 optional 이다
(`HotTabStub.tsx:10-17`), 안에서 `EventVerticalCarousel` 제목을 `"Catch it in London Now"` 로
하드코딩하고 있다 (`HotTabStub.tsx:28`).

### 1.4 조사 중 눈에 걸린 것 (고치지 않음)

`activeTab` 은 계산되어 `HomeTopBar` 에만 내려간다 (`feed/page.tsx:68`).
`feed/page.tsx` 본문에 `activeTab.kind` 로 갈라지는 분기가 **없다** —
지금은 토픽 탭을 눌러도 Hot 탭과 완전히 같은 내용이 나온다 (명세 3.3 미구현).

---

## 2. 지도 자산

### 2.1 `public/korea.svg`

- 크기: **19,529 바이트** (`wc -c`)
- `viewBox="0 0 255.96 240"` — 파일 내 유일
- 루트 `<svg>` 태그에 `fill="currentColor"` 가 직접 걸려 있다. 파일 전체에서
  `fill=` 속성은 이 하나뿐이고 `currentColor` 도 1회만 등장한다.
- `<path>` 1개, `<g>` 0개, `id` 속성 0개 — 시도별로 나뉘지 않은 **단일 path**다
  (의도된 설계: `prisma/scripts/generate-korea-svg.ts:22-23` "17개 폴리곤을 합쳐 단일 `<path>` 하나로 낸다").
- 원문 첫 줄:
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 255.96 240" fill="currentColor"><path d="M118.49 …`

시도별 개별 path 가 없으므로 **SVG 를 시도 단위로 칠하거나 클릭 영역으로 쓸 수 없다.**
핫스팟(원)을 위에 겹치는 방식만 가능하다.

### 2.2 `src/lib/korea-projection.ts` export 목록

| export | 종류 | 값 / 시그니처 |
|---|---|---|
| `KOREA_BOUNDS` | const | `{ minLon:124.5, maxLon:132.0, minLat:33.0, maxLat:38.7 }` — `korea-projection.ts:12-17` |
| `VIEW_HEIGHT` | const | `240` — `:24` |
| `VIEW_WIDTH` | const | 계산값 `255.96` — `:29-31` |
| `KOREA_VIEWBOX` | const | `"0 0 255.96 240"` — `:34` (커밋된 SVG 의 viewBox 와 일치) |
| `projectKorea` | function | `(lon: number, lat: number) => { x: number; y: number }` — 입력 **WGS84 경도/위도(도)**, 출력 **SVG viewBox 좌표**(y 는 북쪽이 위라 반전) — `:37-42` |
| `KM_PER_UNIT` | const | `111.32 / SCALE` — `:45` |
| `SidoKey` | type | 17개 문자열 리터럴 유니온 — `:50-55` |
| `SIDO_PIN` | const | 아래 2.3 — `:66-84` |
| `SIDO_KEYS` | const | `SidoKey[]` — `Object.keys(SIDO_PIN)` 순서 그대로 — `:86` |
| `HOTSPOT_CORE_R` | const | `3` — `:91` |
| `HOTSPOT_MIN_R` | const | `4` — `:93` |
| `HOTSPOT_MAX_R` | const | `12` — `:94` |
| `hotspotRadius` | function | `(count: number, maxCount: number) => number` — 로그 스케일, 0 이면 0, 4~12 로 clamp — `:100-106` |

내부 비공개: `LAT0`, `COS_LAT0`, `SCALE`, `round2`.
투영은 cos(lat0) 보정 정거원통도법을 직접 구현한 것이고 d3-geo 를 쓰지 않는다 (`:7-9`).
생성 스크립트 `prisma/scripts/generate-korea-svg.ts:26` 이 **같은 모듈**을 import 한다 —
상수를 바꾸면 SVG 를 다시 생성해야 한다 (`korea-projection.ts:5`).

### 2.3 `SIDO_PIN`

정의: `src/lib/korea-projection.ts:66`.

```ts
Record<SidoKey, { lat: number; lon: number }>
```

- 키 = `SidoKey` (Natural Earth 10m admin-1 의 영문 시도명 17개:
  `Seoul`, `Busan`, `Daegu`, `Incheon`, `Gwangju`, `Daejeon`, `Ulsan`, `Sejong`,
  `Gyeonggi`, `Gangwon`, `North Chungcheong`, `South Chungcheong`, `North Jeolla`,
  `South Jeolla`, `North Gyeongsang`, `South Gyeongsang`, `Jeju`)
- 값 = `{ lat, lon }` 위경도 한 쌍뿐. 이름·표시 문구·링크 같은 건 **들어있지 않다.**
- 좌표는 장소 평균이 아니라 **손으로 고정한 값**이다 (`:57-65`, 경기도가 서울 도넛 구멍으로
  들어오는 문제 때문).
- `SIDO_KEYS` 의 배열 순서는 객체 리터럴 순서 = Seoul → Incheon → Gyeonggi → Gangwon →
  North Chungcheong → South Chungcheong → Sejong → Daejeon → North Jeolla → Gwangju →
  South Jeolla → North Gyeongsang → Daegu → South Gyeongsang → Busan → Ulsan → Jeju
  (`SidoKey` 유니온의 선언 순서와는 다르다).

### 2.4 `getSidoPlaceCounts()`

정의: `src/lib/area-queries.ts:86-90`.

```ts
export const getSidoPlaceCounts: () => Promise<SidoPlaceCounts>
```

반환 타입 (`area-queries.ts:37-47`):

```ts
type SidoPlaceCount = { sido: SidoKey; areaNameEn: string; count: number };

type SidoPlaceCounts = {
  counts: SidoPlaceCount[];   // count desc 정렬 (:76)
  maxCount: number;           // counts[0].count, 비면 0 (:77)
  total: number;              // areaId 가 붙은 Place 총합 (areaId NULL 제외)
  unmapped: { areaNameEn: string; count: number }[];
};
```

캐시: **`unstable_cache` 사용.** `keyParts = ["sido-place-counts"]`,
`revalidate: 300` (5분), `tags: ["sido-place-counts"]` — `area-queries.ts:86-90`.
캐시를 우회하는 `computeSidoPlaceCounts` 도 함께 export 한다 (`:92`).

본체는 `prisma.$queryRaw` 원시 SQL 이다 (`:55-62`) — `Place → Area → parent Area` 를 타고
시도명을 올리고, 세종처럼 level 0 에 직접 붙는 경우를 `COALESCE` 로 받는다.

매핑표 `AREA_NAME_TO_SIDO` 는 `Area.nameEn` 16개 → `SidoKey` 다 (`:18-35`).
경계는 17개인데 Area 는 16개 — `Jeonnam-Gwangju` 가 `South Jeolla` 로 합쳐져
**`Gwangju` 핀에는 영영 장소가 붙지 않는다(항상 0 → 핫스팟 안 그려짐)** (`:9-12` 주석에 명시).

**호출처: 없음.** `getSidoPlaceCounts`·`computeSidoPlaceCounts` 를 부르는 코드가
`src/`·`prisma/` 어디에도 없다. `korea.svg` 를 쓰는 컴포넌트도 없다
(`grep -rln "korea.svg|KOREA_VIEWBOX|projectKorea|hotspotRadius|Where fans"` →
`src/lib/area-queries.ts`, `src/lib/korea-projection.ts`, `prisma/scripts/generate-korea-svg.ts` 뿐).
즉 한반도 카드 컴포넌트는 **아직 없다** — 데이터·투영·SVG 만 준비된 상태다.

---

## 3. 쿼리 3종 시그니처

### 3.1 `getPopularIds` — `src/lib/popular-queries.ts:113`

```ts
export const getPopularIds: (
  targetType: PopularTargetType,          // "POST" | "RECREESHOT"
  { limit }: { limit: number },
) => Promise<PopularIds>

type PopularIds = { ids: string[]; period: "recent" | "allTime" };
```

- `unstable_cache`, `["popular-ids"]`, `revalidate: 300`, `tags: ["popular-ids"]` (`:113-118`)
- **id 만 돌려준다.** 본문 조회와 개인화(내 저장 여부)는 호출자 몫 (`:108-111`)
- `ids` 의 배열 순서가 곧 표시 순서 (`:23`)
- 최근 7일(`POPULAR_WINDOW_DAYS = 7`, `:7`) 저장 수 기준. 노출 조건 통과분이
  `POPULAR_MIN_RECENT = 4` (`:15`) 미만이면 최근 결과를 버리고 전체 기간 `saveCount` 로
  통째 교체하며 `period: "allTime"` 을 준다 (`:102-105`). 섞지 않는다.
- 캐시 미경유 출구 `computePopularIds(targetType, limit)` 도 export (`:71`)

**호출처: 없음.** `getPopularIds`·`computePopularIds` 모두 정의 파일 밖에서 참조되지 않는다.

### 3.2 `fetchFollowFeed` — `src/app/(user)/_actions/feed-actions.ts:29`

`"use server"` 파일이다 (`feed-actions.ts:1`).

```ts
export async function fetchFollowFeed(
  { cursor }: { cursor?: string } = {},
): Promise<{ posts: PostItem[]; nextCursor: string | null }>
```

- **비로그인일 때: `{ posts: [], nextCursor: null }` 을 반환한다** (throw 도 null 도 아니다) — `:34-35`
- 구독 토픽이 0개일 때도 같은 빈 결과 — `:39`
- take 가 10 으로 하드코딩돼 있다 (`:47` 과 `:54`). 인자로 받지 않는다
  (`fetchLatestFeed` 는 `take` 를 받고 `DEFAULT_TAKE = 10`, `:8`·`:10-16`)
- `nextCursor` = `posts.length === 10` 일 때 마지막 post id, 아니면 null (`:54`)
- where 절을 `PUBLIC_PLACE_POST_WHERE` 스프레드 대신 손으로 다시 적었다
  (`status: "PUBLISHED", isShop: false` — `:43-45`). 지금은 내용이 동일하지만
  상수가 늘어나면 어긋난다 — 그대로 적기만 한다.

**호출처: 없음.** 정의 파일 밖에서 참조되지 않는다.
(같은 파일의 `fetchLatestFeed` 는 `feed/page.tsx:45` 와 `FreshDrops.tsx:29` 가 쓴다.)

### 3.3 `getPublicCourses` — `src/lib/course-queries.ts:160`

```ts
export async function getPublicCourses(options?: {
  take?: number;
  cursor?: string;   // 시그니처만 받아둔 상태. 본문에서 쓰지 않는다 (:162-164, :166-171)
}): Promise<CourseListItem[]>
```

- `where: { isPublic: true }` 하나. `orderBy: [{createdAt:"desc"},{id:"desc"}]`,
  `take: options?.take ?? DEFAULT_TAKE(50)` — `:166-171`
- 캐시 없음 (`unstable_cache` 미사용)
- `CourseListItem` 은 `course-queries.ts:81-97` —
  `id, title, description, authorId, authorName(nullable), isPublic, copyCount,
  coverImageUrl, dayCount, itemCount, topics: CourseTopicLabel[], createdAt, updatedAt`.
  Date 는 전부 ISO 문자열로 변환해 내보낸다 (`:56` 주석, `toListItem` `:137-153`)
- **제목 `[MOCK]` 필터가 없다.** 명세 3.2 6행은 `[MOCK]` 제외를 요구하지만
  이 함수에는 그 조건이 없다.

**호출처: `src/app/(user)/journeys/page.tsx:13`** 한 곳 (`getMyCourses` 와 `Promise.all`).
`course-actions.ts:732` 는 주석에서 이름만 언급.
카드 컴포넌트는 `CourseCard`(`src/app/(user)/journeys/_components/CourseCard.tsx:7`,
서버 컴포넌트, props `{ course: CourseListItem; isMine?: boolean }`) 이고
`grid-cols-2` 로 깔려 있다 (`journeys/page.tsx:50`·`:69`) — 가로 스크롤 섹션용이 아니다.

---

## 4. 노출 조건 현황

### 4.1 `src/lib/visibility.ts` 전체 (19줄, 전문)

```ts
// 사용자 화면의 공개 노출 조건 — 서버 전용
//
// "이 콘텐츠를 비로그인 사용자에게 보여도 되는가" 하나만 담는다.
// 목록마다 더 붙는 조건(토픽·지역·저장 여부)은 각 쿼리가 스프레드로 합친다.
//
// 한곳에 두는 이유: 같은 판단이 화면마다 흩어져 있으면 한쪽만 고쳐져
// 홈에서는 안 보이는 포스트가 인기 목록에는 나오는 식으로 어긋난다.
import type { Prisma } from "@prisma/client";

// 샵 포스트 제외. 샵까지 포함하려면 status 조건만 따로 쓸 것
export const PUBLIC_PLACE_POST_WHERE = {
  status: "PUBLISHED",
  isShop: false,
} satisfies Prisma.PostWhereInput;

/** 공개된 리크리샷. 신고·숨김·삭제 상태는 전부 빠진다 */
export const PUBLIC_RECREESHOT_WHERE = {
  status: "ACTIVE",
} satisfies Prisma.ReCreeshotWhereInput;
```

### 4.2 두 상수의 사용처 전량

`PUBLIC_PLACE_POST_WHERE` (`visibility.ts:11`):
- `src/app/(user)/_actions/feed-actions.ts:6`(import) · `:18` (`fetchLatestFeed`)
- `src/lib/popular-queries.ts:4`(import) · `:53` (`listVisible` POST 분기)

`PUBLIC_RECREESHOT_WHERE` (`visibility.ts:17`):
- `src/app/(user)/recreeshot/page.tsx:2`(import) · `:8`
- `src/lib/popular-queries.ts:4`(import) · `:60` (`listVisible` RECREESHOT 분기)

눈에 걸린 것 (고치지 않음):
- 이름에 `PLACE` 가 들어 있지만 **`placeId != null` 조건이 없다.** 명세 3.3 5행·5.1 이
  말하는 "장소가 연결된 포스트만" 은 이 상수로 보장되지 않는다.
- `fetchFollowFeed` 는 이 상수를 import 해두고도 쓰지 않고 조건을 손으로 재작성했다
  (3.2 참고).

---

## 5. (지시문 유실)

지시문이 항목 4 중간에서 끊겨 항목 5 의 내용을 확인할 수 없다. **조사하지 못했다.**
필요한 항목을 알려주면 같은 형식으로 채운다.

---

## 6. 로딩 구조

- **홈 경로에 `loading.tsx` 가 없다.**
  `src/app/(user)/feed/loading.tsx` 없음 · `src/app/(user)/loading.tsx` 없음 ·
  `src/app/loading.tsx` 없음.
- 프로젝트 전체의 `loading.tsx` 는 5개이고 전부 홈 밖이다:
  `src/app/(user)/journeys/loading.tsx`, `journeys/[id]/loading.tsx`,
  `journeys/[id]/edit/loading.tsx`, `journeys/new/loading.tsx`,
  `src/app/(user)/shop/loading.tsx`.
- **`<Suspense>` 를 쓰는 곳이 코드베이스 전체에 하나도 없다.**
  `grep -rn "Suspense" src/` 결과 0건 (확장자 무관).

따라서 지금 홈은 `Promise.all` 6종 + `getSectionData` 가 **전부 끝날 때까지** 아무것도
그리지 않는 단일 대기 구조다. 스트리밍 경계가 없다.

---

## 7. Journey 목데이터 (dev DB 기준)

dev DB 직접 조회 (READ-ONLY `SELECT` 만, scratchpad 스크립트로 실행.
연결 문자열이 dev ref `vvcyimilydgisrkgqqbv` 를 포함하고 prod ref 를 포함하지 않는 것을
실행 전에 확인했다):

| 질의 | 결과 |
|---|---|
| `COUNT(*) FROM "Course"` (공개 무관) | **1** |
| `COUNT(*) WHERE isPublic = true` | **1** |
| `COUNT(*) WHERE isPublic = true AND title LIKE '[MOCK]%'` | **0** |
| `COUNT(*) WHERE isPublic = true AND title NOT LIKE '[MOCK]%'` | **1** |

유일한 공개 Course: `b7db2c8c-c830-49a8-b8a8-8d949e140a26`
— `BTS Seoul Tour: From Trainee Days to Art & Heritage`

즉 **dev DB 에 `[MOCK]` Course 는 0건이다.** 목 시드를 돌리지 않았거나 `--clean` 으로
지운 상태다. 지금 dev 에서 Journeys 섹션을 보면 카드가 1장만 나온다.

`[MOCK]` 문자열이 코드에 등장하는 곳:

| 경로:줄 | 내용 |
|---|---|
| `prisma/scripts/seed-mock-courses.ts:27` | `const MOCK_PREFIX = "[MOCK] "` (뒤에 공백 1칸 포함) |
| `prisma/scripts/seed-mock-courses.ts:17-19` | 주석 — `--clean` 이 이 접두사만 지운다 |
| `prisma/scripts/seed-mock-courses.ts:127`·`139`·`149` | `SPECS` 의 코스 제목 3종 (`BTS Seoul Pilgrimage`, `BTS × TXT Hybe Route`, `Gangneung Sea & Coffee`) |
| `prisma/scripts/seed-mock-courses.ts:166`·`176`·`183` | `title: { startsWith: MOCK_PREFIX }` 조회·삭제·카운트 |
| `prisma/scripts/seed-mock-courses.ts:474` | 출력용 `title.replace(MOCK_PREFIX, "")` |
| `docs/design/home-discover.md:66` | 명세 — Journeys 섹션은 `[MOCK]` 제외 |

**`src/` 안에는 `[MOCK]` 이 단 한 번도 등장하지 않는다.** 런타임 쿼리에 제외 필터가 없다
(3.3 참고). 이 스크립트는 `prod` ref 를 감지하면 즉시 중단하는 가드를 갖고 있다
(`seed-mock-courses.ts:32-45`).

눈에 걸린 것 (고치지 않음): 파일 머리 주석은 "코스 9개(내 것 5 + 남의 공개 4)" 라고
적혀 있지만 (`seed-mock-courses.ts:13-15`), 실제 `SPECS` 는 **3개**이고
`owner` 는 `me` 1 / `@park` 1 / `@swimmer` 1, 셋 다 `isPublic: true` 다
(`:125-160`). 주석이 실제와 다르다 — 목 시드를 돌려도 내 비공개 코스는 생기지 않는다.

---

## E2b 구현에 걸림돌이 될 것 같은 점 (3줄)

1. `korea.svg` 가 시도 경계 없는 **단일 `<path>`** 라 시도별 칠하기·클릭이 불가능하고,
   `Gwangju` 핀은 Area 병합(`Jeonnam-Gwangju`) 때문에 구조적으로 영구 0 이다.
2. E2b 가 쓸 쿼리 3종(`getPopularIds`·`fetchFollowFeed`·`getSidoPlaceCounts`)이 **전부 호출처 0**
   = 실데이터로 한 번도 검증된 적이 없고, `getPublicCourses` 에는 명세가 요구하는
   `[MOCK]` 제외 필터가 아직 없다.
3. 홈에 `loading.tsx` 도 `<Suspense>` 도 없어 섹션 3개가 늘면 그만큼 첫 페인트가 통째로
   늦어지는데, dev DB 는 공개 Course 1건 · `[MOCK]` 0건이라 Journeys 섹션은 지금 눈으로
   확인할 수 없다(목 시드를 먼저 돌려야 한다).
