-- 1. 컬럼 default를 false로 변경
ALTER TABLE "CuratedSection" ALTER COLUMN "showOnHome" SET DEFAULT false;

-- 2. 기존 데이터(모두 true로 들어간 것)를 false로 리셋
UPDATE "CuratedSection" SET "showOnHome" = false;
