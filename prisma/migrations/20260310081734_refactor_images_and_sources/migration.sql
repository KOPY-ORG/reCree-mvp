/*
  Warnings:

  - You are about to drop the column `subtitleKo` on the `CuratedSection` table. All the data in the column will be lost.
  - You are about to drop the column `images` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `sourceNote` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `sourceType` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `sourceUrl` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `referenceUrl` on the `PostSource` table. All the data in the column will be lost.
  - You are about to drop the column `sourceUrl` on the `PostSource` table. All the data in the column will be lost.
  - The `sourceType` column on the `PostSource` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `url` to the `PostSource` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ImageType" AS ENUM ('BANNER', 'ORIGINAL');

-- CreateEnum
CREATE TYPE "ImageSource" AS ENUM ('UPLOAD', 'URL', 'AUTO');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('PRIMARY', 'REFERENCE');

-- AlterTable
ALTER TABLE "CuratedSection" DROP COLUMN "subtitleKo";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "images",
DROP COLUMN "sourceNote",
DROP COLUMN "sourceType",
DROP COLUMN "sourceUrl",
DROP COLUMN "thumbnailUrl";

-- AlterTable
ALTER TABLE "PostSource" DROP COLUMN "referenceUrl",
DROP COLUMN "sourceUrl",
ADD COLUMN     "isOriginalLink" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "platform" TEXT,
ADD COLUMN     "url" TEXT NOT NULL,
DROP COLUMN "sourceType",
ADD COLUMN     "sourceType" "SourceType" NOT NULL DEFAULT 'PRIMARY';

-- CreateTable
CREATE TABLE "PostImage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "postId" UUID NOT NULL,
    "imageType" "ImageType" NOT NULL,
    "imageSource" "ImageSource" NOT NULL DEFAULT 'UPLOAD',
    "url" TEXT NOT NULL,
    "isThumbnail" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostImage_postId_idx" ON "PostImage"("postId");

-- CreateIndex
CREATE INDEX "PostSource_postId_idx" ON "PostSource"("postId");

-- AddForeignKey
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
