-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PostStatus" ADD VALUE 'IMPORTED';
ALTER TYPE "PostStatus" ADD VALUE 'AI_DRAFTED';

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "rating" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "importNote" TEXT,
ADD COLUMN     "sourceNote" TEXT,
ADD COLUMN     "sourceType" TEXT,
ADD COLUMN     "sourceUrl" TEXT;
