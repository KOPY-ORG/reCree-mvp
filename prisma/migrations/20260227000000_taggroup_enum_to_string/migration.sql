-- enum → text 변환 (USING 절 필수)
ALTER TABLE "Tag" ALTER COLUMN "group" TYPE TEXT USING "group"::TEXT;
ALTER TABLE "TagGroupConfig" ALTER COLUMN "group" TYPE TEXT USING "group"::TEXT;
DROP TYPE IF EXISTS "TagGroup";
