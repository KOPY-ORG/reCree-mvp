-- AlterTable
ALTER TABLE "PostImage" ADD COLUMN     "isSlotCard" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slotIndex" INTEGER;

-- 기존 ORIGINAL 이미지 데이터 마이그레이션: sortOrder 0 → slot 0, sortOrder 1 → slot 1
UPDATE "PostImage"
SET "slotIndex" = "sortOrder", "isSlotCard" = true
WHERE "imageType" = 'ORIGINAL' AND "sortOrder" IN (0, 1);
