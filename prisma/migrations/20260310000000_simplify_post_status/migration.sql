-- 1) 기존 IMPORTED, AI_DRAFTED 포스트를 DRAFT로 업데이트
UPDATE "Post" SET "status" = 'DRAFT' WHERE "status" IN ('IMPORTED', 'AI_DRAFTED');

-- 2) DEFAULT 제약 제거 (enum 타입 변경 전에 필요)
ALTER TABLE "Post" ALTER COLUMN "status" DROP DEFAULT;

-- 3) 이전 실패로 잔류했을 수 있는 임시 타입 정리
DROP TYPE IF EXISTS "PostStatus_new";

-- 4) 새 enum 생성
CREATE TYPE "PostStatus_new" AS ENUM ('DRAFT', 'PUBLISHED');

-- 5) 컬럼 타입 변경
ALTER TABLE "Post" ALTER COLUMN "status" TYPE "PostStatus_new" USING "status"::text::"PostStatus_new";

-- 6) 구 enum 삭제 후 새 enum을 원래 이름으로 변경
DROP TYPE "PostStatus";
ALTER TYPE "PostStatus_new" RENAME TO "PostStatus";

-- 7) DEFAULT 재설정
ALTER TABLE "Post" ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"PostStatus";
