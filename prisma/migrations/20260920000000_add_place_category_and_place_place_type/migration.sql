-- 장소 카테고리 도입 — 추가만 한다. 삭제·이름 변경 없음.
--
-- Place.placeTypes(String[]) 는 그대로 둔다. 옛 코드가 계속 그것을 읽는다.
-- PlacePlaceType 은 같은 내용을 순서와 FK 를 갖춘 형태로 함께 들고 있는다.
--
-- ⚠️ prisma migrate diff 는 Comment·Feedback·PostLike 의 기존 drift 도 함께 냈다.
--    (id DROP DEFAULT, Feedback.createdAt 타입 변경) — 이번 작업과 무관해 일부러 뺐다.

-- CreateEnum
CREATE TYPE "PlaceCategory" AS ENUM ('EAT', 'CAFE', 'BAR', 'ATTRACTIONS', 'K_CULTURE', 'EXPERIENCE', 'SHOP', 'STAY', 'OTHER');

-- AlterTable
ALTER TABLE "PlaceType" ADD COLUMN     "category" "PlaceCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlacePlaceType" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "placeTypeId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacePlaceType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlacePlaceType_placeId_sortOrder_idx" ON "PlacePlaceType"("placeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PlacePlaceType_placeId_placeTypeId_key" ON "PlacePlaceType"("placeId", "placeTypeId");

-- CreateIndex
CREATE INDEX "PlaceType_category_sortOrder_idx" ON "PlaceType"("category", "sortOrder");

-- AddForeignKey
ALTER TABLE "PlacePlaceType" ADD CONSTRAINT "PlacePlaceType_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacePlaceType" ADD CONSTRAINT "PlacePlaceType_placeTypeId_fkey" FOREIGN KEY ("placeTypeId") REFERENCES "PlaceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
