-- AlterTable
ALTER TABLE "TagGroupConfig" ADD COLUMN     "gradientDir" TEXT NOT NULL DEFAULT 'to bottom',
ADD COLUMN     "gradientStop" INTEGER NOT NULL DEFAULT 150;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "gradientDir" TEXT NOT NULL DEFAULT 'to bottom',
ADD COLUMN     "gradientStop" INTEGER NOT NULL DEFAULT 150;
