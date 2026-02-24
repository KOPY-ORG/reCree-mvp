-- AlterTable: Topic에서 type, subtype 컬럼 제거
ALTER TABLE "Topic" DROP COLUMN "type",
DROP COLUMN "subtype";

-- DropEnum: TopicType 열거형 제거
DROP TYPE "TopicType";
