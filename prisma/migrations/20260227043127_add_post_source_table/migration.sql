-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "collectedAt" TEXT,
ADD COLUMN     "collectedBy" TEXT;

-- CreateTable
CREATE TABLE "PostSource" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "postId" UUID NOT NULL,
    "sourceType" TEXT,
    "sourceUrl" TEXT,
    "sourceNote" TEXT,
    "sourcePostDate" TEXT,
    "referenceUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSource_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PostSource" ADD CONSTRAINT "PostSource_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
