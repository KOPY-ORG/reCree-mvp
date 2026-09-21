import Link from "next/link";

/**
 * 없는 여정 — 프로젝트 첫 not-found.tsx 다.
 *
 * 이 화면이 없으면 Next 기본 404 가 뜬다. 앱 레이아웃 밖이라 탭바도 없고
 * 돌아갈 길도 없는 막다른 화면이다.
 *
 * 여기로 오는 길은 둘이고 둘 다 정상적인 경로다.
 *   - 여정을 지운 뒤 뒤로가기. 지운 상세의 히스토리 항목은 지울 수 없어 반드시 한 번은 밟는다
 *   - 남이 준 링크의 여정이 그 사이 지워졌거나 비공개로 바뀐 경우
 *
 * page.tsx 가 비공개 코스에도 notFound() 를 쓰므로(존재 자체를 노출하지 않는다)
 * 문구는 지워진 것과 비공개를 구별하지 않는다.
 */
export default function CourseNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-24 text-center">
      <p className="text-lg font-semibold">Journey not available</p>
      <p className="text-sm text-muted-foreground">
        It may have been deleted, or its owner made it private.
      </p>
      <Link
        href="/journeys"
        className="mt-4 px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold transition-opacity hover:opacity-80"
      >
        Browse journeys
      </Link>
    </div>
  );
}
