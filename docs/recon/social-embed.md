# 게시글 상세 — 인스타그램 · X 원본 게시물 임베드 정찰

작성 2026-10-03 · READ-ONLY 정찰 (코드 수정 없음, DB 는 읽기 전용 트랜잭션으로만 조회)

> §1~§4 는 정찰 당시 기록이다. 실제로 만든 것은 맨 아래 **5. 구현 결과** 가 기준이다.

목표: 출처가 인스타그램 · X 인 글도 유튜브 글처럼 미디어 칸(16:9)에 원본 게시물을 크게 띄운다.
칸 비율은 16:9 그대로, 그 안에 게시물 카드가 원본 비율대로 가운데 들어간다.

---

## 1. 기존 코드

### 1.1 이벤트의 인스타그램 임베드

| 항목 | 내용 |
|---|---|
| 위치 | `src/app/(user)/events/[collectionSlug]/[eventSlug]/_components/InstagramEmbed.tsx` |
| 쓰는 곳 | 같은 폴더 `page.tsx:755`(조건) · 756(렌더) — 이벤트 본문 블록 `type === "INSTAGRAM"` 일 때 `block.embedUrl` |
| 데이터 | `EventBlock.embedUrl` (schema.prisma:797). 관리자 저장 시 `INSTAGRAM_URL_RE = /^https?:\/\/(www\.)?instagram\.com\/(p\|reel)\/[\w-]+/` 로 검증 (`admin/events/_actions/event-actions.ts:63`) |
| 방식 | **공식 embed.js + blockquote**. `<blockquote class="instagram-media" data-instgrm-permalink=… data-instgrm-version="14">` 를 그리고 `https://www.instagram.com/embed.js` 를 body 에 한 번 붙인 뒤 `instgrm.Embeds.process()` |
| 크기 | `minHeight: 480`, 가로 가운데 정렬만. 칸에 맞추는 계산 없음 — 카드가 제 크기(폭 326~658)대로 늘어난다 |
| 실패 처리 | 없음. 삭제 · 비공개 글이면 빈 흰 칸이 남는다 (아래 3.2 실측) |

**재사용 판단**: 스크립트를 한 번만 붙이는 로직 정도만 쓸 수 있다.
16:9 칸에 맞추려면 카드 높이를 알아야 하는데, embed.js 는 높이를 iframe 에 직접 써 넣을 뿐 부르는 쪽에 알려주지 않는다.
게시글용은 **embed.js 없이 `/p/{id}/embed/` iframe 을 직접 두고, iframe 이 보내는 `MEASURE` 메시지(postMessage, `{type:"MEASURE", details:{height}}`)로 높이를 받는** 방식이 맞다 (3.3 실측).
이벤트 쪽을 바꾸는 것은 이번 범위가 아니다.

### 1.2 게시글 출처 저장 구조

```
PostSource (schema.prisma:288)
  url            String
  sourceType     PRIMARY | REFERENCE      — 화면에는 PRIMARY 만 나온다 (splitSources)
  platform       String?                  — YOUTUBE | X | INSTAGRAM | … (detectPlatform, src/lib/platform.ts)
  sourceDetail   String?
  isOriginalLink Boolean                  — 원본 장면 카드 클릭 시 이동 URL
  sortOrder      Int
```

- 상세 화면 흐름: `posts/[slug]/page.tsx` → `splitSources()` (`_components/SourceSection.tsx`) 가 PRIMARY 를 **맨 위 유튜브 하나 + 나머지** 로 나눈다.
  lg 에서 유튜브는 왼쪽 미디어 칸, 나머지는 오른쪽 열 `BookmarkCard` (OG 이미지 + 제목 카드).
- 인스타그램 · X 는 지금 `BookmarkCard` 로만 나온다. 미디어 칸은 사진 캐러셀(`BannerCarousel lgLayout="media"`) + 왼쪽 아래 원본 장면 카드(`OriginalSourceCards`).
- 별도 임베드용 컬럼은 필요 없다 — `PostSource.url` 하나로 충분하다 (**DB · 스키마 변경 불필요**).

### 1.3 DB 실측 (`.env.local` 이 가리키는 DB, `BEGIN READ ONLY`)

URL 모양으로 다시 분류했다 (`platform` 값보다 URL 이 정확하다 — 1.4 참고).

| 종류 | 판정 | PRIMARY 링크 · 글 (발행) | REFERENCE 링크 · 글 (발행) |
|---|---|---|---|
| 인스타그램 게시물 `/p/` · `/reel/` | 임베드 가능 | 18 · 18 (13) | 5 · 5 (5) |
| 인스타그램 프로필 `/아이디/` | **임베드 불가** (oEmbed 400) | 5 · 5 (4) | 4 · 4 (4) |
| X 게시물 `/status/숫자` | 임베드 가능 | 23 · 17 (17) | 20 · 8 (8) |
| X 기타 (검색 링크 등) | 임베드 불가 | 0 | 2 · 2 (2) |

**미디어 칸이 실제로 바뀔 글** = 발행 · PRIMARY 에 유튜브가 없고 · 임베드 가능한 인스타 / X PRIMARY 가 있는 글

| 첫 PRIMARY 기준 | 글 수 |
|---|---|
| 인스타그램 게시물 | **11** |
| X 게시물 | **11** (아무 PRIMARY 기준으로는 12) |
| (참고) 인스타 프로필이 첫 출처 — 바뀌지 않음 | 3 |

유튜브 PRIMARY 가 있는 글(인스타 3 · X 2 · 둘 다 있는 글 포함)은 지금처럼 유튜브가 미디어 칸이다.

### 1.4 정찰 중 보인 데이터 문제 (고치지 않음, 보고만)

- `platform = 'X'` 인데 URL 이 **넷플릭스**인 REFERENCE 3건 (`netflix.com/watch/81726588…`, `81566013`, `81012512`). 화면에 안 나오는 REFERENCE 라 지금 영향은 없다.
- 인스타그램 `BookmarkCard` 가 **빈 카드**로 나온다 (`/api/og-image` 가 인스타 OG 를 못 가져와 제목 · 썸네일 없이 카메라 아이콘만 — 스크린샷 `embed-post-ig1-before.png` 오른쪽 열). 임베드가 들어가면 그 글들은 자연히 해소된다.

---

## 2. 방식 비교

### 2.1 인스타그램

| 방식 | 지금 동작 (실측) | 인증 | 높이 알 수 있나 | 비고 |
|---|---|---|---|---|
| 공식 `embed.js` + blockquote | ✅ 렌더됨 | 불필요 | ✗ (스크립트가 iframe 높이를 직접 씀) | 이벤트가 쓰는 방식. 전역 스크립트 65KB(gzip 22KB) |
| `/p/{id}/embed/` iframe (캡션 없음) | ✅ 렌더됨 | 불필요 | ✅ `MEASURE` 메시지 | `frame-ancestors` 제한 없음 · `X-Frame-Options` 없음 — 아무 사이트에서나 틀 수 있다. **추천** |
| `/p/{id}/embed/captioned/` iframe | ✅ 렌더됨 | 불필요 | ✅ | 캡션 · 댓글 일부까지 붙어 더 길다 → 16:9 에서 더 작아진다 |
| oEmbed `graph.facebook.com/instagram_oembed` | ✅ **토큰 없이 200** (2026-10-03 curl) | **불필요** (Meta 가 2026-06-15 토큰 · 앱 심사 요구를 철회) | — | 서버에서 "임베드 가능한가" 판정용. 응답은 blockquote html 뿐, `thumbnail_url` 은 더 이상 안 준다. 시간당 한도 있음(토큰 경로 1,000/h, 토큰 없는 경로는 더 낮을 수 있음) |

- **사진 · 영상만** 보여주기: **공식 방법 없음.** 어느 방식이든 카드 전체(프로필 줄 + View profile 버튼 + 사진/캐러셀 + View more on Instagram + 좋아요 수 + 댓글 입력줄)가 나온다. 캡션만 뺄 수 있다(`/embed/` vs `/embed/captioned/`).
- 캐러셀 글은 카드 안에서 넘겨 볼 수 있다. URL 의 `img_index` 는 무시된다 (항상 첫 장).
- 릴스(`/reel/`)도 oEmbed 200 — 동작한다.

### 2.2 X

| 방식 | 지금 동작 (실측) | 인증 | 높이 알 수 있나 | 비고 |
|---|---|---|---|---|
| 공식 `widgets.js` + blockquote | ✅ 렌더됨 (로그인 없이) | 불필요 | 렌더 후 요소 크기로 | 94KB(gzip 28KB) |
| `widgets.js` `twttr.widgets.createTweet(id, el, opts)` | ✅ | 불필요 | ✅ Promise 로 요소를 받음, 실패면 `undefined` | 폭 지정(`width` 250~550), `dnt`, `conversation:"none"`, `cards:"hidden"`. **추천** |
| `platform.twitter.com/embed/Tweet.html?id=` iframe 직접 | ✅ 응답 200 | 불필요 | ✗ (widgets.js 가 붙이는 파라미터 · 메시지 규약이 비공개) | 문서화되지 않은 내부 URL — 언제 바뀔지 모름. 비추천 |
| oEmbed `publish.x.com/oembed` | ✅ 200 (없는 글은 404) | 불필요, 한도 없음(문서) | — | 서버 판정용. `dnt=true` 를 넣으면 blockquote 에 `data-dnt="true"` |

- **사진 · 영상만** 보여주기: **공식 방법 없음.** `hide_media` / `cards="hidden"` 은 반대로 **사진을 숨기는** 옵션이다. 카드 전체(프로필 · 본문 · 사진 · 시각 · 좋아요 · Reply · Copy link · Read replies)가 나온다.
- 사진만 따로 얻는 길(`cdn.syndication.twimg.com/tweet-result` 등)은 비공식 내부 API — 약관 · 안정성 모두 문제라 쓰지 않는다.
- 2023 이후 X 임베드는 "대체로 동작하나 예전보다 덜 안정적"이라는 보고가 많다. 실패 대비 대체 화면이 필수다.

### 2.3 16:9 칸 안에 원본 비율로 넣기 (칸 안 스크롤 없이)

두 카드 모두 **폭을 정하면 높이가 정해진다** (사진 높이가 폭에 비례 + 위아래 고정 줄).

```
1. 카드 폭을 정해 그린다 — 인스타 326(최소), X 는 칸 높이에 맞는 폭을 250~550 사이에서 구한다
   (두 폭에서 높이를 재 h = a + b·w 직선으로 풀면 한 번에 맞는다)
2. 높이 h 를 받는다 — 인스타는 MEASURE 메시지, X 는 createTweet 이 돌려준 요소 크기
3. 배율 s = min(1, (칸 높이 − 여백) / h)
4. 카드를 칸 가운데 두고 transform: scale(s)  — iframe 은 축소돼도 클릭 · 캐러셀 넘김이 그대로 된다
5. MEASURE 가 다시 오면(이미지 로드 후 높이 변화) 3~4 를 다시
```

**실측 (lg 1440, 미디어 칸 780×439)**

| 글 | 카드 원래 크기 | 배율 | 보이는 크기 | 본문 글자 (14px 기준) |
|---|---|---|---|---|
| 인스타 DAQcD2aPRE6 (세로 사진) | 326×616 | 0.67 | 218×413 | 약 9.4px |
| 인스타 CaEfPfopXSB (정사각) | 326×534 | 0.78 | 254×417 | 약 11px |
| X 961804017230692353 (사진 4장) | 366×425 | 0.98 | 359×417 | 약 14px |
| X 895661021041352705 (세로 포스터) | 250×495 | 0.84 | 210×416 | 약 12px |

**모바일 (390, 칸 358×201)**: 배율 0.29~0.51, 보이는 카드 89~129px 폭 — **글자를 읽을 수 없다.** 16:9 칸 임베드는 모바일에 쓸 수 없다.

관찰:
- 세로 사진 인스타는 칸 폭의 약 28% 만 쓰고 좌우가 비어 보인다. 글자가 10px 안팎으로 작아진다.
- X 는 텍스트가 짧고 가로 사진이면 거의 1배로 들어간다. 세로 포스터는 폭 250 까지 줄어 아이디가 말줄임된다(`@BIGHIT_…`).
- 칸을 원본 비율로 늘리면 축소가 없어지지만, 요청 조건(16:9 유지)과 다르므로 참고로만 적는다.

### 2.4 스크린샷

`.playwright-mcp/` (gitignore 대상)

| 파일 | 내용 |
|---|---|
| `embed-post-ig1-before.png` / `embed-post-ig1-after.png` | 인스타 글(NCT WISH 목포) — 지금 / 미디어 칸에 임베드를 끼운 모습 |
| `embed-post-ig2-before.png` / `…-after.png` | 인스타 글(제이홉 충장로) |
| `embed-post-x1-before.png` / `…-after.png` | X 글(뷔 달맞이길) |
| `embed-post-x2-before.png` / `…-after.png` | X 글(정국 개미마을) |
| `embed-official-scripts.png` | 공식 embed.js · widgets.js 원래 크기 + 없는 글 2건 |
| `embed-fit-ig-lg.png` · `embed-fit-x-lg.png` | 16:9(810×456) 맞춤 계산 결과 + 없는 글 |
| `embed-fit-ig-m.png` · `embed-fit-x-m.png` | 모바일 16:9(358×201) — 읽을 수 없음 |

"after" 는 코드 수정 없이 Playwright 로 페이지 DOM 의 미디어 칸만 임시로 바꿔 찍은 것이다 (원본 장면 카드 · 화살표도 같이 빠짐).
테스트 페이지는 scratchpad 의 정적 HTML(`embedtest/fit.html` 등)을 127.0.0.1:3300 에서 띄웠다.

---

## 3. 위험

### 3.1 성능 (새 브라우저 컨텍스트, 임베드 1개만 있는 빈 페이지, 실측)

| | 요청 수 | 전송량 | 그중 JS |
|---|---|---|---|
| 인스타 `/embed/` iframe 1개 | 56 | 약 1.9MB | 약 870KB |
| X `widgets.js` 게시물 1개 | 24 | 약 0.63MB | 약 330KB |
| (비교) 지금 쓰는 유튜브 nocookie iframe 1개 | 15 | 약 1.05MB | 약 900KB |

- 인스타는 유튜브보다 무겁다(사진 원본 + Meta 정적 리소스). 전부 iframe / 외부 스크립트라 **우리 번들 크기에는 영향 없음**.
- **보일 때만 불러오기 가능**: 인스타 iframe 은 `loading="lazy"` 또는 IntersectionObserver 뒤에 src 지정, X 는 IntersectionObserver 뒤에 `widgets.js` 로드 + `createTweet`.
  lg 미디어 칸은 첫 화면이므로, 유튜브와 같이 `afterPageLoad`(load 후 idle) 뒤에 부르면 사진 · 제목 · LCP 를 막지 않는다. `YouTubeEmbed.tsx` 의 `afterPageLoad` 를 그대로 쓸 수 있다.
- 첫 칠 때는 미디어 칸에 스켈레톤(유튜브와 같은 `Skeleton`)을 깐다. 카드가 칸 안에서 크기가 정해지므로 **레이아웃 이동(CLS) 없음**.

### 3.2 삭제 · 비공개 · 로그인 필요 게시물

| 경우 | 인스타 | X |
|---|---|---|
| oEmbed (서버) | 없는 글: **400, code 24 / subcode 2207045 "Media Not Found"**. 프로필 URL: 400 / 2207047 "Invalid URL". 비공개 · 연령 제한 · 임베드 끈 계정 · 스토리도 미지원(Meta 문서) | 없는 글: **404** (HTML 오류 페이지) |
| 클라이언트 | `/embed/` iframe 은 흰 빈 화면, `MEASURE` 메시지가 안 온다 (embed.js 로 그리면 높이 2px) | `createTweet` 이 `undefined`. blockquote 방식이면 안에 넣은 링크가 그대로 남는다 |

**대체 화면 제안 — 두 겹**
1. **서버에서 먼저 판정**: 상세 페이지 렌더 때 oEmbed 로 "임베드 가능?"만 확인 → 실패면 **지금 화면 그대로**(사진 캐러셀 + 원본 장면 카드 + 오른쪽 출처 카드).
   삭제된 글에서 화면이 깜빡이지 않는다. 결과는 `unstable_cache` 로 하루 정도 캐시(관광 데이터 규칙과 같은 성격 — DB 저장 아님).
2. **클라이언트 시간 초과**: 서버 판정은 통과했는데 iframe 이 8초 안에 높이를 안 보내거나 `createTweet` 이 `undefined` 면 같은 대체 화면으로 바꾼다.

### 3.3 쿠키 · 추적 (해외 사용자 개인정보)

새 컨텍스트에서 임베드 하나만 띄운 뒤 남은 쿠키:

| | 쿠키 |
|---|---|
| 인스타 iframe | `.instagram.com` **`mid`** — 만료 약 400일, SameSite=None (로그인 안 해도 기기 식별자) |
| X widgets.js (`dnt: true`) | `.x.com` · `.twitter.com` `__cf_bm` — Cloudflare 봇 판별, 30분 |
| (비교) 유튜브 nocookie | 없음 |

- 인스타는 페이지를 여는 것만으로 Meta 식별 쿠키를 심는다. EU · 영국 사용자 기준으로는 **동의 전 차단**(클릭해서 불러오기)이 원칙적으로 요구되는 종류다.
- X 는 `dnt` 를 켜면 "개인화 추천 · 광고에 쓰지 않음"(X 문서). 그래도 X 서버로 방문 사실(IP · 리퍼러)은 간다.
- 코드에 쿠키 동의 배너가 **없음** (`GoogleAnalytics.tsx` 만 있음, consent 관련 코드 검색 결과 없음).
- 개인정보처리방침(`Policy` 테이블 `privacy`)의 제3자 목록에 Google 은 있으나 **Meta · X 는 없음**. 임베드를 넣으면 방침 문구 추가가 필요하다 (DB 값이라 이번 작업에서 건드리지 않는다).

### 3.4 약관

- **공식 임베드 자체는 허용 범위.** Meta 는 oEmbed / 임베드를 "웹사이트 · 앱에 표시하는 용도로만" 쓰라고 하고, 메타데이터 분석 · 추출을 금지한다. X 도 공식 위젯 사용을 전제로 한다.
- **하면 안 되는 것**: 카드에서 사진만 잘라내기 · 프로필 줄이나 출처 표시 가리기 · 이미지 변형. 위 2.3 의 방식은 카드 **전체를 그대로 비율 축소**만 하므로 이 범위 안이라고 본다 (잘라내는 `overflow` 크롭은 쓰지 않는다).
- 저작권: Meta 는 2020 년 "임베드가 서브라이선스를 주지 않는다"고 밝혔다. 원 게시자가 아이돌 공식 계정 · 팬 계정이라는 점은 지금 출처 카드 링크와 같은 위험 수준이지만, 크게 띄우는 만큼 노출은 커진다. 임베드를 끈 계정은 oEmbed 가 거부하므로 자동으로 대체 화면이 된다.
- 위 약관 해석은 공개 문서 · 기사 기준이며 법률 검토는 아니다.

### 3.5 설정 변경 필요 여부

| 항목 | 필요? | 근거 |
|---|---|---|
| CSP (`frame-src` 등) | **불필요** | 프로젝트에 CSP 헤더 없음 (`next.config.ts` headers 없음, `vercel.json` 없음, proxy 에도 없음). 나중에 CSP 를 켜면 `www.instagram.com`, `platform.twitter.com`, `syndication.twitter.com` 등을 허용해야 한다 |
| `images.remotePatterns` | **불필요** | 임베드는 iframe 이라 next/image 를 거치지 않는다 |
| 상대 사이트 쪽 제한 | 없음 | 인스타 `/embed/` 응답에 `frame-ancestors` · `X-Frame-Options` 없음 (curl 확인) |
| DB · 스키마 | **불필요** | `PostSource.url` 만으로 판정 |

---

## 4. 화면 배치안 (유튜브 글과 같은 틀)

### 4.1 어느 글이 임베드가 되나

```
PRIMARY 출처 중
  유튜브가 있으면          → 지금 그대로 (유튜브가 미디어 칸)
  없고, 인스타 /p/ · /reel/ 또는 X /status/ 가 있으면
                          → 그중 첫 번째가 미디어 칸 임베드 (서버 oEmbed 통과 시)
  그 밖                    → 지금 그대로 (사진 캐러셀이 미디어 칸)
```

`splitSources()` 가 지금 `{ youTube, rest }` 로 나누는 자리를 `{ media, rest }` 로 넓히는 모양이 된다 — 미디어 칸에 들어간 출처는 오른쪽 출처 카드에서 빠진다.

### 4.2 lg (PC)

```
┌──────────────── 왼쪽 열 ────────────────┐  ┌──── 오른쪽 열 ────┐
│ ┌──────────── 미디어 칸 16:9 ─────────┐ │  │ 제목 · 아이콘 줄   │
│ │  연회색 바탕(bg-muted)               │ │  │ 위치 카드          │
│ │          ┌──────────┐                │ │  │ 출처 카드          │
│ │          │ 원본 카드 │ ← 가운데,     │ │  │  (임베드된 것 제외)│
│ │          │ 비율 축소 │   칸 높이 맞춤│ │  │ recreeshot         │
│ │          └──────────┘                │ │  │ 좋아요 줄          │
│ └──────────────────────────────────────┘ │  └────────────────────┘
│ [사진][사진][사진 ▸  ← 유튜브 글과 같은 사진 줄 (strip)  │
│ 칩 · 더보기                               │
│ Fan To-Do · Story · 주변 관광지 · 댓글     │
└──────────────────────────────────────────┘
```

- **장소 사진 캐러셀** → 유튜브 글과 똑같이 미디어 칸 아래 가로 사진 줄(`BannerCarousel lgLayout="strip"`). 새 레이아웃을 만들지 않는다.
- **원본 장면 카드** → lg 에서 숨긴다 (유튜브 글과 같음, `page.tsx` 의 `youTube ? "lg:hidden"` 조건을 미디어 기준으로). 임베드가 원본 그 자체라 중복이다.
  사진 줄 위의 recreeshot 추가 버튼도 유튜브 글처럼 숨기고 오른쪽 recreeshot 카드가 맡는다.
- **오른쪽 출처 카드** → 임베드된 그 출처만 뺀다. 다른 출처(두 번째 X 글, 블로그 등)는 그대로 카드로 남는다.
  NCT DREAM 캠프그리브스 글처럼 X PRIMARY 가 5개인 글은 첫 번째만 미디어 칸, 나머지 4개는 카드.
- 칸 바탕은 기존 `bg-muted`(연회색) 토큰 — 새 색 없음. 좌우 빈 곳을 장소 사진 흐림 배경으로 채우는 안도 가능하지만 화풍이 바뀌므로 기본안에서 뺀다.

### 4.3 모바일 (<768) 과 태블릿 (768~1023)

16:9 칸 임베드는 모바일에서 배율 0.3~0.5 로 읽을 수 없다 (2.3 실측). 선택지:

| 안 | 모습 | 장단점 |
|---|---|---|
| **A. 지금 그대로** (추천, 1단계) | 맨 위 사진 캐러셀 + 원본 장면 카드, 출처 자리에 북마크 카드 | 모바일 변화 0. 인스타 북마크 카드가 빈 카드인 문제는 남는다 |
| B. 출처 자리에 원래 크기 임베드 | 유튜브 글이 모바일에서 출처 자리(order 5)에 영상을 두는 것과 같은 자리에, 16:9 없이 카드 원래 크기(폭 = 화면 − 32, 높이 약 530~620) | 크게 보인다. 대신 세로로 길어 Story · 위치까지 한참 내려가야 한다. 출처 자리는 첫 화면 밖이라 보일 때만 불러오기가 잘 맞는다 |

태블릿은 지금 모바일 틀(한 줄)이라 모바일 안을 따른다.

### 4.4 구현 청크 제안 (승인 후)

1. 서버 판정 — `splitSources` 확장 + oEmbed 확인(`unstable_cache`), lg 미디어 칸 선택 로직. 화면 변화 없이 판정 결과만 검증
2. `SocialEmbed` 부품 (인스타 iframe + MEASURE / X createTweet, 칸 맞춤 축소, 스켈레톤, 8초 대체) — lg 미디어 칸에만
3. lg 배치 — 사진 줄 · 원본 장면 카드 숨김 · 출처 카드 제외 (유튜브 글 조건을 미디어 기준으로)
4. (선택) 모바일 B 안
5. (별도 결정) 쿠키 동의 / 클릭해서 불러오기 · 개인정보처리방침 문구

부품 이름 `SocialEmbed` 는 확정됐다 (§5).

---

## 5. 구현 결과 (2026-10-03, feature/recree-desktop)

파일: `src/app/(user)/posts/[slug]/_components/SocialEmbed.tsx` · `social-source.ts`, 배치는 `posts/[slug]/page.tsx`.

**어느 글이 임베드가 되나** — §4.1 그대로. PRIMARY 에 유튜브가 없을 때 첫 인스타 게시물 · X 게시물(`pickSocialEmbed`).

**서버 판정** — `isSocialEmbeddable` 이 oEmbed 로 확인한다(인스타 토큰 없음, X `dnt=true`). 결과는 `unstable_cache` 1일.
"안 된다"가 분명한 답(인스타 오류 코드 24 · 100, X 404 · 403)만 캐시하고, 한도 초과 · 장애는 던져서 캐시에 남기지 않는다. 요청 시간 제한 3초.

**lg** — §4.2 의 "16:9 칸 + 회색 바탕" 안이 아니다.
- 미디어 줄 = 왼쪽 임베드 카드 + 오른쪽 장소 사진 세로 캐러셀(`BannerCarousel` lgLayout `"column"`).
- 카드 높이 목표 = 미디어 줄 위 끝 ~ 오른쪽 열 Like · Save · Helpful 줄(`data-media-end`)의 아래 끝. 카드는 원래 비율째 맞춘다.
- 폭이 모자라 카드가 그보다 낮아지면 낮은 높이 그대로 둔다. 사진 세로 캐러셀은 카드의 실제 높이(`--social-media-h`)를 따른다.
- 회색 바탕 상자 없음. 세로 캐러셀 화살표는 반투명 검정 원 + 흰 아이콘(위 · 아래).
- 원본 장면 카드 · 사진 위 recreeshot 추가 버튼은 lg 에서 숨긴다(유튜브 글과 같음).

**모바일 · 태블릿** — §4.3 의 **B 안**. 출처 카드 자리(유튜브 글의 영상과 같은 순서)에 임베드 카드만, 좌우 16 여백 안 전체 폭. X 카드는 최대 550, 가운데.

**공통**
- 카드 글은 영어로 고정: 인스타 iframe `?hl=en`, X `createTweet` 의 `lang: "en"`, `dnt: true`.
- 불러오기는 페이지 load 뒤(`afterPageLoad`) + 블록이 화면 300px 안으로 올 때(IntersectionObserver rootMargin).
- 불러오기 시작 후 8초 안에 카드가 안 뜨면 실패 → 지금 화면(사진 미디어 칸 · 원본 장면 카드 · 출처 카드)으로 돌아간다(`SocialEmbedSwitch`).
- 임베드된 출처는 출처 카드 목록에서 뺀다. 나머지 출처는 그대로 카드.
- DB · 스키마 변경 없음.

남은 정리(중복 훅 · 로더 · 파일 분할)는 `docs/recon/cleanup-backlog.md` 3-11 · 3-12 · 5-2.

---

## 후속 과제

- 개인정보처리방침에 Meta·X 추가, 쿠키 동의 배너 도입은 심사 후 과제

---

## 출처

- Meta oEmbed 토큰 요구 철회 (2026-06-15): https://wpmayor.com/meta-tokenless-oembed-wordpress/ · https://spotlightwp.com/instagram-embed-wordpress/ — 2026-10-03 토큰 없는 호출 200 직접 확인
- Instagram oEmbed 문서 (제한 · 사용 목적): https://developers.facebook.com/docs/instagram-platform/oembed
- X oEmbed API: https://docs.x.com/x-for-websites/oembed-api
- X Embedded Posts: https://docs.x.com/x-for-websites/embedded-posts/overview
- X 임베드 안정성 보고: https://launchwall.online/blog/why-x-twitter-embeds-stopped-working · https://socialrails.com/blog/how-to-embed-twitter-tweets-guide
- 인스타 임베드 저작권 (Sinclair v. Mashable): https://blog.ericgoldman.org/?p=21039
