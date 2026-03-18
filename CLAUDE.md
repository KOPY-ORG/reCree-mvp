# CLAUDE.md — reCree MVP

## 프로젝트 개요
reCree는 해외 K-콘텐츠 팬을 위한 장소 아카이빙 및 여행 계획 플랫폼.
관리자가 K-POP/K-Drama 관련 장소와 포스트를 등록하고, 사용자가 탐색·저장·코스 생성하는 서비스.

## 기술 스택
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend/DB**: Supabase (PostgreSQL, Auth, Storage), Prisma ORM (v7)
- **Maps**: Google Maps API (@vis.gl/react-google-maps)
- **AI**: Gemini API (추후 연동)
- **Deploy**: Vercel
- **패키지 매니저**: pnpm


## 핵심 데이터 모델
- **Topic**: 트리 구조 (K-POP > 보이그룹 > BTS > 정국). parentId + level로 4단계.
- **Tag**: 장소 유형 태그 (FOOD, SPOT, EXPERIENCE 등). TagGroup별 분류.
- **Place**: 장소. country/city 필드로 글로벌 확장 대비. Google Maps 연동.
- **Post**: 포스트. 상태: DRAFT → REVIEWED → PUBLISHED. Topic/Tag/Place 연결.
- Topic과 Tag에는 colorHex(배경색), textColorHex(글씨색, 검은색 또는 흰색), isActive, sortOrder 필드 있음.

## 코딩 컨벤션

### Server Actions
- 파일 위치: `app/(admin)/admin/[feature]/_actions/[feature]-actions.ts`
- 각 액션에서 `revalidatePath()` 호출
- 에러는 에러 메시지 문자열로 반환, UI에서 toast 표시 (sonner)

### 컴포넌트
- Server Component 우선. 클라이언트 필요한 경우만 "use client"
- UI 라이브러리: shadcn/ui + lucide-react 아이콘
- 이모지 사용 금지. 모든 아이콘은 lucide-react로 통일
- 드래그앤드롭: @dnd-kit/core, @dnd-kit/sortable

### 스타일링
- Tailwind CSS만 사용. 인라인 style 최소화
- 프로젝트 키 컬러: #C6FD09 (라임), 검은색/흰색 기본

### 인증
- Supabase Auth (Google OAuth)
- /admin/* 경로는 미들웨어에서 인증 체크
- MVP에서는 역할 구분 없이 전원 ADMIN 권한

### DB
- Prisma ORM. Server Component/Server Action에서 직접 호출
- 다대다 관계: 조인 테이블 사용 (PostTopic, PlaceTopic, PlaceTag 등)
- 삭제: 조인 테이블은 onDelete: Cascade. 본 테이블은 하위 참조 확인 후 삭제

## 주의사항
- MVP 단계. 오버엔지니어링 금지. 빠르고 단순하게.
- 관리자 페이지는 데스크톱 전용. 반응형 불필요.
- 국제화: MVP에서는 영어 우선. 관리자 UI는 한글.
- Google Maps 컴포넌트는 SSR 불가. "use client" + 로딩 fallback 필수.