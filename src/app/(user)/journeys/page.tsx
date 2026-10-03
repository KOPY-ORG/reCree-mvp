import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMyCourses, getPublicCourses } from "@/lib/course-queries";
import { CourseCard } from "./_components/CourseCard";
import { PageTitle } from "../_components/PageTitle";

export default async function JourneysPage() {
  const currentUser = await getCurrentUser();

  // 공개 코스는 비로그인도 본다 — 로그인 여부는 내 코스 섹션과 New 버튼만 가른다
  const [myCourses, publicCourses] = await Promise.all([
    currentUser ? getMyCourses(currentUser.id) : Promise.resolve([]),
    getPublicCourses(),
  ]);

  return (
    <div className="pb-8">
      <header className="app-header lg:hidden">
        <div className="h-12 flex items-center justify-between px-4">
          <span className="font-bold text-base tracking-tight">Journeys</span>
          {currentUser && (
            <Link
              href="/journeys/new"
              className="flex items-center gap-1 pl-2.5 pr-3.5 py-1.5 rounded-full bg-brand text-black text-sm font-semibold transition-opacity hover:opacity-80"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              New
            </Link>
          )}
        </div>
      </header>

      {/* lg: 위 제목 바 대신. New 는 제목 줄 오른쪽으로 옮겨 온다 */}
      <PageTitle
        title="Journeys"
        className="lg:px-[var(--page-gutter)]"
        action={
          currentUser && (
            <Link
              href="/journeys/new"
              className="flex items-center gap-1 pl-2.5 pr-3.5 py-1.5 rounded-full bg-brand text-black text-sm font-semibold transition-opacity hover:opacity-80"
            >
              <Plus className="size-4" strokeWidth={2.5} />
              New
            </Link>
          )
        }
      />

      {currentUser && (
        <section className="pt-4 lg:pt-0">
          <h2 className="font-bold text-lg px-4 mb-3 lg:px-[var(--page-gutter)]">My Journeys</h2>
          {myCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 text-center py-10 px-4">
              <p className="text-base font-semibold">No journeys yet</p>
              <p className="text-sm text-muted-foreground">
                Plan a route and keep the spots you want to visit in one place.
              </p>
              <Link
                href="/journeys/new"
                className="mt-2 px-5 py-2.5 rounded-full bg-brand text-black text-sm font-semibold"
              >
                Create your first journey
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 lg:grid-cols-4 lg:px-[var(--page-gutter)] xl:grid-cols-5">
              {myCourses.map((course) => (
                <CourseCard key={course.id} course={course} isMine />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="pt-6">
        <h2 className="font-bold text-lg px-4 mb-3 lg:px-[var(--page-gutter)]">Public Journeys</h2>
        {publicCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-10 px-4">
            <p className="text-base font-semibold">No public journeys yet</p>
            <p className="text-sm text-muted-foreground">
              Journeys shared by other travelers will show up here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 lg:grid-cols-4 lg:px-[var(--page-gutter)] xl:grid-cols-5">
            {publicCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
