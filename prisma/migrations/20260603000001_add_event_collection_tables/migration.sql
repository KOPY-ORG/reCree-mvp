-- CreateTable: EventCollection
CREATE TABLE "EventCollection" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EventCollectionTranslation
CREATE TABLE "EventCollectionTranslation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "collectionId" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "EventCollectionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: EventCollection.slug unique
CREATE UNIQUE INDEX "EventCollection_slug_key" ON "EventCollection"("slug");

-- CreateIndex: EventCollectionTranslation unique
CREATE UNIQUE INDEX "EventCollectionTranslation_collectionId_locale_key" ON "EventCollectionTranslation"("collectionId", "locale");

-- AddForeignKey: EventCollectionTranslation → EventCollection
ALTER TABLE "EventCollectionTranslation" ADD CONSTRAINT "EventCollectionTranslation_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "EventCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Event: eventCollection(Text) → eventCollectionId(UUID FK)
DROP INDEX "Event_eventCollection_idx";
ALTER TABLE "Event" DROP COLUMN "eventCollection";
ALTER TABLE "Event" ADD COLUMN "eventCollectionId" UUID NOT NULL;

-- CreateIndex: Event.eventCollectionId
CREATE INDEX "Event_eventCollectionId_idx" ON "Event"("eventCollectionId");

-- AddForeignKey: Event → EventCollection
ALTER TABLE "Event" ADD CONSTRAINT "Event_eventCollectionId_fkey"
    FOREIGN KEY ("eventCollectionId") REFERENCES "EventCollection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
