-- Event.slug 추가 (db push로 dev에 적용됨 → prod 신규 적용)
ALTER TABLE "Event" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- EventBodyBlock.caption 추가 (db execute로 dev에 적용됨 → prod 신규 적용)
ALTER TABLE "EventBodyBlock" ADD COLUMN "caption" TEXT;

-- EventTranslation 불필요 컬럼 제거 (초기 마이그레이션 20260603000000에서 생성, 이후 schema에서 삭제)
ALTER TABLE "EventTranslation" DROP COLUMN IF EXISTS "eventContent";
ALTER TABLE "EventTranslation" DROP COLUMN IF EXISTS "contentDetail";
