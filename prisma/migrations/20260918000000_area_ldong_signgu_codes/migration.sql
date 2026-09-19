-- Area.lDongSignguCd (단수) → lDongSignguCds (배열)
--
-- 일반시(수원·창원 등 13곳)는 축제 데이터가 시 코드가 아니라 구 코드에 붙어 있어
-- 코드 하나로는 조회가 안 된다. 수원시(110)는 0건, 구 4개(111·113·115·117)는 16건이다.
-- 배열로 바꿔 시 하나가 구 여러 개를 들고 있게 한다.
--
-- 기존 lDongSignguCd 는 dev·prod 전부 NULL 이라 데이터 마이그레이션이 없다.
--
-- ⚠️ migrate dev 로 만들지 않고 손으로 적었다. migrate diff 가 이 변경과 무관한
--    기존 drift(Comment·Feedback·PostLike 의 id DROP DEFAULT)까지 끌어오기 때문이다.

-- AlterTable
ALTER TABLE "Area" DROP COLUMN "lDongSignguCd",
ADD COLUMN     "lDongSignguCds" TEXT[];
