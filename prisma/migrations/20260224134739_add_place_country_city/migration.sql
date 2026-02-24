-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'KR';
