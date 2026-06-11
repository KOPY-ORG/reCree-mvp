-- AlterTable: ReCreeshot 신규 필드 (모두 nullable, additive)
ALTER TABLE "ReCreeshot" ADD COLUMN IF NOT EXISTS "cut1Url" TEXT,
ADD COLUMN IF NOT EXISTS "cut2Url" TEXT,
ADD COLUMN IF NOT EXISTS "cut3Url" TEXT,
ADD COLUMN IF NOT EXISTS "cut4Url" TEXT,
ADD COLUMN IF NOT EXISTS "editorLayers" JSONB,
ADD COLUMN IF NOT EXISTS "frameColorHex" TEXT,
ADD COLUMN IF NOT EXISTS "referenceLabel" TEXT,
ADD COLUMN IF NOT EXISTS "shotLabel" TEXT,
ADD COLUMN IF NOT EXISTS "templateId" TEXT,
ADD COLUMN IF NOT EXISTS "templateMode" TEXT;

-- CreateTable: Sticker
CREATE TABLE IF NOT EXISTS "Sticker" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Sticker_pkey" PRIMARY KEY ("id")
);
