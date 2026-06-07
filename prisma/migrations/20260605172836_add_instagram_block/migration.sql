-- AlterEnum
ALTER TYPE "EventBlockType" ADD VALUE 'INSTAGRAM';

-- AlterTable
ALTER TABLE "EventBodyBlock" ADD COLUMN "embedUrl" TEXT;
