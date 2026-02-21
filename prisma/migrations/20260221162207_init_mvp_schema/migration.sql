-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PlaceSource" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "PlaceStatus" AS ENUM ('OPEN', 'CLOSED_TEMP', 'CLOSED_PERMANENT');

-- CreateEnum
CREATE TYPE "ReCreeshotStatus" AS ENUM ('ACTIVE', 'REPORTED', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "TopicType" AS ENUM ('CATEGORY', 'GROUP', 'PERSON', 'WORK', 'SEASON', 'OTHER');

-- CreateEnum
CREATE TYPE "TagGroup" AS ENUM ('FOOD', 'SPOT', 'EXPERIENCE', 'ITEM', 'BEAUTY');

-- CreateEnum
CREATE TYPE "SaveTarget" AS ENUM ('POST', 'RECREESHOT');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('MANUAL', 'AUTO_NEW', 'AUTO_HOT');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT,
    "bio" TEXT,
    "profileImageUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" UUID NOT NULL,
    "nameKo" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "TopicType" NOT NULL,
    "subtype" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "parentId" UUID,
    "colorHex" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "group" "TagGroup" NOT NULL,
    "colorHex" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" UUID NOT NULL,
    "titleKo" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtitleKo" TEXT,
    "subtitleEn" TEXT,
    "bodyKo" TEXT,
    "bodyEn" TEXT,
    "thumbnailUrl" TEXT,
    "images" TEXT[],
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "source" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "authorId" UUID,
    "translatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" UUID NOT NULL,
    "nameKo" TEXT NOT NULL,
    "nameEn" TEXT,
    "addressKo" TEXT,
    "addressEn" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "googlePlaceId" TEXT,
    "naverPlaceId" TEXT,
    "phone" TEXT,
    "operatingHours" JSONB,
    "imageUrl" TEXT,
    "source" "PlaceSource" NOT NULL DEFAULT 'ADMIN',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "PlaceStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReCreeshot" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "placeId" UUID,
    "linkedPostId" UUID,
    "imageUrl" TEXT NOT NULL,
    "referencePhotoUrl" TEXT,
    "story" TEXT,
    "tips" TEXT,
    "locationName" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "matchScore" DOUBLE PRECISION,
    "showBadge" BOOLEAN NOT NULL DEFAULT false,
    "status" "ReCreeshotStatus" NOT NULL DEFAULT 'ACTIVE',
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReCreeshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostTopic" (
    "postId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostTopic_pkey" PRIMARY KEY ("postId","topicId")
);

-- CreateTable
CREATE TABLE "PostTag" (
    "postId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostTag_pkey" PRIMARY KEY ("postId","tagId")
);

-- CreateTable
CREATE TABLE "PostPlace" (
    "postId" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "context" TEXT,
    "vibe" TEXT[],
    "mustTry" TEXT,
    "tip" TEXT,
    "reference" TEXT,
    "insightEn" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostPlace_pkey" PRIMARY KEY ("postId","placeId")
);

-- CreateTable
CREATE TABLE "PlaceTopic" (
    "placeId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceTopic_pkey" PRIMARY KEY ("placeId","topicId")
);

-- CreateTable
CREATE TABLE "PlaceTag" (
    "placeId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceTag_pkey" PRIMARY KEY ("placeId","tagId")
);

-- CreateTable
CREATE TABLE "ReCreeshotTopic" (
    "reCreeshotId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReCreeshotTopic_pkey" PRIMARY KEY ("reCreeshotId","topicId")
);

-- CreateTable
CREATE TABLE "ReCreeshotTag" (
    "reCreeshotId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReCreeshotTag_pkey" PRIMARY KEY ("reCreeshotId","tagId")
);

-- CreateTable
CREATE TABLE "Save" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "targetType" "SaveTarget" NOT NULL,
    "targetId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Save_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeBanner" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "HomeBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuratedSection" (
    "id" UUID NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleKo" TEXT NOT NULL,
    "type" "SectionType" NOT NULL DEFAULT 'MANUAL',
    "postIds" UUID[],
    "filterTopicId" UUID,
    "filterTagId" UUID,
    "maxCount" INTEGER NOT NULL DEFAULT 10,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CuratedSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopularSearch" (
    "id" UUID NOT NULL,
    "keyword" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PopularSearch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Topic_slug_key" ON "Topic"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Post_slug_key" ON "Post"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Place_googlePlaceId_key" ON "Place"("googlePlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Save_userId_targetType_targetId_key" ON "Save"("userId", "targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "PopularSearch_keyword_key" ON "PopularSearch"("keyword");

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReCreeshot" ADD CONSTRAINT "ReCreeshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReCreeshot" ADD CONSTRAINT "ReCreeshot_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTopic" ADD CONSTRAINT "PostTopic_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTopic" ADD CONSTRAINT "PostTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostTag" ADD CONSTRAINT "PostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostPlace" ADD CONSTRAINT "PostPlace_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostPlace" ADD CONSTRAINT "PostPlace_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTopic" ADD CONSTRAINT "PlaceTopic_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTopic" ADD CONSTRAINT "PlaceTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTag" ADD CONSTRAINT "PlaceTag_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTag" ADD CONSTRAINT "PlaceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReCreeshotTopic" ADD CONSTRAINT "ReCreeshotTopic_reCreeshotId_fkey" FOREIGN KEY ("reCreeshotId") REFERENCES "ReCreeshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReCreeshotTopic" ADD CONSTRAINT "ReCreeshotTopic_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReCreeshotTag" ADD CONSTRAINT "ReCreeshotTag_reCreeshotId_fkey" FOREIGN KEY ("reCreeshotId") REFERENCES "ReCreeshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReCreeshotTag" ADD CONSTRAINT "ReCreeshotTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Save" ADD CONSTRAINT "Save_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeBanner" ADD CONSTRAINT "HomeBanner_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratedSection" ADD CONSTRAINT "CuratedSection_filterTopicId_fkey" FOREIGN KEY ("filterTopicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuratedSection" ADD CONSTRAINT "CuratedSection_filterTagId_fkey" FOREIGN KEY ("filterTagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;
