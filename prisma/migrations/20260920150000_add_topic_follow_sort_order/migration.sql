-- DropIndex
DROP INDEX "TopicFollow_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "TopicFollow" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Save_targetType_createdAt_idx" ON "Save"("targetType", "createdAt");

-- CreateIndex
CREATE INDEX "TopicFollow_userId_sortOrder_idx" ON "TopicFollow"("userId", "sortOrder");

-- 기존 행 초기값 — 사용자별로 최신 팔로우가 앞에 오도록 0부터 채운다.
-- 이 칼럼이 생기기 전의 정렬(createdAt desc)을 그대로 굳히는 것이라 화면이 바뀌지 않는다.
UPDATE "TopicFollow" tf
SET "sortOrder" = ranked.rn - 1
FROM (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" DESC) AS rn
  FROM "TopicFollow"
) AS ranked
WHERE tf.id = ranked.id;
