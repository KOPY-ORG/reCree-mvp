-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('CONCERT', 'LANDMARK_LIGHTING', 'PROMOTION', 'ACTIVITY', 'SHOPPING', 'MOBILITY', 'FNB', 'STAY', 'WELCOME_KIT');

-- CreateEnum
CREATE TYPE "EventEntryType" AS ENUM ('WALK_IN', 'RESERVATION', 'TICKET');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ENDED');

-- CreateEnum
CREATE TYPE "EventBlockType" AS ENUM ('TEXT', 'IMAGE');

-- CreateTable
CREATE TABLE "Event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "placeId" UUID NOT NULL,
    "eventCollection" TEXT NOT NULL,
    "category" "EventCategory" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "openTime" TEXT,
    "closeTime" TEXT,
    "entryType" "EventEntryType" NOT NULL DEFAULT 'WALK_IN',
    "reservationUrl" TEXT,
    "officialUrl" TEXT,
    "snsUrl" TEXT,
    "bannerImageUrl" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTranslation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventContent" TEXT,
    "contentDetail" TEXT,
    "description" TEXT,
    "hoursNote" TEXT,

    CONSTRAINT "EventTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPerk" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" UUID NOT NULL,
    "imageUrl" TEXT,
    "perkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventPerk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventPerkTranslation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "perkId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "badge" TEXT,
    "title" TEXT NOT NULL,
    "detail" TEXT,

    CONSTRAINT "EventPerkTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventBodyBlock" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" UUID NOT NULL,
    "type" "EventBlockType" NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventBodyBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventBodyBlockTranslation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "blockId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "EventBodyBlockTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_eventCollection_idx" ON "Event"("eventCollection");

-- CreateIndex
CREATE INDEX "Event_placeId_idx" ON "Event"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTranslation_eventId_locale_key" ON "EventTranslation"("eventId", "locale");

-- CreateIndex
CREATE INDEX "EventPerk_eventId_idx" ON "EventPerk"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPerkTranslation_perkId_locale_key" ON "EventPerkTranslation"("perkId", "locale");

-- CreateIndex
CREATE INDEX "EventBodyBlock_eventId_idx" ON "EventBodyBlock"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventBodyBlockTranslation_blockId_locale_key" ON "EventBodyBlockTranslation"("blockId", "locale");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTranslation" ADD CONSTRAINT "EventTranslation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPerk" ADD CONSTRAINT "EventPerk_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPerkTranslation" ADD CONSTRAINT "EventPerkTranslation_perkId_fkey" FOREIGN KEY ("perkId") REFERENCES "EventPerk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBodyBlock" ADD CONSTRAINT "EventBodyBlock_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventBodyBlockTranslation" ADD CONSTRAINT "EventBodyBlockTranslation_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "EventBodyBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
