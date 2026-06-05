-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_placeId_fkey";

-- DropIndex
DROP INDEX "Event_placeId_idx";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "placeId",
ADD COLUMN     "saveCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Place" ADD COLUMN     "amapUrl" TEXT;

-- CreateTable
CREATE TABLE "EventPlace" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPlace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPlace_eventId_idx" ON "EventPlace"("eventId");

-- CreateIndex
CREATE INDEX "EventPlace_placeId_idx" ON "EventPlace"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPlace_eventId_placeId_key" ON "EventPlace"("eventId", "placeId");

-- AddForeignKey
ALTER TABLE "EventPlace" ADD CONSTRAINT "EventPlace_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPlace" ADD CONSTRAINT "EventPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
