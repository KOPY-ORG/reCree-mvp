-- AlterEnum
ALTER TYPE "SaveTarget" ADD VALUE 'COURSE';

-- AlterTable
ALTER TABLE "Area" ADD COLUMN     "lDongRegnCd" TEXT,
ADD COLUMN     "lDongSignguCd" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "radiusM" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Course" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "authorId" UUID NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "copyCount" INTEGER NOT NULL DEFAULT 0,
    "copiedFromId" UUID,
    "coverImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseDay" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT,

    CONSTRAINT "CourseDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseItem" (
    "id" UUID NOT NULL,
    "dayId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "placeId" UUID,
    "nameEn" TEXT NOT NULL,
    "nameKo" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "note" TEXT,

    CONSTRAINT "CourseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseTopic" (
    "courseId" UUID NOT NULL,
    "topicId" UUID NOT NULL,

    CONSTRAINT "CourseTopic_pkey" PRIMARY KEY ("courseId","topicId")
);

-- CreateIndex
CREATE INDEX "Course_authorId_idx" ON "Course"("authorId");

-- CreateIndex
CREATE INDEX "Course_isPublic_createdAt_idx" ON "Course"("isPublic", "createdAt");

-- CreateIndex
CREATE INDEX "CourseDay_courseId_idx" ON "CourseDay"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseDay_courseId_dayNumber_key" ON "CourseDay"("courseId", "dayNumber");

-- CreateIndex
CREATE INDEX "CourseItem_dayId_sortOrder_idx" ON "CourseItem"("dayId", "sortOrder");

-- CreateIndex
CREATE INDEX "CourseTopic_topicId_idx" ON "CourseTopic"("topicId");

-- CreateIndex
CREATE INDEX "Area_parentId_idx" ON "Area"("parentId");

-- CreateIndex
CREATE INDEX "Area_level_isActive_idx" ON "Area"("level", "isActive");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseDay" ADD CONSTRAINT "CourseDay_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "CourseDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
