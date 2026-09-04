"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import { showError } from "@/lib/toast";
import { createCourse, updateCourse } from "@/app/(user)/_actions/course-actions";
import type { CourseDetail } from "@/lib/course-queries";
import { coverBackground, NEUTRAL_COVER } from "./course-cover";
import { CONTROL_LINE, FIELD_LINE, INK, LINE, MUTED, PAPER, SUB } from "../_constants";

// ─── 타입 ────────────────────────────────────────────────────────────────────

/**
 * 편집기 초기값. getCourseDetail 결과를 edit/page.tsx 가 이 모양으로 펴서 넘긴다
 * (admin/posts/[id]/edit/page.tsx 가 PostInitialData 를 조립하는 방식과 같다).
 */
export type CourseEditorInitialData = {
  title: string;
  isPublic: boolean;
  /** 아이템 썸네일 색을 상세 화면과 같은 규칙으로 뽑기 위해 필요하다 */
  topics: CourseDetail["topics"];
  days: {
    id: string;
    dayNumber: number;
    title: string | null;
    items: {
      id: string;
      placeId: string | null;
      nameEn: string;
      address: string | null;
    }[];
  }[];
};

interface CourseEditorProps {
  mode: "create" | "edit";
  courseId?: string;
  initialData?: CourseEditorInitialData;
}

// ─── 에러 문구 ───────────────────────────────────────────────────────────────

/** course-actions 의 에러 코드 → 사용자 문구. CopyCourseButton 과 같은 분기다. */
function courseErrorMessage(error?: string): string {
  if (error === "unauthenticated") return "Session expired. Sign in again.";
  if (error === "not_found") return "This journey is no longer available.";
  if (error === "forbidden") return "You can only edit your own journeys.";
  if (error === "invalid_input") return "Check the title and try again.";
  return "Something went wrong. Try again.";
}

// ─── CourseEditor ────────────────────────────────────────────────────────────

/**
 * 코스 편집기. 저장 버튼에 모아 보내지 않고 변경 시점마다 해당 액션을 바로 호출한다
 * (course-actions 에 전체 상태를 받는 액션이 없다).
 *
 * create 모드는 화면 진입만으로는 아무것도 만들지 않는다. 제목을 처음 blur 할 때
 * createCourse 를 부르고 /journeys/{id}/edit 로 replace 해 edit 모드로 갈아탄다.
 */
export function CourseEditor({
  mode,
  courseId: initialCourseId,
  initialData,
}: CourseEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? false);
  const [courseId, setCourseId] = useState<string | undefined>(initialCourseId);

  // 제목 입력 blur 와 ✓ 클릭이 같은 tick 에 겹칠 수 있다(✓ 를 누르면 입력이 먼저 blur 된다).
  // 그때 state 는 아직 갱신 전이므로 최신값을 ref 로도 들고 있는다.
  const courseIdRef = useRef(initialCourseId);
  const savedTitleRef = useRef(initialData?.title ?? "");
  // 진행 중인 제목 저장. 겹쳐 호출돼도 서버 왕복은 한 번이고 둘 다 같은 결과를 받는다.
  // 이 가드가 없으면 blur 와 ✓ 가 createCourse 를 두 번 불러 코스가 두 개 생긴다.
  const titleCommitRef = useRef<Promise<string | undefined> | null>(null);

  const days = initialData?.days ?? [];
  const itemCount = days.reduce((sum, day) => sum + day.items.length, 0);
  const cover = initialData ? coverBackground(initialData.topics) : NEUTRAL_COVER;

  // ── 이탈 ───────────────────────────────────────────────────────────────────

  /** CourseBackButton 과 같은 판단 — 히스토리가 없으면 목록으로 */
  function leaveEditor() {
    if (window.history.length > 1) router.back();
    else router.push("/journeys");
  }

  // ── 제목 저장 ──────────────────────────────────────────────────────────────

  /**
   * 제목을 서버에 반영하고 코스 id 를 돌려준다. 저장할 게 없으면 현재 id 를 그대로 준다.
   * 실패하면 토스트를 띄우고 undefined 를 준다 — 호출부는 화면에 남는다.
   */
  function commitTitle(): Promise<string | undefined> {
    if (titleCommitRef.current) return titleCommitRef.current;

    const trimmed = title.trim();
    const id = courseIdRef.current;

    if (!trimmed) {
      // 이미 있는 코스의 제목을 비운 것은 저장할 수 없다 — 조용히 넘기지 않고 알린다.
      // create 모드에서 제목이 비어 있는 것은 정상이다(아직 만들지 않은 상태).
      if (id) showError("Journey title can't be empty.");
      return Promise.resolve(undefined);
    }
    if (id && trimmed === savedTitleRef.current) return Promise.resolve(id);

    const commit = (async () => {
      try {
        if (id) {
          const result = await updateCourse(id, { title: trimmed });
          if (result.error) {
            showError(courseErrorMessage(result.error));
            return undefined;
          }
          savedTitleRef.current = trimmed;
          return id;
        }

        const result = await createCourse({ title: trimmed });
        if (result.error || !result.id) {
          showError(courseErrorMessage(result.error));
          return undefined;
        }
        savedTitleRef.current = trimmed;
        courseIdRef.current = result.id;
        setCourseId(result.id);
        return result.id;
      } catch {
        showError("Something went wrong. Try again.");
        return undefined;
      } finally {
        titleCommitRef.current = null;
      }
    })();

    titleCommitRef.current = commit;
    return commit;
  }

  function handleTitleBlur() {
    startTransition(async () => {
      const id = await commitTitle();
      // 방금 만들어진 코스면 편집 주소로 갈아탄다.
      // replace 여야 뒤로가기가 /journeys/new 로 돌아오지 않는다.
      if (id && !initialCourseId) router.replace(`/journeys/${id}/edit`);
    });
  }

  // ── 공개 여부 ──────────────────────────────────────────────────────────────

  function handleToggleVisibility() {
    const id = courseIdRef.current;
    if (!id) return;

    const next = !isPublic;
    setIsPublic(next); // 토글은 즉시 움직이고 실패하면 되돌린다
    startTransition(async () => {
      try {
        const result = await updateCourse(id, { isPublic: next });
        if (result.error) {
          setIsPublic(!next);
          showError(courseErrorMessage(result.error));
        }
      } catch {
        setIsPublic(!next);
        showError("Something went wrong. Try again.");
      }
    });
  }

  // ── 완료 ───────────────────────────────────────────────────────────────────

  /**
   * 저장은 이미 끝나 있으므로 여기서 다시 저장하지 않는다.
   * 다만 제목을 입력하다 blur 없이 눌렀을 수 있어 commitTitle 을 한 번 통과시킨다.
   */
  function handleDone() {
    startTransition(async () => {
      const id = await commitTitle();
      if (!id) {
        // 제목을 한 번도 쓰지 않았으면 아무것도 만들지 않고 나간다.
        // 저장 실패였다면 commitTitle 이 이미 토스트를 띄웠으니 화면에 남는다.
        if (!courseIdRef.current) leaveEditor();
        return;
      }
      router.push(`/journeys/${id}`);
    });
  }

  // ── 렌더 ───────────────────────────────────────────────────────────────────

  const placeLabel = `${itemCount} ${itemCount === 1 ? "place" : "places"}`;

  return (
    <div className="flex min-h-full flex-col">
      {/* ── 헤더 ──────────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="flex h-14 items-center gap-1 px-1.5">
          <button
            type="button"
            aria-label="Go back"
            onClick={leaveEditor}
            className="flex size-11 flex-none items-center justify-center rounded-full transition-colors active:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>

          <h1 className="min-w-0 flex-1 truncate text-base font-bold tracking-tight">
            {mode === "edit" ? "Edit Journey" : "Create New Journey"}
          </h1>

          <button
            type="button"
            onClick={handleDone}
            disabled={isPending}
            className="flex h-11 flex-none items-center gap-1.5 rounded-full bg-brand pl-3.5 pr-4 text-sm font-semibold text-black transition-opacity disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" strokeWidth={2.6} />
            )}
            Done
          </button>
        </div>
      </header>

      {/* ── 제목 · 메타 · 공개 여부 ───────────────────────────────────────── */}
      <div className="px-[18px] pt-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          // 모바일 키보드의 완료 키로도 저장이 걸리게 한다
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder="Name Your Journey"
          maxLength={100}
          enterKeyHint="done"
          aria-label="Journey title"
          className="w-full border-b-2 bg-transparent pb-3 text-[22px] font-bold leading-[1.2] tracking-[-0.02em] outline-none placeholder:font-bold placeholder:text-muted-foreground/50"
          style={{ color: INK, borderBottomColor: FIELD_LINE }}
        />

        <p className="mt-3.5 text-[12.5px] font-medium leading-none" style={{ color: SUB }}>
          {placeLabel}
        </p>

        {/* 카드 전체가 토글이다 — 시안의 46×26 스위치만으로는 터치 타깃이 부족하다.
            shadcn Switch 는 <button> 을 렌더해 이 행 안에 중첩할 수 없어 표시만 직접 그린다. */}
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          onClick={handleToggleVisibility}
          disabled={!courseId || isPending}
          className="mt-[18px] flex w-full items-center gap-3 rounded-[14px] px-4 py-3.5 text-left transition-opacity disabled:opacity-60"
          style={{ background: PAPER }}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-medium leading-none" style={{ color: INK }}>
              {isPublic ? "Public" : "Private"}
            </span>
            <span
              className="mt-1.5 block text-[11px] font-medium leading-[1.3]"
              style={{ color: SUB }}
            >
              {courseId
                ? "Public journeys can be found and copied by other fans."
                : "Name your journey first to change this."}
            </span>
          </span>

          <span
            aria-hidden
            className="relative h-[26px] w-[46px] flex-none rounded-full transition-colors"
            style={{ background: isPublic ? "var(--brand)" : CONTROL_LINE }}
          >
            <span
              className="absolute top-0.5 size-[22px] rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,.2)] transition-[left] duration-200"
              style={{ left: isPublic ? 22 : 2 }}
            />
          </span>
        </button>
      </div>

      {/* ── Day · 아이템 (읽기 전용 — 편집은 2/5, 3/5) ───────────────────── */}
      {days.length === 0 ? (
        <div className="px-[18px] pt-6">
          <div className="rounded-[14px] px-[18px] py-[22px] text-center" style={{ background: PAPER }}>
            <p className="text-[12.5px] font-medium leading-[1.3]" style={{ color: INK }}>
              {courseId ? "No days yet" : "Start with a name"}
            </p>
            <p className="mt-1.5 text-[11px] font-medium leading-[1.45]" style={{ color: MUTED }}>
              {courseId
                ? "Every day you add shows up here."
                : "Your journey is saved as soon as you name it. Days and places come next."}
            </p>
          </div>
        </div>
      ) : (
        days.map((day) => (
          <section key={day.id} className="px-[18px] pt-6">
            <div className="flex items-center gap-2.5">
              <h2 className="text-[15px] font-bold leading-none" style={{ color: INK }}>
                Day {day.dayNumber}
                {day.title ? ` · ${day.title}` : ""}
              </h2>
              <span className="text-[10.5px] font-semibold leading-none" style={{ color: SUB }}>
                {day.items.length} {day.items.length === 1 ? "place" : "places"}
              </span>
            </div>

            {day.items.length === 0 ? (
              <div
                className="mt-3 rounded-[14px] border-[1.5px] border-dashed px-[18px] py-[22px] text-center"
                style={{ borderColor: CONTROL_LINE }}
              >
                <p className="text-[12.5px] font-medium leading-[1.3]" style={{ color: INK }}>
                  Empty day
                </p>
                <p className="mt-1.5 text-[11px] font-medium leading-[1.45]" style={{ color: MUTED }}>
                  Keep it as a rest day, or add the first stop.
                </p>
              </div>
            ) : (
              day.items.map((item, i) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-3"
                  style={{ borderBottom: `1px solid ${LINE}` }}
                >
                  <div
                    className="flex size-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold leading-none text-white"
                    style={{ background: INK }}
                  >
                    {i + 1}
                  </div>
                  <div
                    className="size-14 flex-none rounded-xl"
                    style={{ background: item.placeId ? cover : NEUTRAL_COVER }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[13px] font-medium leading-[1.3]"
                      style={{ color: INK }}
                    >
                      {item.nameEn}
                    </p>
                    {item.address && (
                      <p
                        className="mt-[5px] truncate text-[11px] font-medium leading-[1.2]"
                        style={{ color: SUB }}
                      >
                        {item.address}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>
        ))
      )}

      <div className="h-10" />
    </div>
  );
}
