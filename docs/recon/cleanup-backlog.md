# 정리 보류 목록 — push 전 정리 감사 (2026-10-03, feature/recree-desktop)

감사에서 찾았지만 이번에 고치지 않은 것. 줄 번호는 감사 시점 기준이다.

| 번호 | 위치 | 내용 | 보류 이유 | 위험도 |
|---|---|---|---|---|
| 1-3 | `(user)/_components/PageContainer.tsx` | reading · narrow 변형과 `as` prop 을 쓰는 곳이 없다 | 다음 청크(상세 · 편집기)에서 쓸 예정 | 낮음 |
| 1-4 | `(user)/_components/PageTitle.tsx` | `action` prop 을 쓰는 곳이 없다 | 다음 청크에서 쓸 예정 | 낮음 |
| 1-13 | `StickerPanel.tsx:170` · `ScoreSheet.tsx:35` · `HallGrid.tsx:27` | 안 쓰는 prop: `selectedPlace` · `onToggle` · `guideVideo` | 부르는 쪽까지 고쳐야 한다 | 중간 |
| — | `(user)/_components/LanguageSelector.tsx` | AppHeader 의 주석 처리된 사용을 지우면 참조가 0 이 된다 | 지울지 결정 필요 | 낮음 |
| 3-11 | `YouTubeEmbed.tsx` · `SocialEmbed.tsx` | "보일 때 불러오기" 훅이 두 벌. 옵션이 다르다(threshold 0.5 / rootMargin 300px) | 옵션 차이를 맞출지 정해야 한다 | 중간 |
| 3-12 | `YouTubeEmbed.tsx` `loadYouTubeApi` | **버그**: 스크립트 onerror 가 없다. iframe_api 로드가 실패하면 promise 가 끝나지 않아 플레이어가 안 뜨고 스켈레톤이 남는다. 실패 시 초기화하는 SocialEmbed 로더와 합친다 | 3-11 과 같이 정리 | 중간 |
| 3-13 | `SocialEmbed.tsx` `useIsLg` · `_hooks/useRailLayout.ts` | lg 판정 훅이 두 벌. 마운트 전 값이 다르다(null / false) | 두 쪽 사용처 동작 확인 필요 | 중간 |
| 3-14 | `BookmarkCard` PlatformFallback · `OriginalSourceCards` DomainFallback | 대체 표시의 크기 · 색 · 플랫폼 판정이 다르다. 또 `OriginalSourceCards.tsx:56` 의 `hostname.includes("x.com")` 이 netflix.com 도 잡는다 | 디자인 결정 필요 | 중간 |
| 3-16 | `posts/[slug]/page.tsx` | 글 설명을 두 곳(metadata · JSON-LD)에서 따로 만든다. bodyEn 이 비면 동작이 다르다 | 어느 쪽을 기준으로 할지 결정 필요 | 중간 |
| 4-3 | `events/[collectionSlug]/[eventSlug]/page.tsx` · `posts/[slug]/page.tsx` | 이벤트 상세는 최대 폭 73rem · 좌우 40 고정, 게시글 상세는 81rem · 좌우 32 · 위 24 를 직접 쓴다. 토큰(gutter · `--w-reading` · `--space-page-top`)과 일부 폭에서 값이 다르다 | 화면이 바뀌므로 청크 9 에서 | 중간~높음 |
| 4-4 | `DesktopHeader` · `.app-header` · `DiscoverSearchBar` | 같은 바 그림자(0 1px 4px, 검정 7%)를 세 곳이 따로 쓴다 | 새 그림자 토큰 이름 필요 | 중간 |
| 4-5 | `PageTitle.tsx` · 게시글 제목 | 페이지 제목 글자 토큰(lg 28)이 아직 없다. 둘 다 28 을 직접 쓴다 | 글자 토큰 청크(2)에서 | 중간 |
| 5-1 | `posts/[slug]/page.tsx` | 3~4단계: 데이터 로딩을 `loadPostDetailView` 로, 블록 클로저를 서버 컴포넌트로 | 변경 폭이 크다 | 높음 |
| 5-2 | `SocialEmbed.tsx` (약 418줄) | context · 훅 · Instagram · X 파일로 나눈다 | 동작 변화 없이 따로 | 중간 |
| 5-4 | `src/app/globals.css` | 같은 미디어쿼리 블록이 여러 개 — 합친다. 합친 뒤 `.next` 를 지우고 확인 | CSS 캐시 함정(CLAUDE.md) 때문에 따로 | 중간 |
| 5-5 | 기존 큰 파일 | ExploreMapView 1224 · CourseEditor 1388 · events 상세 page 840 · PlaceAddSheet 667 · StickerPanel 609 · DiscoverFilterSheet 511 · AttractionDetailSheet 464 · ReCreeshotUploadFlow 461 · ProfileView 400 · HallDetailTopSection 309 | 이번 작업 전부터 있던 것 | 높음 |
| 6-3 | `ScrollToTopButton.tsx:66` · `ReCreeshotUploadFlow.tsx:154` · `StickerPanel.tsx:208,239` · `useDiscoverFilters.ts:185` · `useRecentSearches.ts:39` | lint `react-hooks/set-state-in-effect` 오류 (admin `EventForm.tsx:792` 는 범위 밖) | 동작 확인하며 하나씩 | 높음 |
| 7-4 (일부) | `src/components/recreeshot-image.tsx` | `ReCreeshotImage` 의 alt 가 늘 "recreeshot" 이라 목록(저장 · 상세 · 프로필)에서 썸네일 링크 이름이 모두 같다 | alt prop 을 열고 부르는 쪽마다 장소 · 글 이름을 넘겨야 한다 — 호출부 데이터 확인 필요 | 낮음 |
| 7-7 | `OriginalSourceCards` SourceCard · `DiscoverSearchBar` 최근 검색 줄 · `PlaceListSheetCard` | div onClick — 키보드로 닿지 않는다 | 접근성 묶음으로 | 중간 |
| 7-8 | `ProfileView` 드로어 · `HallDetailTopSection` 삭제 확인 | role=dialog · aria-modal · Esc 닫기 없음 | 접근성 묶음으로 | 중간 |
| 7-9 | `LocationCard` | 장식용 지도 iframe 에 Tab 이 닿는다 | 접근성 묶음으로 | 중간 |
| 7-10 | `DiscoverSearchBar` | button 안에 span role=button 이 중첩돼 있다 | 구조를 바꿔야 한다 | 높음 |
| 10-3 | `docs/design/desktop-redesign-plan.md` §4.4 · §4.6 · §4.10 | Journeys · Shop(· recreeshot) 큰 제목: 계획은 PageTitle, `PageTitle.tsx` 규칙은 "상단 바 메뉴에 이름이 있는 화면은 안 씀", 코드에는 PageTitle 없음 | 어느 쪽으로 할지 결정 후 계획 문서 수정 | 낮음 |
| 범위 밖 | `src/app/api/og-image/route.ts` `ALLOWED_DOMAINS` | **OG 메타 미수집 도메인 목록, allowlist 정책 검토 필요.** 허용 목록 밖이라 제목 · 설명 · 썸네일을 가져오지 않는 출처 13개(발행 글 PRIMARY 기준, 2026-10-03): enewstoday.co.kr 2 · royal.khs.go.kr 2 · yna.co.kr · museum.go.kr · vlive.tv · facebook.com · programs.sbs.co.kr · lifefourcuts.com · hankyung.com · ddp.or.kr · sunshinestudio.co.kr. 허용 목록 안이지만 메타가 없는 것 2개: pin.it(Pinterest 단축 링크) · namu.wiki. 지금은 카드가 도메인 · "Visit website" 로 대신 채워진다 | 허용 목록은 서버가 임의 URL 을 가져오지 않게 막는 장치라, 넓힐지 · 다른 방식(예: 저장된 메타)으로 갈지 정책 결정이 먼저다 | 낮음 |
| 범위 밖 | `journeys/loading.tsx` | 로딩 화면 `.app-header` 에 lg 숨김이 없다 — lg 에서 로딩 중에만 이중 헤더 | 발견만 | 낮음 |
| 범위 밖 | `CourseEditorSkeleton.tsx` | `data-narrow-layout` 이 없다 (계획 §4.7) | 발견만 | 낮음 |
| 범위 밖 | DB `PostSource` | platform 'X' 인데 URL 이 netflix.com 인 행 3개 | DB 데이터 — 읽기 전용, 코드로 고치지 않는다 | 낮음 |
| 범위 밖 | `KoreaMapCard.tsx` | 카드 테두리가 surface 규칙(선 없음)과 다르다 | `surface.md` 에 예외로 기록함 | 낮음 |
| 범위 밖 | 바꾸지 않은 파일들 | 남은 lint 경고: EditorToolbar 안 쓰는 인자, recreeshot-image variant, ReCreeshotUploadFlow userId | 발견만 | 낮음 |
