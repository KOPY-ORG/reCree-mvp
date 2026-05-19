-- CreateTable
CREATE TABLE "TopicFollow" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopicFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TopicFollow_userId_topicId_key"
    ON "TopicFollow"("userId", "topicId");

CREATE INDEX "TopicFollow_userId_createdAt_idx"
    ON "TopicFollow"("userId", "createdAt" DESC);

CREATE INDEX "TopicFollow_topicId_idx"
    ON "TopicFollow"("topicId");

-- AddForeignKey
ALTER TABLE "TopicFollow"
    ADD CONSTRAINT "TopicFollow_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TopicFollow"
    ADD CONSTRAINT "TopicFollow_topicId_fkey"
    FOREIGN KEY ("topicId") REFERENCES "Topic"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
