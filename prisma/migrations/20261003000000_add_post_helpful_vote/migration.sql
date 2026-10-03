-- 게시글 "도움이 됐어요" 투표 — 새 테이블만 추가한다. 기존 테이블 · 칼럼은 건드리지 않는다.
-- dev 에만 적용했다. prod 는 이 파일을 검토 후 CLAUDE.md 의 prod 마이그레이션 절차로 적용한다 (concertrip 과 prod DB 공유).


-- CreateTable
CREATE TABLE "PostHelpfulVote" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "voterKey" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostHelpfulVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostHelpfulVote_postId_ipHash_createdAt_idx" ON "PostHelpfulVote"("postId", "ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "PostHelpfulVote_ipHash_createdAt_idx" ON "PostHelpfulVote"("ipHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostHelpfulVote_postId_voterKey_key" ON "PostHelpfulVote"("postId", "voterKey");

-- AddForeignKey
ALTER TABLE "PostHelpfulVote" ADD CONSTRAINT "PostHelpfulVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

