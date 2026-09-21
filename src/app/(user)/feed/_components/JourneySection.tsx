import Link from "next/link";
import { Plus } from "lucide-react";
import { getPublicCourses } from "@/lib/course-queries";
import { HScrollSection } from "@/components/curation/HScrollSection";
import { CourseCard } from "../../journeys/_components/CourseCard";

const TITLE = "Journeys";

/** 더보기가 가는 곳 — 코스 전체 목록 */
const MORE_HREF = "/journeys";

const TAKE = 10;

/**
 * 카드 폭. 축제 160px · 리크리샷 120px 과 다른 값이다 —
 * 커버가 4/3 가로라 좁히면 사진이 띠처럼 눌린다. 180px 이면 커버가 135px 이고
 * 375px 화면에서 두 장에 다음 장의 머리가 걸쳐 "옆에 더 있다"가 읽힌다.
 */
const CARD_W = "w-[180px]";

/**
 * 공개 코스 줄.
 *
 * 페이지에서 props 를 받지 않고 스스로 조회한다 (PopularReCreeshotSection 과 같은 패턴).
 * 사용자와 무관한 공용 목록이고 단순 orderBy 라 <Suspense> 를 쓰지 않는다 —
 * 페이지와 같이 기다린다.
 *
 * Hot 탭에서는 코스가 0건이어도 섹션을 숨기지 않는다. 맨 뒤의 "Create a journey"
 * 카드가 남아 여정 기능이 있다는 것을 그 자리에서 알린다.
 * 토픽 탭은 반대다 — 그 토픽의 코스가 없으면 섹션째로 내리고, 있어도 생성 카드는
 * 붙이지 않는다. 그 줄에 서는 것은 전부 "그 토픽의 것"이어야 한다.
 */
export async function JourneySection({
  topicId,
  title = TITLE,
}: {
  /** 있으면 이 토픽이 걸린 코스만. 없으면 전체 */
  topicId?: string;
  title?: string;
} = {}) {
  const courses = await getPublicCourses({ take: TAKE, topicId });

  if (topicId && courses.length === 0) return null;

  return (
    // 토픽 탭에서는 More 를 걸지 않는다. /journeys 가 토픽으로 좁히는 길을
    // 갖고 있지 않아, 눌러 보면 전체 목록이 나온다 — 없는 편이 낫다
    <HScrollSection title={title} moreHref={topicId ? undefined : MORE_HREF}>
      {courses.map((course) => (
        <div key={course.id} className={`${CARD_W} shrink-0`}>
          <CourseCard course={course} />
        </div>
      ))}

      {/*
        개수와 무관하게 항상 맨 뒤에 붙는다. 코스가 늘면 자연히 뒤로 밀린다.
        높이를 적지 않는 것은 flex 기본 stretch 로 옆 카드 높이에 맞춰지기 때문이다 —
        카드 글줄이 몇 줄이든 같은 크기가 된다.
        비로그인이 눌러도 막지 않는다. /journeys/new 가 /login 으로 보낸다 (new/page.tsx:20)
      */}
      {!topicId && (
        <Link
          href="/journeys/new"
          className={`${CARD_W} shrink-0 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#E2E2DC] text-center transition-colors hover:border-brand active:opacity-70`}
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-brand text-black">
            <Plus className="size-5" strokeWidth={2.5} />
          </span>
          <span className="px-3 text-[13px] font-semibold leading-[1.3]">Create a journey</span>
        </Link>
      )}
    </HScrollSection>
  );
}
