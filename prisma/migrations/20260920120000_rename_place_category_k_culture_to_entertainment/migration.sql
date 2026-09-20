-- PlaceCategory 의 K_CULTURE 를 ENTERTAINMENT 로 좁힌다 — 이름만 바꾼다.
--
-- 이 카테고리는 이제 연예 산업 시설(Agency · Venue · Broadcast Station · Filming Studio)만
-- 뜻한다. "팬에게 의미 있다" 는 장소의 속성이 아니라 Fan Spot 태그의 몫이다.
-- Fan Landmark 폐지 · School → OTHER 이동은 데이터 단계에서 따로 한다 (여기선 안 건드린다).
--
-- ⚠️ prisma migrate diff 는 이 자리에 AlterEnum(새 타입 생성 → USING 캐스트 → 옛 타입 DROP)을
--    냈지만 쓰지 않았다. 그 캐스트는 'K_CULTURE' 를 새 enum 에서 찾지 못해 실패한다.
--    RENAME VALUE 는 값의 ordinal 을 유지한 채 이름만 바꿔 행을 건드리지 않는다.
--
-- ⚠️ 같은 diff 가 Comment·Feedback·PostLike 의 기존 drift 도 함께 냈다
--    (id DROP DEFAULT, Feedback.createdAt 타입 변경) — 이번 작업과 무관해 일부러 뺐다.
--    직전 마이그레이션(20260920000000)에서 뺀 것과 같은 항목이다.

-- AlterEnum
ALTER TYPE "PlaceCategory" RENAME VALUE 'K_CULTURE' TO 'ENTERTAINMENT';
