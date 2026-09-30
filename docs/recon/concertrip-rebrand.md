# concertrip 리브랜딩 정찰 (READ-ONLY)

- 브랜치: `concertrip-dev` (기준 커밋 51cf140)
- 검색: `recree|리크리` 대소문자 무시 (`reCree`·`reCREE`·`recreeshot` 포함)
- 제외: `node_modules`, `.next`, `.git`, `pnpm-lock.yaml`
- 전제: prod DB 는 recree.io 와 공유 → **스키마·저장값 변경 불가**

## 전체 규모

| 구분 | 매칭 줄 수 |
|---|---|
| 전체 | 921 줄 / 132 파일 |
| `docs/` (시안·문서) | 46 줄 / 8 파일 — 분류 대상 밖, 참고만 |
| 코드·설정·prisma | 875 줄 |
| 파일명·폴더명에 recree 포함 | 17 개 (아래 C, B 참고) |

카테고리 개수는 줄 단위 근사치다. 한 줄이 두 카테고리에 걸치면(예: UI 문구 안의 `/recreeshot` 링크) 더 사용자 영향이 큰 쪽에 넣었다.

| 카테고리 | 근사 줄 수 | 비고 |
|---|---|---|
| A. 사용자에게 보이는 텍스트/브랜드 | ~100 (사용자 UI ~73 · 관리자 UI ~27) + 이미지 3 | |
| B. URL 경로/라우트 | 폴더 2 + 문자열 ~46 + 슬러그 리다이렉트 111 | |
| C. 코드 내부 식별자·주석 | ~450 (주석 ~70) | 대부분 Prisma 모델명에서 파생 |
| D. DB 연관 (변경 금지) | schema 31 + migration 20 + 쿼리 접근 ~157 + 저장값 | |
| E. 외부 인프라 | ~25 | |

---

## A. 사용자에게 보이는 텍스트/브랜드

### A-1. 서비스명 "reCree" (→ concertrip 교체 대상)

**metadata (title/description/OG/twitter)**
- `src/app/layout.tsx:35-50` — title default/template `%s | reCree`, OG `siteName`/`title`, twitter title
- `src/app/(user)/discover/page.tsx:86,88,97` — description "…on the reCree map…", `| reCree`, siteName
- `src/app/(user)/posts/[slug]/page.tsx:58,66,67,71,80,152,153,162` — title suffix, description, siteName, JSON-LD
- `src/app/(user)/recreeshot/[id]/page.tsx:50,51,58,65` — description "…on reCree.", title
- `src/app/(user)/events/[collectionSlug]/[eventSlug]/page.tsx:209,213,222`
- `src/app/(user)/topics/[slug]/page.tsx:25,26,28,29`
- `src/app/(user)/profile/following/page.tsx:9` — `"Following | reCree"`

**UI 문구 / 워드마크 텍스트**
- `src/app/(user)/_components/AppHeader.tsx:9` — 헤더 로고 텍스트 `reCree`
- `src/app/(user)/login/page.tsx:28` — `<h1>reCree</h1>`
- `src/app/(user)/onboarding/_components/OnboardingFlow.tsx:57,71` — 로고 텍스트, "Welcome to reCree"
- `src/app/(user)/profile/_components/ProfileView.tsx:82` — 로고 텍스트
- `src/components/feedback/FeedbackForm.tsx:68` — "Help us make reCree better"
- `src/app/(user)/posts/[slug]/_components/PurchaseButton.tsx:24` — "reCree may earn a commission"
- `src/app/(user)/posts/[slug]/_components/PostReCreeshotSection.tsx:46` — "How others reCree'd"
- `src/app/(user)/journeys/_components/PlaceAddSheet.tsx:486` — "Popular on reCree"
- `src/app/(user)/journeys/_constants.ts:31` — chip label "reCree spot"
- `src/lib/canvas-utils.ts:75` — **recreeshot 이미지에 그려 넣는 워터마크 "reCree"** (생성된 사진 파일에 박힘)
- 관리자: `src/app/admin/_components/AdminSidebar.tsx:88` — "reCree Admin"
- 관리자: `src/app/admin/guide-video/_components/GuideVideoClient.tsx:29,45`, `_actions/guide-video-actions.ts:21` — 기본값 "How to reCree" (→ D 의 schema default 와 짝)

**LLM 프롬프트 (출력이 DB 콘텐츠가 됨)**
- `src/app/admin/posts/_actions/draft-actions.ts:55` — "You are a content writer for reCree…"

### A-2. 기능명 "recreeshot" / "리크리샷" (UI 노출)

기능명까지 바꿀지는 결정 필요. 사용자 UI(영어):
- `src/app/(user)/_components/BottomNav.tsx:39` — 탭 라벨 `recreeshot`
- `src/app/(user)/recreeshot/**` — page.tsx(40,42,128,151,152), new/page.tsx:19, DoneStep(19,25,34,41), UploadStep1:118, UploadStep2:46, TemplateSelector:138, HallGrid:34, NewReCreeshotFab:10(aria-label), HallDetailTopSection(175,269), HallDetailOwnerDeleteButton:42, ReCreeshotDeleteConfirm:15
- `src/app/(user)/profile/_components/ProfileView.tsx:105,113,214,219,328`
- `src/app/(user)/saved/_components/SavedClient.tsx:223,225`
- `src/app/(user)/discover/_components/DiscoverSections.tsx:120`, `ExploreTabBar.tsx:62`
- `src/app/(user)/posts/[slug]/_components/PostReCreeshotSection.tsx:61,86`
- `src/app/(user)/feed/page.tsx:157` — `` `${…} ReCreeshots` `` (대문자 — 표기 규칙 위반 상태)
- `src/components/recreeshot-image.tsx:30` — alt

관리자 UI(한국어 "리크리샷"): `src/app/admin/page.tsx`(270,328,360,371), `admin/recreeshots/page.tsx:53,55`, `RecreeshotTable.tsx:59,100,113`, `ReportList.tsx:79,123,152`, `posts/_components/PostImageSection.tsx:658,659,685`, `ReCreeshotCropDialog.tsx:87`, `AdminSidebar.tsx:47`, `home-curation/_components/SectionDialog.tsx:97,98,692`, `SectionTab.tsx:91`, `places/_components/PlacesTable.tsx:110`, `users/_components/UsersTable.tsx:70`

### A-3. 이미지 파일

| 파일 | 내용 | 사용처 |
|---|---|---|
| `src/app/icon.png` | 라임 원 + 검정 "r" (파비콘, App Router 규약) | 자동 |
| `public/og-default.png` | 라임 배경 + "reCree" 워드마크 | `layout.tsx:44,52`, `discover/page.tsx:98,105`, posts/recreeshot/events 페이지 fallback (절대 URL) |
| `public/og-post.png` | 검정 배경 + 라임 "reCree" | **참조 없음** (미사용) |

- manifest: **없음** (`manifest.*`, `site.webmanifest` 없음)
- apple-icon / opengraph-image 규약 파일: **없음**
- 이메일 템플릿: **리포 안에 없음** (Supabase Auth 메일은 대시보드 관리로 추정 — 리포에서 확인 불가)

---

## B. URL 경로/라우트

- **라우트 폴더**: `src/app/(user)/recreeshot/` (`/recreeshot`, `/recreeshot/[id]`, `/[id]/edit`, `/new`), `src/app/admin/recreeshots/`
- **href / router.push / revalidatePath / 경로 비교** (~46 줄): `BottomNav.tsx:39`, `ConditionalHeader.tsx:23`, `ScrollToTopButton.tsx:20`, `lib/bottom-nav.ts:82`, `PopularReCreeshotSection.tsx:11,68,83`, `CuratedSections.tsx:50`, `PostReCreeshotSection.tsx:69`, `ProfileView.tsx:230`, `DoneStep.tsx:31`, `EditForm.tsx:29`, `recreeshot/[id]/edit/page.tsx:15,23,29`, `_actions/recreeshot-actions.ts`(273,308,320,425), `_actions/report-actions.ts:67`, `admin/page.tsx`(328,329,360,365,371,376), `admin/recreeshots/_actions/recreeshot-actions.ts:11`, `sitemap.ts:38`
- **redirect**: `next.config.ts:7,8` — `/discover/hall/*`, `/explore/hall/*` → `/recreeshot/*` (301)
- **포스트 슬러그 301 매핑**: `src/lib/post-redirects.ts` — 110건, 목적지 슬러그가 전부 `…-recree` 로 끝남. 파일 주석에 "임의로 수정/추가/삭제 금지". 슬러그 자체는 DB 값(D-3)

> `/recreeshot` 경로를 바꾸면 기존 공유 링크·sitemap 색인 보존을 위해 redirect 추가가 필요하다.

---

## C. 코드 내부 식별자 · 주석

대부분 Prisma 모델 `ReCreeshot` 에서 파생된 이름이라 D 와 묶여 있다. Prisma Client 접근자(`prisma.reCreeshot`, `reCreeshotId` 등)는 스키마를 안 바꾸는 한 **바꿀 수 없다** → D 로 분류.

**파일명 (13)**
- `src/app/(user)/_actions/recreeshot-actions.ts`, `src/app/admin/recreeshots/_actions/recreeshot-actions.ts`
- `src/components/recreeshot-image.tsx`
- `feed/_components/PopularReCreeshotSection.tsx`, `posts/[slug]/_components/PostReCreeshotSection.tsx`
- `recreeshot/_components/NewReCreeshotFab.tsx`, `recreeshot/[id]/_components/ReCreeshotDeleteConfirm.tsx`, `recreeshot/new/_components/ReCreeshotUploadFlow.tsx`, `recreeshot/new/_components/editor/ReCreeshotEditor.tsx`
- `admin/posts/_components/ReCreeshotCropDialog.tsx`, `admin/recreeshots/_components/RecreeshotTable.tsx`, `RecreeshotTabs.tsx`

**식별자 (앱 코드 소유, 스키마 무관)** — 예시
- 컴포넌트: `ReCreeshotImage`, `PopularReCreeshotSection`, `PostReCreeshotSection`, `NewReCreeshotFab`, `ReCreeshotUploadFlow`, `ReCreeshotEditor`, `ReCreeshotDeleteConfirm`, `ReCreeshotCropDialog`, `RecreeshotTable`, `RecreeshotTabs`, `RecreeshotRow`
- 액션/함수: `createReCreeshot`, `updateReCreeshot`, `deleteReCreeshot`, `toggleReCreeshotLike/Save`, `getReCreeshotPresignedUrl`, `deleteReCreeshotImages`, `fetchRegionReCreeshots`, `setRecreeshotStatus`, `adminDeleteRecreeshot`, `drawReCreeshotBadge/Watermark`, `extractReCreeStoragePath`
- 상수: `PUBLIC_RECREESHOT_WHERE`(`lib/visibility.ts`), `MAX_RECREESHOT_IMAGE_SIZE`(`lib/upload-constants.ts`), `RECREESHOT_STATUS_BADGE/LABEL`(`admin/recreeshots/_constants.ts`), `RECREESHOT_TYPE_OPTIONS`
- 판별 태그: `lib/curation-types.ts:7` `kind: "reCreeshots"` (메모리 내 DTO, DB 아님)
- 상태 변수: `reCreeCropSrc`, `recreeUploading`, `recreeFileRef`, `onRecreePhotoChange` 등 (`PostImageSection.tsx`, `PostForm.tsx`)
- 임포트 CSV 컬럼: `admin/import/_actions/import-actions.ts:42,285,545` `recreeshot_original_image` (외부 구글시트 헤더와 짝 — 시트도 같이 바꿔야 함)

**주석 (~70 줄)**: `src/types/index.ts:1`, `prisma/seed.ts:6`, `schema.prisma:1` 의 "reCree MVP", 시안 경로 `reCree Contest.dc.html` 인용(`RegionTourSections.tsx:4`, `NearbyAttractionsSection.tsx:4`, `journeys/_constants.ts:1`), "리크리샷" 설명 주석 다수

**패키지·기타**
- `package.json:2` — `"name": "recree-mvp"`
- `.gitignore:48` — `recree_prod_backup_*.sql`
- `docs/prototype/reCree Contest.dc.html` — 파일명 (CLAUDE.md 에서 `reCree-contest.dc.html` 로 참조 중)

---

## D. DB 연관 — 변경 금지

### D-1. Prisma 스키마 (`prisma/schema.prisma`, 31 줄)
- 모델: `ReCreeshot`, `ReCreeshotTopic`, `ReCreeshotTag`, `ReCreeshotLike` — `@@map` 없음 → **테이블명 그대로 `"ReCreeshot"` 등**
- 필드: `reCreeshotId`(Topic/Tag/Like/Report), `Post.recreePhotoUrl`(238), 관계 필드 `reCreeshots`, `reCreeshotTopics`, `reCreeshotTags`, `reCreeshotLikes`
- enum: `ReCreeshotStatus`, 값 `SaveTarget.RECREESHOT`, `ContentType.RECREESHOT`
- 기본값: `GuideVideo.titleEn @default("How to reCree")` (629)
- 복합키: `@@unique([userId, reCreeshotId])` → Prisma 에서 `userId_reCreeshotId`

> Prisma 레벨에서 `@@map`/`@map` 으로 앱 쪽 이름만 바꾸는 방법은 가능하지만 스키마 파일 변경이고 prod migrate 상태와 얽히므로 별도 결정 사항.

### D-2. 마이그레이션 SQL (20 줄)
- `20260221162207_init_mvp_schema/migration.sql` (17), `20260307073507_add_section_subtitle_contenttype` (1), `20260610000000_add_recreeshot_fields_and_sticker` (2, 폴더명 포함), `20260611000000_drop_unused_recreeshot_columns` (1, 폴더명 포함)

### D-3. DB 에 저장되는 문자열 값
- **포스트 슬러그** `…-recree` — prod 110건+ (`lib/post-redirects.ts`, `prisma/scripts/cleanup-taxonomy.ts:73-` 에 목록)
- **이벤트 슬러그** `…-recree` — `prisma/scripts/data/bts_arirang_events_seed.json` (39 줄)
- **이미지 URL** `https://cdn.recree.io/recreeshot-images/...` — `ReCreeshot.imageUrl`, `referencePhotoUrl`, `Post.recreePhotoUrl` 에 저장. 버킷 프리픽스 `"recreeshot-images"` 는 `lib/actions/upload-actions.ts:57,105`, `_actions/recreeshot-actions.ts:9,399`, `admin/recreeshots/_actions/recreeshot-actions.ts:8,76`, `profile/_actions/profile-actions.ts:7,102`, `scripts/cleanup-storage.ts:27` 가 사용. `makeStorageExtractor`(`lib/storage.ts:24`)가 `CDN_URL/버킷/` 프리픽스로 삭제 경로를 계산 → CDN 도메인·프리픽스를 바꾸면 기존 행 삭제가 깨짐
- **Policy 본문** — `prisma/seed-policy.ts` 이용약관/개인정보처리방침: "reCree 서비스", "recree.io", "recreeshot", 신고 접수처 `recreekr@gmail.com`. prod 에는 DB 행으로 존재 (사용자 노출 A 성격이지만 DB 값)
- **enum 저장값** `"RECREESHOT"` — `saved/page.tsx:42`, `recreeshot/[id]/page.tsx:180`, `lib/popular-queries.ts:17`, `lib/curation-queries.ts:50`, `_actions/recreeshot-actions.ts:343,362`, `SectionDialog.tsx`, `SectionTab.tsx`
- **Topic/Tag 색 fallback** `#D3FD52` — `admin/categories/_components/color-fields.tsx:90-96` 프리셋 버튼이 `colorHex` 로 저장. 이미 저장된 값은 DB 소유
- `GuideVideo.titleEn` 기본값 "How to reCree" (D-1)
- dev 시드 계정 `seed@recree.dev` (`prisma/seed-dummy.ts:38,44`) — dev 전용

### D-4. Prisma Client 접근 (~157 줄)
`prisma.reCreeshot.*`, `tx.reCreeshot.*`, `reCreeshotId`, `reCreeshotTopics/Tags`, `recreePhotoUrl`, `ReCreeshotStatus`, `Prisma.ReCreeshotWhereInput`, `_count.reCreeshots` — 스키마가 정하는 이름이라 스키마 유지 시 변경 불가. 주요 파일: `_actions/recreeshot-actions.ts`, `admin/recreeshots/_actions/recreeshot-actions.ts`, `_actions/report-actions.ts`, `admin/page.tsx`, `admin/posts/_actions/post-actions.ts`, `sitemap.ts`, `lib/popular-queries.ts`, `lib/visibility.ts`, `prisma/scripts/seed-from-prod.ts`, `prisma/seed-dummy.ts`

---

## E. 외부 인프라

| 항목 | 위치 |
|---|---|
| 도메인 `recree.io` | `layout.tsx:32,42`, `robots.ts:14`, `sitemap.ts:6`, `discover/page.tsx:16`, posts/recreeshot/events 페이지 절대 URL |
| Server Actions 허용 origin `recree.io`, `dev.recree.io` | `next.config.ts:21` — 새 도메인 추가 안 하면 Server Action 이 거부됨 |
| CDN `cdn.recree.io` | `next.config.ts:29`(images.remotePatterns), `lib/image.ts:108`. prod 와 R2 공유 → 기존 이미지 URL 때문에 유지 필요 |
| R2 폴더 `recreeshot-images` | D-3 참고 |
| localStorage/sessionStorage 키 | `discover/_hooks/useRecentSearches.ts:5` `recree:recent-searches`, `discover/_hooks/useDiscoverViewState.ts:5` `recree:discover-view` (바꾸면 기존 방문자 기록 초기화) |
| 쿠키 | recree 포함 키 **없음** |
| env 변수명 | recree 포함 **없음** (`.env.example`, `.env.local` 모두) |
| 분석 이벤트명 | recree 포함 **없음** (GA 는 page_view config 만) |
| User-Agent | `lib/google-maps-url.ts:9` `reCree/1.0`, `api/og-image/route.ts:75` `reCreeBot/1.0` |
| TourAPI `MobileApp` 파라미터 | `lib/tour-api/client.ts:13` `"recree"`, 스크립트 `seed-areas.ts:208`, `tour-api-spike*.ts` |
| 운영 이메일 | `recreekr@gmail.com` (seed-policy.ts 약관 본문에만) |
| Google site verification | `layout.tsx:56` — 토큰은 recree 무관이나 도메인 소유 인증이라 새 도메인이면 재발급 필요 |

---

## 추가 확인 1. 브랜드 색

- tailwind config 파일: **없음** (Tailwind v4, CSS 토큰 방식)
- 정의: `src/app/globals.css:140-142` — `--palette-brand: #D3FD52`, `--palette-brand-sub2: #E7FFB3`, `--palette-brand-sub3: #F9FFE3` → `:153-157` `--brand*` → `:25-28` `--color-brand*` (Tailwind `bg-brand` 등)
- 토큰 사용 (`bg-brand`/`var(--brand)` 등): 67 파일
- 하드코딩 `#D3FD52`: **45곳 / 28파일** (globals.css 제외). 주요: `components/maps/PlaceMarker.tsx:40,42`, `InteractiveMap.tsx:197`, `PostCarouselCard.tsx:68`, `lib/canvas-utils.ts:43`(recreeshot 배지), `recreeshot/new/_components/editor/*`, `ScrapButton.tsx:25`, `events/.../page.tsx:353,503,624`, `admin/categories/_components/*`(Topic 색 프리셋 — D-3)
- 기타: `journeys/_constants.ts:31` `#F4FFD0`/`#4A5E06` (spot chip)
- `#C6FD09` / `#C8FF09`: 코드에 **없음** (CLAUDE.md 토큰표의 `#C8FF09` 와 실제 CSS `#D3FD52` 가 불일치)

## 추가 확인 2. 로고

- SVG 로고 컴포넌트: **없음** (`src/components/icons/` 는 탭바 아이콘뿐)
- 헤더/로그인/온보딩/프로필/관리자 사이드바의 로고는 **텍스트 `reCree`** (`<span className="font-bold …">`) — A-1 의 5곳
- 이미지: `src/app/icon.png`(파비콘 "r"), `public/og-default.png`(워드마크), `public/og-post.png`(워드마크, 미사용)
- 캔버스 워터마크 텍스트: `lib/canvas-utils.ts:75`

## 추가 확인 3. 사이트 URL 생성 위치

- 하드코딩뿐, 공용 상수/env(`NEXT_PUBLIC_SITE_URL` 등) **없음**
- `src/app/layout.tsx:32` — `metadataBase: new URL("https://recree.io")`, `:42` OG url
- `src/app/sitemap.ts:6` — `BASE_URL = "https://recree.io"`
- `src/app/robots.ts:14` — `sitemap: "https://recree.io/sitemap.xml"`
- canonical: `src/app/(user)/discover/page.tsx:16,111` (`alternates.canonical = selfUrl`, 베이스 하드코딩)
- 페이지별 절대 URL: `posts/[slug]/page.tsx:69,70,159,163`, `recreeshot/[id]/page.tsx:52`, `events/.../page.tsx:210,211`
- robots noindex 분기: `layout.tsx:28,33` (`VERCEL_ENV === "production"`)

---

## 리브랜딩 시 판단이 필요한 지점 (정찰 결과만, 제안 아님)

1. 기능명 `recreeshot` 도 바꾸는가 — 바꾸면 A-2·B·C 전부, 안 바꾸면 A-1 만
2. `/recreeshot` 라우트 변경 여부 — 변경 시 301 필요
3. 포스트/이벤트 슬러그의 `-recree` 접미사 — DB 값이라 그대로 둠 (URL 에 노출은 계속됨)
4. Policy(약관) 본문 — DB 행. "prod 데이터는 추가만" 규칙과 충돌 → 새 버전 행 추가 방식인지 확인 필요
5. concertrip 도메인에서 Server Action origin·metadataBase·sitemap 이 하드코딩이라 동시 변경 필요
6. 워터마크·OG 이미지 교체용 새 브랜드 에셋 필요
