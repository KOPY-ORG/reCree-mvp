-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('POST', 'RECREESHOT');

-- AlterTable
ALTER TABLE "CuratedSection" ADD COLUMN     "contentType" "ContentType" NOT NULL DEFAULT 'POST',
ADD COLUMN     "subtitleEn" TEXT,
ADD COLUMN     "subtitleKo" TEXT;
