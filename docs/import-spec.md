# 서포터즈 데이터 일괄 등록 — 데이터 명세서

작성일 2026-10-03 · 기준 브랜치 `feature/recree-desktop` · 기준 코드 `prisma/schema.prisma`, `src/app/(user)/posts/[slug]/page.tsx`

게시글(Post) 1건 = 장소(Place) 1곳 + 출처(PostSource) 여러 개 + 토픽·태그 연결.
예시 템플릿은 `docs/import-template.json` 에 있다.
템플릿의 `spotInsight` 키는 어드민 폼의 `SpotInsightData` 와 같은 이름이다 — `mustTryEn/contextEn/tipEn` → `PostPlace.insightEn` JSON, `mustTryKo/contextKo/tipKo` → `PostPlace.mustTry/context/tip`, `vibe` → `PostPlace.vibe`.
`place.area` 는 Area 를 찾기 위한 이름이며 DB 컬럼이 아니다 (2-6).

---

## 0. 꼭 지킬 것

| 규칙 | 이유 |
|---|---|
| **추가만 한다.** 기존 Place·Post 행을 update·delete 하지 않는다 | prod 데이터 원칙. reCree 와 concertrip 이 prod DB 를 같이 쓴다 |
| 스키마(컬럼·enum)를 바꾸지 않는다 | 위와 같음 |
| 상태는 전부 `DRAFT` 로 넣는다 | 검수 후 어드민에서 발행한다 (4절) |
| 게시글 1건에 장소는 **1곳** | 상세 화면은 `postPlaces[0]` 하나만 그린다. 2곳 이상 넣어도 두 번째부터는 안 보인다 |
| Place 행과 연결 행은 한 트랜잭션으로 쓴다 | `Place.placeTypes`(문자열 배열)와 `PlacePlaceType` 이 어긋나면 지도 카테고리가 장소를 놓친다 |
| TourAPI 응답을 DB 에 저장하지 않는다 | 프로젝트 규칙 |

---

## 1. 기존 가져오기 기능

**있다.** 어드민 `/admin/import` — 구글 시트 가져오기.

- 코드: `src/app/admin/import/_actions/import-actions.ts`
- 입력: 환경변수 `GOOGLE_SHEETS_ID`·`GOOGLE_SHEETS_GID` 의 시트를 CSV 로 받는다. **첫 줄(그룹 헤더)은 버리고** 둘째 줄을 컬럼명으로 쓴다. 컬럼명은 소문자·공백→`_` 로 정규화된다.
- 대상 행: `status = 완료` **그리고** `review_status = 채택` 인 행만.
- 미리보기 → 행 선택 → 임포트의 2단계.

### 받는 컬럼 → 만드는 것

| 시트 컬럼 | 저장 위치 | 비고 |
|---|---|---|
| `place_name` | `Place.nameKo` (Places API 결과가 있으면 그쪽 우선) | |
| `title` | `Post.titleKo` | 비면 `[임시] {장소명}`. **`titleEn` 은 빈 문자열로 들어간다** |
| `google_maps_link` | `Place.googleMapsUrl` | 단축 URL 은 확장 후 저장. `/place/` URL 이면 Google Places API 로 이름·주소(ko/en)·좌표·전화·영업시간·평점·`googlePlaceId` 를 채운다 |
| `street_view_url` | `Place.streetViewUrl` | 좌표가 없을 때 panoid 로 좌표를 구한다 |
| `map_pin_icon` | `Place.placeTypes` + `PlacePlaceType` | 쉼표 구분. 마스터에 없는 이름이 하나라도 있으면 그 행 전체 거부 |
| `close_or_not` | `Place.status` | `폐업` → `CLOSED_PERMANENT`, 그 외 `OPEN` |
| `getting_there` | `Place.gettingThere` | |
| `story` | `Post.bodyKo` | 한국어. 화면은 `bodyEn` 을 그린다 |
| `memo` | `Post.memo` | |
| `context` / `vibe` / `must_try` / `tip` | `PostPlace.context` / `vibe[]` / `mustTry` / `tip` | **한국어 컬럼.** 화면이 읽는 `insightEn` 은 채우지 않는다 |
| `source_url` | `PostSource` (PRIMARY) | 쉼표로 여러 개. `source_detail`·`source_note`·`source_post_date` 는 첫 번째에만 |
| `reference_url` | `PostSource` (REFERENCE) | 쉼표로 여러 개 |
| `source_type` | 사실상 무시 | 매핑표(instagram→INSTAGRAM 등)에 `REFERENCE` 가 없어 `source_url` 은 항상 PRIMARY 로 들어간다 |
| `collected_by` / `collected_at` | `Post.collectedBy` / `collectedAt` | |
| `category`, `genre`, `artist_work`, `sub_detail`, `tag_group`, `tags`, `banner_image`, `recreeshot_original_image` | `Post.importNote` (JSON 문자열) 에 원문 보관만 | **토픽·태그·이미지는 연결하지 않는다** |

만들어지는 결과: Place(새로 또는 기존 재사용) + Post(`DRAFT`, slug 는 `{장소 영문명}-{랜덤 6자}`) + PostSource + PostPlace.
**만들지 않는 것:** `titleEn`, `bodyEn`, `insightEn`, PostTopic, PostTag, PostImage, `Place.areaId`.
즉 기존 임포트 결과물은 화면에 영어 제목·Story·Fan To-Do·라벨·사진이 전부 비어 있어 어드민에서 사람이 마저 채우는 전제다.

> 대표 스크립트가 이 기능과 같은 결과를 내려면 2절의 "화면에 보이는" 컬럼까지 직접 채워야 한다.

---

## 2. 게시글 1건에 필요한 데이터 (화면에 실제 보이는 것 기준)

표기: **필수** = DB 가 NOT NULL 이거나 비우면 화면이 깨지는 것 · **발행필수** = DRAFT 로는 비워도 되지만 발행 버튼이 막는 것 · **권장** = 비워도 되지만 화면에서 그 블록이 사라지는 것 · **선택**

### 2-1. Post

| 화면 위치 | 컬럼 | 타입 | 구분 | 허용 값 / 규칙 | 예시 |
|---|---|---|---|---|---|
| 제목 아래 작은 줄 (`h1`) | `titleEn` | String | **필수** (발행필수) | 영어. 화면이 그리는 제목은 이것 하나 | `Where Jimin filmed the "Who" MV` |
| (화면에 안 보임) | `titleKo` | String | **필수** (NOT NULL, 발행필수) | 한국어 | `지민 'Who' 뮤직비디오 촬영지` |
| URL | `slug` | String | **필수** (unique) | 정규식 `^[a-z0-9]+(?:-[a-z0-9]+)*$` — 소문자·숫자·하이픈, 하이픈 연속·양끝 금지. 중복이면 P2002 오류 | `jimin-who-mv-hangang-park` |
| Story 카드 | `bodyEn` | String? | 권장 | 영어. 마크다운 렌더링. 비우면 Story 카드 없음. 앞 160자는 메타 description 에도 쓰인다 | `Jimin walks along the river at dusk…` |
| (화면에 안 보임) | `bodyKo` | String? | 선택 | | |
| 상태 | `status` | `PostStatus` | **필수** | `DRAFT` \| `PUBLISHED` — 이번 스크립트는 `DRAFT` 고정 (4절) | `DRAFT` |
| | `publishedAt` | DateTime? | — | `DRAFT` 면 `null` | `null` |
| 출처 문구 `Source: …` | `source` | String? | 선택 | 자유 텍스트. 출처 카드 아래 한 줄 | `Mnet M Countdown` |
| 부제 | `subtitle` | String? | **비워도 됨** | shop 게시글(`isShop=true`)이고 장소가 없을 때만 보인다. 일반 게시글에선 안 보임 | |
| | `isShop` | Boolean | — | `false` (기본값) | `false` |
| (내부) | `collectedBy` | String? | 선택 | 서포터즈 이름 | `Jane` |
| (내부) | `collectedAt` | String? | 선택 | `YYYY-MM-DD` 문자열 | `2026-09-20` |
| (내부) | `memo` | String? | 선택 | 관리자 메모 | |
| (내부) | `authorId` | Uuid? | 선택 | 비우면 null | |

> **제목의 큰 글씨는 Post 가 아니라 장소 이름이다.** 화면 상단 큰 제목 = `Place.nameEn ?? Place.nameKo`, 그 아래 작은 줄 = `Post.titleEn`.

### 2-2. Fan To-Do (Must-try)

| 화면 위치 | 컬럼 | 타입 | 구분 | 규칙 | 예시 |
|---|---|---|---|---|---|
| 제목 바로 아래 Fan To-Do 카드 | `PostPlace.insightEn.mustTry` | Json 안의 문자열 | 권장 | **화면은 `insightEn` JSON 의 `mustTry` 키만 읽는다.** 비우면 카드 없음 | `Order the strawberry latte he had` |
| (화면에 안 보임) | `PostPlace.mustTry` | String? | 선택 | 한국어판. 어드민 폼이 함께 저장하는 값 | `지민이 마신 딸기라떼 주문하기` |

`insightEn` 저장 형태 (어드민 폼과 같은 모양):

```json
{ "context": "", "mustTry": "Order the strawberry latte he had", "tip": "" }
```

> ⚠️ `PostPlace.mustTry`(한국어 컬럼)만 채우면 화면에 Fan To-Do 가 **나오지 않는다.** 기존 시트 임포트가 바로 이 상태다.

### 2-3. 화면에서 숨긴 것 — 비워도 됨

`page.tsx:145` "Context · Vibe · Tip 은 데이터는 그대로 두고 표시만 하지 않는다".

| 컬럼 | 구분 |
|---|---|
| `PostPlace.context`, `insightEn.context` | 비워도 됨 |
| `PostPlace.vibe` (String[]) | 비워도 됨 — 빈 배열 `[]` |
| `PostPlace.tip`, `insightEn.tip` | 비워도 됨 |
| `Post.subtitle` | 비워도 됨 (2-1 참고) |
| `Post.bodyKo`, `Post.titleKo` 외 한국어 필드 | 화면엔 안 보임. 단 `titleKo` 는 NOT NULL |

### 2-4. Place

| 화면 위치 | 컬럼 | 타입 | 구분 | 허용 값 / 규칙 | 예시 |
|---|---|---|---|---|---|
| (내부·검색) | `nameKo` | String | **필수** (NOT NULL) | | `망원한강공원` |
| 상단 큰 제목, 위치 카드 이름 | `nameEn` | String? | **필수** (어드민 폼 필수) | 비우면 화면이 `nameKo` 로 대체 → 영어 UI 에 한국어 노출 | `Mangwon Hangang Park` |
| 위치 카드 주소 | `addressEn` | String? | 권장 | 영어 주소 1줄 | `467 Mangwon-dong, Mapo-gu, Seoul` |
| (화면에 안 보임) | `addressKo` | String? | 선택 | | `서울 마포구 망원동 467` |
| 위치 카드 지도·마커, 주변 관광지, View on Map | `latitude`, `longitude` | Float? | **필수** (사실상) | WGS84 십진수. 둘 중 하나라도 없으면 지도·주변 관광지·View on Map 이 통째로 사라진다 | `37.5551`, `126.8946` |
| 위치 카드 "Google Maps" 버튼 | `googleMapsUrl` | String? | 권장 | 단축 URL(`maps.app.goo.gl`)은 확장한 최종 URL 로 저장 권장 (5절 중복 판단 키) | `https://www.google.com/maps/place/...` |
| (내부·중복 판단) | `googlePlaceId` | String? | 권장 | **unique**. 같은 값이 이미 있으면 insert 실패 | `ChIJ...` |
| 위치 카드 "Naver Map" 버튼 | `naverMapsUrl` | String? | 선택 | | |
| 위치 카드 Street View 버튼 | `streetViewUrl` | String? | 선택 | | |
| 라벨 칩 (장소 유형) | `placeTypes` + `PlacePlaceType` | String[] + 연결 행 | **필수** (어드민 폼 필수, 1개 이상) | 아래 2-5 의 `name` 값. 배열 순서 = `PlacePlaceType.sortOrder`, 0번이 대표 | `["Park", "Nature"]` |
| 지역 | `areaId` | Uuid? | **필수** (어드민 폼 필수) | 2-6 참고 | |
| | `status` | `PlaceStatus` | 기본값 | `OPEN` \| `CLOSED_TEMP` \| `CLOSED_PERMANENT` | `OPEN` |
| | `source` | `PlaceSource` | 기본값 | `ADMIN` \| `USER` → `ADMIN` | `ADMIN` |
| | `isVerified` | Boolean | 기본값 | `false` | `false` |
| | `country` | String | 기본값 | `KR` | `KR` |
| (상세에서 안 보임) | `phone`, `operatingHours`, `gettingThere`, `rating`, `kakaoMapsUrl`, `amapUrl`, `city` | | 비워도 됨 | 상세 페이지 쿼리가 일부 읽지만 화면에 그리지 않는다 | |

### 2-5. 장소 유형 허용 값 (`PlaceType.name`)

출처: `prisma/scripts/migrate-taxonomy.ts` 의 TAXONOMY 48종. **대소문자·공백까지 정확히** 써야 한다 (어드민 `/admin/place-types` 에서 현재 활성 목록을 다시 확인할 것).

| 카테고리 | 기본값(★) | 구체 타입 |
|---|---|---|
| EAT | ★ `Restaurant` | `Korean`, `K-BBQ`, `Fried Chicken`, `Street Food`, `Noodles`, `Seafood`, `International` |
| CAFE | ★ `Cafe` | `Bakery`, `Dessert` |
| BAR | ★ `Bar` | `Pocha` |
| ATTRACTIONS | ★ `Attraction` | `Landmark`, `Heritage`, `Museum`, `Park`, `Beach`, `Nature`, `Temple`, `Square`, `Village`, `Street`, `Cultural Space` |
| ENTERTAINMENT | ★ `Fan Landmark` | `Agency`, `Venue`, `Broadcast Station`, `Filming Studio`, `School` |
| EXPERIENCE | ★ `Activity` | `Class`, `Wellness`, `Theme Park`, `Photo Booth` |
| SHOP | ★ `Shop` | `Market`, `Mall`, `Pop-up`, `Convenience Store` |
| STAY | ★ `Stay` | `Hotel`, `Guesthouse`, `Hanok Stay` |
| OTHER | (없음) | `Airport`, `Office`, `Station` |

규칙 (`src/lib/place-type-write.ts` `resolvePlaceTypes`):
- 같은 이름 중복 금지
- 마스터에 없거나 비활성인 이름 금지
- **같은 카테고리의 기본값(★)과 구체 타입을 함께 쓰면 거부.** 예: `Cafe` + `Bakery` ✗, `Bakery` 만 ✓, `Cafe` + `Restaurant` ✓ (카테고리가 다름)

권장 구현: 스크립트가 `resolvePlaceTypes` → `writePlacePlaceTypes(tx, placeId, types)` 를 그대로 호출하면 위 검증과 두 저장소 동기화가 한 번에 된다.

### 2-6. 지역(Area) 연결

- `Place.areaId` → `Area.id`. Area 는 `seed-areas.ts` 가 관리하고 어드민은 읽기 전용이다.
- `Area.level` 0 = 시·도, 1 = 시군구. 지역 집계 쿼리(`src/lib/area-queries.ts`)는 `Place.areaId` 가 **보통 시군구(level 1)** 를 가리킨다고 본다.
- **좌표로 Area 를 자동으로 고르는 코드는 없음.** 어드민 폼에서 사람이 드롭다운으로 고른다. 기존 시트 임포트는 `areaId` 를 아예 넣지 않는다.
- DB 상 nullable 이지만 어드민 폼은 필수로 막는다. 비우면 지역 집계(`areaId IS NOT NULL`)에서 빠진다.

스크립트에서 고르는 방법은 대표가 정할 부분이다. 데이터에는 시군구 한국어 이름(`Area.nameKo`, 예: `마포구`)을 적어 두고 스크립트가 `level = 1` 인 Area 에서 이름으로 찾는 방식을 템플릿에 가정해 두었다. 같은 이름의 구가 여러 시·도에 있을 수 있으니(예: `중구`) 시·도 이름도 함께 적는다.

### 2-7. 출처 (PostSource)

| 컬럼 | 타입 | 구분 | 허용 값 / 규칙 | 예시 |
|---|---|---|---|---|
| `url` | String | **필수** | 아래 형식 | |
| `sourceType` | `SourceType` | **필수** | `PRIMARY` \| `REFERENCE`. **화면에는 `PRIMARY` 만 보인다.** `REFERENCE` 는 저장만 됨 | `PRIMARY` |
| `platform` | String? | 권장 | `YOUTUBE` \| `X` \| `INSTAGRAM` \| `PINTEREST` \| `NETFLIX` \| `WEVERSE` \| `BLOG` \| `OTHER` — `src/lib/platform.ts` `detectPlatform(url)` 로 계산해 넣으면 된다 | `YOUTUBE` |
| `sourceDetail` | String? | 선택 | 출처 카드 아래에 그대로 보이는 짧은 설명. **재생 위치를 바꾸지 않는다** (표시용 텍스트) | `2:15` · `S1E3 12:40` |
| `sortOrder` | Int | **필수** | 0부터. 화면은 유튜브를 맨 위로 올리고 나머지는 이 순서 | `0` |
| `isOriginalLink` | Boolean | 선택 | 원본 장면 이미지 클릭 시 이동할 URL. 게시글당 1개만 `true`. 원본 이미지를 안 넣으면 `false` | `false` |
| `sourceNote`, `sourcePostDate` | String? | 선택 | 화면에 안 보임 | `2024-07-19` |

**유튜브 URL — 시작 시간 포함 형식** (`youtube-source.ts` `parseYouTubeSource`)

| 형식 | 예시 | 동작 |
|---|---|---|
| `youtube.com/watch?v=ID&t=…` | `https://www.youtube.com/watch?v=VIDEO_ID&t=135` | ✓ |
| `youtu.be/ID?t=…` | `https://youtu.be/VIDEO_ID?t=2m15s` | ✓ |
| `youtube.com/shorts/ID` | `https://www.youtube.com/shorts/VIDEO_ID` | ✓ (`t` 도 읽음) |
| `start=` 파라미터 | `...watch?v=VIDEO_ID&start=135` | ✓ |

`t` / `start` 값으로 허용되는 것: `135` · `135s` · `2m15s` · `1h2m3s`.
**`t=2:15` (콜론) 은 인식 못 하고 0초부터 재생된다.** `youtube.com/embed/ID` 형식은 영상 ID 를 못 찾는다 — 위 세 형식 중 하나로 쓴다.
화면에서 유튜브 출처가 여러 개면 맨 위 하나만 자동재생.

**기타 링크**
- `netflix.com` → Netflix 카드
- 그 외(인스타·X·블로그·기사 등) → 북마크 카드 (`platform` 값으로 아이콘 결정)

### 2-8. 토픽·태그 연결

연결 테이블 두 개. 둘 다 `isVisible`, `displayOrder` 를 가진다. **상세 화면은 `isVisible = true` 인 것만 그린다** (기본값 `false` — 안 넣으면 칩이 안 보인다).

| 테이블 | 키 | 컬럼 | 구분 | 규칙 |
|---|---|---|---|---|
| `PostTopic` | (`postId`, `topicId`) | `isVisible`, `displayOrder` | **발행필수** (토픽+태그 합쳐 visible 1개 이상) | 화면 정렬: `Topic.level` 오름차순 → `displayOrder` |
| `PostTag` | (`postId`, `tagId`) | `isVisible`, `displayOrder` | 선택 | 아래 태그만 상세 칩으로 보인다 |

- **토픽 찾기:** `Topic.slug` (unique) 로 찾는 것을 권장. 데이터에는 slug 를 적는다. 목록은 어드민 `/admin/categories`. 실제 slug 값은 DB 에만 있고 코드에 상수로 없다 — 이번 정찰에서 DB 는 조회하지 않았다.
- 토픽은 계층이다(`parentId`, `level`). 칩 색은 `Topic.colorHex`(없으면 부모 색)에서 온다 — 스크립트가 색을 정하지 않는다.
- **태그 찾기:** `Tag.slug` 또는 `Tag.name` (둘 다 unique).
- 상세 화면에 칩으로 **보이는 태그는 다음뿐이다** (`src/lib/post-labels.ts` `pickDetailLabels`):
  - `group = "MEDIA"` 인 태그 전부
  - slug `fan-spot`
  - slug `photo-spot`, `local`, `vintageretro`
  - 그 외 태그는 연결·`isVisible=true` 여도 상세에 안 나온다.
- 칩 순서는 고정: 토픽 → MEDIA 태그 → fan-spot → 분위기 태그 → 장소 유형.

### 2-9. 사진 (요청 범위 밖이지만 발행 조건이라 적어 둠)

상세 상단 캐러셀·원본 장면 카드는 `PostImage` 다. `DRAFT` 로 넣을 때는 비워도 되지만, **발행 버튼은 `isThumbnail = true` 인 이미지가 없으면 막는다.**

| 컬럼 | 값 |
|---|---|
| `imageType` | `BANNER`(장소 사진, 최대 5장) \| `ORIGINAL`(연예인 원본 장면, 최대 2장) |
| `imageSource` | `UPLOAD` \| `URL` \| `AUTO` |
| `url` | 이미지 URL. 어드민 업로드는 R2(`NEXT_PUBLIC_CDN_URL`) |
| `isThumbnail` | BANNER 중 1장 `true` |
| `sortOrder` | 0부터 |
| `creditText` | 페이지 맨 아래 사진 크레딧에 표시 |

외부 URL 을 그대로 넣을지, R2 로 올릴지는 대표가 정할 부분이다.

---

## 3. 연결 관계 요약

```
Post ─┬─ PostPlace (1행) ── Place ─┬─ PlacePlaceType ── PlaceType
      │   └ insightEn.mustTry       └─ areaId ── Area
      ├─ PostSource (n행)
      ├─ PostTopic (n행) ── Topic
      ├─ PostTag   (n행) ── Tag
      └─ PostImage (n행, 선택)
```

---

## 4. "임시 발행(초안)" 상태값

```
Post.status      = "DRAFT"      (enum PostStatus — DRAFT | PUBLISHED, 다른 값 없음)
Post.publishedAt = null
```

- 어드민의 발행 취소(`unpublishPost`)도 정확히 이 두 값으로 되돌린다.
- `DRAFT` 는 피드·지도·검색 등 목록에 나오지 않는다 (`status: "PUBLISHED"` 필터).
- 발행은 어드민의 발행 버튼(`publishPost`)이 `status = "PUBLISHED"`, `publishedAt = now()` 로 바꾼다. 발행 전 검사: 한국어 제목, 영어 제목, 썸네일 이미지, 보이는 라벨 1개 이상.
- 참고: `/posts/{slug}?preview=1` 은 로그인 여부와 무관하게 `DRAFT` 를 보여준다. slug 를 아는 사람은 누구나 초안을 볼 수 있다.

---

## 5. 이미 있는 장소와 겹칠 때 판단 기준

### 지금 코드가 쓰는 기준 (시트 임포트, 위에서부터 순서대로)

| 순위 | 키 | 매칭 방식 |
|---|---|---|
| 1 | `Place.googleMapsUrl` | 단축 URL 을 확장한 뒤 **문자열 완전 일치** |
| 2 | `Place.streetViewUrl` | (구글맵 링크가 없을 때만) 문자열 완전 일치 |
| 3 | `Place.googlePlaceId` | `/place/` 링크면 Places API 로 ID 를 구해 일치 확인. DB 에도 **unique 제약**이 있다 |

- **이름 비교, 좌표 거리 비교는 코드 어디에도 없음.** 어드민 장소 생성(`src/app/admin/places/actions.ts` `createPlace`)도 중복 검사를 하지 않는다 (`googlePlaceId` unique 제약만).
- 같은 장소를 URL 형식만 다르게 적으면(`?entry=` 같은 쿼리 차이 포함) 1·2순위는 다른 장소로 본다.
- 기존 장소로 판정되면 새 Place 를 만들지 않고 그 `placeId` 에 새 Post 를 붙인다. 한 장소에 여러 게시글이 붙는 것은 정상 구조다 (지도 마커의 게시글 수).

### 게시글 중복 기준 (시트 임포트)

같은 `placeId` + 같은 출처 `url` 조합의 Post 가 이미 있으면 "이미 임포트됨". 300건을 나눠 돌리거나 재실행할 때 이 기준으로 건너뛰면 중복 Post 가 안 생긴다.

### 스크립트에 대한 제안 (결정은 대표)

1. `googlePlaceId` 가 있으면 그것으로 먼저 찾는다 — 가장 확실하고 DB 가 unique 로 보장한다.
2. 없으면 확장된 `googleMapsUrl` 완전 일치.
3. 둘 다 못 찾았는데 **좌표 50m 이내 + 이름(ko 또는 en) 유사**한 Place 가 있으면 자동으로 합치지 말고 리포트로만 뽑아 사람이 판단한다. 이름만·좌표만으로 자동 병합하면 같은 건물의 다른 가게가 합쳐진다.
4. 기존 장소로 판정돼도 그 Place 행은 **수정하지 않는다** (0절). 기존 시트 임포트는 좌표가 비어 있으면 채워 넣는데(update), 이번 스크립트는 따르지 않는다.

---

## 6. 레코드 1건 체크리스트

```
[필수]   titleKo · titleEn · slug(규칙·중복) · status=DRAFT · publishedAt=null
[필수]   Place: nameKo · nameEn · latitude · longitude · placeTypes(≥1, 규칙) · areaId
         — 또는 기존 Place 의 id
[권장]   bodyEn(Story) · insightEn.mustTry(Fan To-Do) · addressEn · googleMapsUrl · googlePlaceId
[권장]   PostSource PRIMARY 1개 이상 (유튜브는 t= 초/2m15s 형식)
[발행용] PostTopic isVisible=true 1개 이상 · BANNER 썸네일 1장
[비워도] context · vibe · tip · subtitle
```
