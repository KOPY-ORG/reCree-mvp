-- NULL 값을 default 색상으로 채운 뒤 NOT NULL + DEFAULT 설정

-- AlterTable Tag
UPDATE "Tag" SET "colorHex" = '#C6FD09' WHERE "colorHex" IS NULL;
ALTER TABLE "Tag" ADD COLUMN     "textColorHex" TEXT NOT NULL DEFAULT '#000000',
ALTER COLUMN "colorHex" SET NOT NULL,
ALTER COLUMN "colorHex" SET DEFAULT '#C6FD09';

-- AlterTable Topic
UPDATE "Topic" SET "colorHex" = '#C6FD09' WHERE "colorHex" IS NULL;
ALTER TABLE "Topic" ADD COLUMN     "textColorHex" TEXT NOT NULL DEFAULT '#000000',
ALTER COLUMN "colorHex" SET NOT NULL,
ALTER COLUMN "colorHex" SET DEFAULT '#C6FD09';
