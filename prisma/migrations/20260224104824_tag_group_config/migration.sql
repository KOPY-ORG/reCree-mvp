-- AlterTable
ALTER TABLE "Tag" ALTER COLUMN "colorHex" DROP NOT NULL,
ALTER COLUMN "colorHex" DROP DEFAULT,
ALTER COLUMN "textColorHex" DROP NOT NULL,
ALTER COLUMN "textColorHex" DROP DEFAULT;

-- CreateTable
CREATE TABLE "TagGroupConfig" (
    "group" "TagGroup" NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#C6FD09',
    "colorHex2" TEXT,
    "textColorHex" TEXT NOT NULL DEFAULT '#000000',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TagGroupConfig_pkey" PRIMARY KEY ("group")
);
