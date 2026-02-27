-- PostTopic에 라벨 표시 제어 필드 추가
ALTER TABLE "PostTopic" ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PostTopic" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- PostTag에 라벨 표시 제어 필드 추가
ALTER TABLE "PostTag" ADD COLUMN "isVisible" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PostTag" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;
