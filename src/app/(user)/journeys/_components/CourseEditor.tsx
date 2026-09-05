"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, ChevronLeft, GripVertical, Loader2, Plus, Trash2, X } from "lucide-react";
import { showError } from "@/lib/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  addCourseDay,
  addCourseItem,
  createCourse,
  removeCourseDay,
  removeCourseItem,
  reorderCourseItems,
  updateCourse,
} from "@/app/(user)/_actions/course-actions";
import type { CourseDetail } from "@/lib/course-queries";
import { coverBackground, NEUTRAL_COVER } from "./course-cover";
import { PlaceAddSheet, type PickedPlace } from "./PlaceAddSheet";
import {
  CONTROL_LINE,
  DANGER,
  DANGER_BG,
  FIELD_LINE,
  INK,
  LINE,
  MUTED,
  PAPER,
  SUB,
} from "../_constants";

// ─── 상수 ────────────────────────────────────────────────────────────────────

/**
 * course-actions.ts:11 의 MAX_DAYS 와 같은 값.
 * "use server" 파일은 async 함수 외에는 export 할 수 없어 여기 둔다.
 * 서버가 여전히 상한을 강제하므로(invalid_input) 이 값은 UI 표시용이다.
 */
const MAX_DAYS = 7;

/** course-actions.ts:12 의 MAX_ITEMS_PER_DAY 와 같은 값. 위와 같은 이유로 여기 둔다. */
const MAX_ITEMS_PER_DAY = 20;

/**
 * 아직 서버에 없는 Day 의 id 접두사.
 * 하이드레이션이 어긋나지 않도록 randomUUID 가 아니라 순번으로 만든다.
 */
const LOCAL_DAY_PREFIX = "local-";
/** 아직 서버에 없는 아이템의 id 접두사 (초안에서 담았거나 저장이 아직 안 끝난 장소) */
const LOCAL_ITEM_PREFIX = "local-item-";

function isLocalDay(dayId: string) {
  return dayId.startsWith(LOCAL_DAY_PREFIX);
}

function isLocalItem(itemId: string) {
  return itemId.startsWith(LOCAL_ITEM_PREFIX);
}

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type EditorDay = {
  id: string;
  dayNumber: number;
  title: string | null;
  /**
   * 좌표·이미지까지 들고 있는 이유는 두 가지다.
   * - 좌표: Nearby Attractions 의 기준점을 이 목록에서 찾는다
   * - 둘 다: 초안 아이템은 Done 을 누를 때 addCourseItem 으로 풀어야 해서 원본 값이 필요하다
   */
  items: {
    id: string;
    placeId: string | null;
    nameEn: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    imageUrl: string | null;
  }[];
};

/**
 * 편집기 초기값. getCourseDetail 결과를 edit/page.tsx 가 이 모양으로 펴서 넘긴다
 * (admin/posts/[id]/edit/page.tsx 가 PostInitialData 를 조립하는 방식과 같다).
 */
export type CourseEditorInitialData = {
  title: string;
  isPublic: boolean;
  /** 아이템 썸네일 색을 상세 화면과 같은 규칙으로 뽑기 위해 필요하다 */
  topics: CourseDetail["topics"];
  days: EditorDay[];
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

/**
 * 고른 장소 → addCourseItem 입력. placeId 유무가 곧 두 갈래다.
 * external 쪽 필드는 전부 optional 이라 값이 없으면 아예 빼서 보낸다
 * (imageUrl 은 z.string().url() 이라 빈 문자열이나 상대 경로가 들어가면 아이템 전체가 거부된다).
 */
function toAddItemInput(picked: PickedPlace) {
  if (picked.placeId) return { source: "place" as const, placeId: picked.placeId };
  return {
    source: "external" as const,
    nameEn: picked.nameEn,
    ...(picked.address ? { address: picked.address } : {}),
    ...(picked.latitude !== null ? { latitude: picked.latitude } : {}),
    ...(picked.longitude !== null ? { longitude: picked.longitude } : {}),
    ...(picked.imageUrl && /^https?:\/\//.test(picked.imageUrl)
      ? { imageUrl: picked.imageUrl }
      : {}),
  };
}

/** 로컬 Day 목록을 1..n 으로 다시 매긴다 — removeCourseDay 의 서버 재번호와 같은 규칙 */
function renumber(days: EditorDay[]): EditorDay[] {
  return days.map((day, i) => (day.dayNumber === i + 1 ? day : { ...day, dayNumber: i + 1 }));
}

// ─── SortableItemRow ─────────────────────────────────────────────────────────

/**
 * 아이템 한 줄. 드래그는 전용 핸들에서만 시작한다.
 *
 * 행 전체를 드래그 영역으로 만들면 모바일에서 세로 스크롤과 같은 제스처가 되어 부딪힌다.
 * 핸들에만 listeners 를 붙이고 그 밖은 손대지 않으면 충돌이 원천적으로 안 생긴다
 * (SortableTagList 도 핸들 방식이지만 그쪽은 어드민이라 PointerSensor 만 쓴다).
 *
 * 순번은 sortOrder 가 아니라 배열 인덱스로 그린다 — 드래그 직후 바로 맞아야 한다.
 */
function SortableItemRow({
  item,
  index,
  cover,
  onRemove,
}: {
  item: EditorDay["items"][number];
  index: number;
  cover: string;
  onRemove: (itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="relative flex items-center gap-2.5 py-2"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderBottom: `1px solid ${LINE}`,
        // 끌고 있는 줄이 다른 줄 위로 올라오고, 놓을 자리는 원래 줄이 흐리게 남는다
        opacity: isDragging ? 0.45 : 1,
        background: isDragging ? PAPER : undefined,
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <span
        className="flex size-6 flex-none items-center justify-center rounded-full text-[11px] font-semibold leading-none text-white"
        style={{ background: INK }}
      >
        {index + 1}
      </span>

      <span
        aria-hidden
        className="size-11 flex-none rounded-xl"
        style={{ background: item.placeId ? cover : NEUTRAL_COVER }}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-[1.3]" style={{ color: INK }}>
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

      {/* 드래그 핸들 — 44×44, touch-action: none. 여기 밖은 그냥 스크롤이다. */}
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label={`Reorder ${item.nameEn}`}
        className="flex size-11 flex-none touch-none cursor-grab items-center justify-center rounded-full active:cursor-grabbing"
      >
        <GripVertical className="size-4" style={{ color: SUB }} />
      </button>

      {/* 삭제 — 확인 모달 없이 바로 지운다. Day 와 달리 하나씩이라 되돌리기 쉽고,
          여러 개를 지울 때 매번 모달을 거치면 번거롭다. */}
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.nameEn}`}
        className="flex size-11 flex-none items-center justify-center rounded-full transition-colors active:bg-muted"
      >
        <X className="size-4" style={{ color: INK }} strokeWidth={2.4} />
      </button>
    </div>
  );
}

// ─── CourseEditor ────────────────────────────────────────────────────────────

/**
 * 코스 편집기. 화면은 하나지만 저장 시점이 두 갈래다.
 *
 *   draft (courseId 없음)  — 아직 코스가 없다. 제목·공개여부·Day 를 전부 로컬에서 만진다.
 *                            서버를 한 번도 부르지 않으므로 깜빡임이 없다.
 *                            Done 을 눌러야 비로소 코스가 생긴다.
 *   saved (courseId 있음)  — 이미 있는 코스다. 변경할 때마다 해당 액션을 바로 호출한다.
 *
 * 이렇게 나눈 이유:
 * - 제목을 코스 생성의 트리거로 쓰면 "이름부터 지어야 아무것도 못 하는" 화면이 된다.
 *   토글도 Day 추가도 막히고, 이름을 짓는 순간 라우트가 갈리면서 화면이 통째로 다시 그려진다.
 * - Course.title 이 NOT NULL 이라(schema.prisma:797) 이름 없는 코스를 미리 만들어 둘 수도 없다.
 * - 그래서 "코스가 생기기 전"을 화면에서 지우는 대신 로컬 초안으로 다룬다.
 *   Done 하나가 유일한 커밋 지점이 되고, "제목이 있어야 Done" 이라는 규칙이 두 갈래에서 같아진다.
 */
export function CourseEditor({
  mode,
  courseId: initialCourseId,
  initialData,
}: CourseEditorProps) {
  const router = useRouter();
  const titleHintId = useId();
  const dndId = useId();

  // pending 을 용도별로 나눈다. 하나로 묶으면 어느 컨트롤을 눌러도 화면의 disabled 요소가
  // 전부 함께 흐려져(각각 transition-opacity) 화면 전체가 깜빡이는 것처럼 보인다.
  const [titlePending, startTitleTransition] = useTransition();
  const [visibilityPending, startVisibilityTransition] = useTransition();
  const [isDayPending, startDayTransition] = useTransition();
  // 아이템 삭제·정렬은 어떤 컨트롤도 흐리게 하지 않는다. 지운 줄은 그 자리에서 사라지고
  // 옮긴 줄은 그 자리에 있는 것이 곧 피드백이라, pending 을 disabled 에 연결하지 않는다.
  // 그래도 저장 중 이탈은 막아야 해서 트랜지션 자체는 따로 둔다.
  const [itemPending, startItemTransition] = useTransition();

  /** 저장이 하나라도 돌고 있으면 화면을 뜨면 안 된다 — Done 버튼만 이걸 본다 */
  const isBusy = titlePending || visibilityPending || isDayPending || itemPending;

  /**
   * 터치와 마우스를 모두 등록한다.
   * 코드베이스의 dnd-kit 사용처 11개는 전부 어드민이라 PointerSensor 만 쓰는데,
   * 모바일에서는 드래그와 스크롤이 같은 제스처라 그것만으로는 부딪힌다.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 5 } }),
  );

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? false);
  const [courseId, setCourseId] = useState<string | undefined>(initialCourseId);

  /**
   * Day 목록은 화면이 소유한다. 서버 결과를 그대로 렌더하면 액션이 끝날 때까지 아무 반응이
   * 없다가 트리가 통째로 갈린다 — 그게 지금 깜빡임의 절반이다.
   *
   * 초안은 Day 1 로 시작한다. createCourse 가 Day 1 을 함께 만들기 때문에(course-actions:118)
   * 눈에 보이는 것과 실제로 만들어지는 것이 일치한다.
   */
  const [days, setDays] = useState<EditorDay[]>(
    () =>
      initialData?.days ?? [
        { id: `${LOCAL_DAY_PREFIX}1`, dayNumber: 1, title: null, items: [] },
      ],
  );
  const localDayCounter = useRef(1);
  const localItemCounter = useRef(0);

  /**
   * 서버가 새 Day 목록을 내려주면 채택한다. effect 가 아니라 렌더 중 비교다
   * (React 의 "props 가 바뀔 때 state 조정" 패턴 — 이 저장소는 set-state-in-effect 가 lint 에러다).
   * 낙관적으로 넣어 둔 local Day 가 여기서 진짜 id·번호를 가진 Day 로 바뀐다.
   */
  const serverDays = initialData?.days;
  const [lastServerDays, setLastServerDays] = useState(serverDays);
  if (serverDays !== undefined && serverDays !== lastServerDays) {
    setLastServerDays(serverDays);
    setDays(serverDays);
  }

  // 겹쳐 눌러도 서버 왕복은 한 번이고 둘 다 같은 결과를 받는다.
  // 이 가드가 없으면 입력 blur 와 Done 클릭이 같은 저장을 두 번 보낸다.
  const titleCommitRef = useRef<Promise<boolean> | null>(null);
  const courseIdRef = useRef(initialCourseId);
  const savedTitleRef = useRef(initialData?.title ?? "");
  const dayMutatingRef = useRef(false);

  // 삭제 확인 대기 중인 Day. null 이면 모달이 닫혀 있다.
  const [pendingDeleteDayId, setPendingDeleteDayId] = useState<string | null>(null);

  // 장소 추가 시트가 열린 Day. 번호를 따로 들고 있는 이유는 닫히는 애니메이션 동안에도
  // 시트 제목("Add to Day 3")이 그대로 남아야 하기 때문이다 — id 만 지우고 번호는 둔다.
  const [sheetDayId, setSheetDayId] = useState<string | null>(null);
  const [sheetDayNumber, setSheetDayNumber] = useState(1);

  // ── 파생값 ─────────────────────────────────────────────────────────────────

  /** 아직 서버에 코스가 없는 상태 */
  const isDraft = courseId === undefined;
  const itemCount = days.reduce((sum, day) => sum + day.items.length, 0);
  const cover = initialData ? coverBackground(initialData.topics) : NEUTRAL_COVER;
  const atMaxDays = days.length >= MAX_DAYS;
  const pendingDeleteDay = days.find((day) => day.id === pendingDeleteDayId) ?? null;
  const sheetDay = days.find((day) => day.id === sheetDayId) ?? null;

  /**
   * Done 의 유일한 조건 — 제목이 있어야 한다. 두 갈래에서 규칙이 같다.
   *   draft — 제목이 있어야 코스를 만들 수 있다 (titleSchema.min(1))
   *   saved — 제목이 없으면 저장할 수 없는 상태다
   * 나머지(토글·Day)는 제목과 무관하게 언제든 만질 수 있다.
   */
  const trimmedTitle = title.trim();
  const canFinish = trimmedTitle.length > 0;

  // ── 이탈 ───────────────────────────────────────────────────────────────────

  /** CourseBackButton 과 같은 판단 — 히스토리가 없으면 목록으로 */
  function leaveEditor() {
    if (window.history.length > 1) router.back();
    else router.push("/journeys");
  }

  // ── 제목 ───────────────────────────────────────────────────────────────────

  /**
   * 이미 있는 코스의 제목을 저장한다. 저장할 게 없으면 true 를 그대로 돌려준다.
   * 초안일 때는 아무것도 하지 않는다 — 제목은 Done 에서 코스와 함께 만들어진다.
   */
  function commitTitle(): Promise<boolean> {
    if (titleCommitRef.current) return titleCommitRef.current;

    const id = courseIdRef.current;
    if (!id) return Promise.resolve(true);

    // 빈 제목은 서버에 보내지 않는다. titleSchema 가 min(1) 이라 결과가 invalid_input 인 것을
    // 이미 알고 있다. 안내는 입력란 아래 인라인 메시지가 상시로 한다.
    // 이전 값으로 되돌리지도 않는다 — 방금 지운 편집이 무시된 것처럼 보이고 다시 쓰려던 흐름이 끊긴다.
    if (!trimmedTitle) return Promise.resolve(false);
    if (trimmedTitle === savedTitleRef.current) return Promise.resolve(true);

    const commit = (async () => {
      try {
        const result = await updateCourse(id, { title: trimmedTitle });
        if (result.error) {
          showError(courseErrorMessage(result.error));
          return false;
        }
        savedTitleRef.current = trimmedTitle;
        return true;
      } catch {
        showError("Something went wrong. Try again.");
        return false;
      } finally {
        titleCommitRef.current = null;
      }
    })();

    titleCommitRef.current = commit;
    return commit;
  }

  function handleTitleBlur() {
    if (isDraft) return; // 초안의 제목은 로컬에만 있다
    startTitleTransition(async () => {
      await commitTitle();
    });
  }

  // ── 공개 여부 ──────────────────────────────────────────────────────────────

  function handleToggleVisibility() {
    const next = !isPublic;
    setIsPublic(next); // 토글은 언제나 즉시 움직인다

    // 초안이면 여기서 끝이다. Done 에서 코스를 만들 때 함께 반영된다.
    if (!courseIdRef.current) return;

    const id = courseIdRef.current;
    startVisibilityTransition(async () => {
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

  // ── Day 추가·삭제 ──────────────────────────────────────────────────────────

  function nextLocalDay(current: EditorDay[]): EditorDay {
    localDayCounter.current += 1;
    return {
      id: `${LOCAL_DAY_PREFIX}${localDayCounter.current}`,
      dayNumber: current.length + 1,
      title: null,
      items: [],
    };
  }

  function handleAddDay() {
    if (atMaxDays) return;

    // 화면은 먼저 움직인다. 서버 응답을 기다리는 동안 아무 일도 안 일어난 것처럼 보이면 안 된다.
    const added = nextLocalDay(days);
    setDays((prev) => [...prev, { ...added, dayNumber: prev.length + 1 }]);

    const id = courseIdRef.current;
    if (!id) return; // 초안 — Done 에서 한꺼번에 만든다

    if (dayMutatingRef.current) return;
    dayMutatingRef.current = true;

    startDayTransition(async () => {
      try {
        const result = await addCourseDay(id);
        if (result.error || !result.id) {
          // 서버가 거부했으면 방금 넣은 것만 뺀다
          setDays((prev) => renumber(prev.filter((day) => day.id !== added.id)));
          showError(courseErrorMessage(result.error));
          return;
        }
        // 진짜 id 로 바로 갈아 끼운다. revalidate 가 도착하기 전에도 이 Day 에
        // 장소를 담을 수 있어야 한다 — addCourseItem 은 진짜 dayId 를 받는다.
        const realId = result.id;
        setDays((prev) =>
          prev.map((day) => (day.id === added.id ? { ...day, id: realId } : day)),
        );
        // 나머지는 액션의 revalidateCoursePaths 가 새 props 를 실어 오고,
        // 위쪽 렌더 중 비교가 목록을 서버 진실로 맞춘다. router.refresh() 는 중복이다.
      } catch {
        setDays((prev) => renumber(prev.filter((day) => day.id !== added.id)));
        showError("Something went wrong. Try again.");
      } finally {
        dayMutatingRef.current = false;
      }
    });
  }

  /** PostComments.executeDelete 와 같은 순서 — 모달을 먼저 닫고 실행한다 */
  function handleConfirmDeleteDay() {
    const dayId = pendingDeleteDayId;
    if (!dayId) return;
    setPendingDeleteDayId(null);

    const removed = days;
    setDays((prev) => renumber(prev.filter((day) => day.id !== dayId)));

    // 서버에 없는 Day 는 지우는 것도 로컬로 끝난다
    if (isLocalDay(dayId) || !courseIdRef.current) return;

    if (dayMutatingRef.current) return;
    dayMutatingRef.current = true;

    startDayTransition(async () => {
      try {
        const result = await removeCourseDay(dayId);
        if (result.error) {
          setDays(removed);
          showError(courseErrorMessage(result.error));
        }
      } catch {
        setDays(removed);
        showError("Something went wrong. Try again.");
      } finally {
        dayMutatingRef.current = false;
      }
    });
  }

  // ── 아이템 삭제·정렬 ───────────────────────────────────────────────────────

  /** 한 Day 의 아이템 목록만 갈아 끼운다 */
  function setDayItems(dayId: string, items: EditorDay["items"]) {
    setDays((prev) => prev.map((day) => (day.id === dayId ? { ...day, items } : day)));
  }

  /**
   * 아이템 삭제. 확인 모달을 띄우지 않는다 — Day 와 달리 하나씩이고 다시 담기 쉽다.
   *
   * 줄을 먼저 없애므로 "지우는 중" 표시가 따로 필요 없다. 그래서 다른 줄이 흐려질 일도 없다.
   * 실패하면 원래 목록을 되돌리고 토스트를 띄운다.
   */
  function handleRemoveItem(dayId: string, itemId: string) {
    const previous = days.find((day) => day.id === dayId)?.items;
    if (!previous) return;

    setDayItems(
      dayId,
      previous.filter((item) => item.id !== itemId),
    );

    // 초안이거나 아직 서버에 없는 아이템이면 로컬에서 끝난다
    if (isLocalItem(itemId) || !courseIdRef.current) return;

    startItemTransition(async () => {
      try {
        const result = await removeCourseItem(itemId);
        if (result.error) {
          setDayItems(dayId, previous);
          showError(courseErrorMessage(result.error));
        }
      } catch {
        setDayItems(dayId, previous);
        showError("Something went wrong. Try again.");
      }
    });
  }

  /**
   * Nearby Attractions 의 기준 좌표.
   * 그 Day 의 마지막 아이템 → 없으면 앞 Day 들을 거슬러 올라간다. 아무 데도 없으면 null 이고,
   * 그때는 시트가 탭을 비활성화하는 대신 왜 비었는지 안내한다.
   */
  function anchorForDay(dayId: string): { lat: number; lng: number; label: string } | null {
    const dayIndex = days.findIndex((day) => day.id === dayId);
    if (dayIndex < 0) return null;

    for (let i = dayIndex; i >= 0; i--) {
      const items = days[i].items;
      for (let j = items.length - 1; j >= 0; j--) {
        const item = items[j];
        if (item.latitude !== null && item.longitude !== null) {
          return { lat: item.latitude, lng: item.longitude, label: item.nameEn };
        }
      }
    }
    return null;
  }

  /**
   * 시트에서 고른 장소를 Day 맨 뒤에 담는다. 삭제와 대칭이다 — 줄을 먼저 그리고 서버로 보낸다.
   *
   *   draft — 로컬 배열에만 쌓인다. Done 에서 materializeDraft 가 한꺼번에 푼다.
   *   saved — 바로 addCourseItem. 실패하면 방금 넣은 줄만 뺀다.
   */
  function handlePickPlace(dayId: string, picked: PickedPlace) {
    const day = days.find((d) => d.id === dayId);
    if (!day) return;
    if (day.items.length >= MAX_ITEMS_PER_DAY) return;
    // 같은 Day 중복은 서버도 막는다(invalid_input). 여기서 먼저 막는 이유는 왕복을 아끼려는 게 아니라
    // 그 에러가 "Check the title and try again" 으로 번역돼 엉뚱한 안내가 나가기 때문이다.
    if (picked.placeId && day.items.some((item) => item.placeId === picked.placeId)) return;

    localItemCounter.current += 1;
    const localId = `${LOCAL_ITEM_PREFIX}${localItemCounter.current}`;
    setDayItems(dayId, [...day.items, { id: localId, ...picked }]);

    // 초안이거나 Day 가 아직 서버에 없으면 로컬에서 끝난다
    if (!courseIdRef.current || isLocalDay(dayId)) return;

    /** 방금 넣은 줄만 뺀다 — 그 사이 다른 줄이 들어왔을 수 있어 목록 전체를 되돌리지 않는다 */
    const revert = () =>
      setDays((prev) =>
        prev.map((d) =>
          d.id === dayId ? { ...d, items: d.items.filter((item) => item.id !== localId) } : d,
        ),
      );

    startItemTransition(async () => {
      try {
        const result = await addCourseItem(dayId, toAddItemInput(picked));
        if (result.error) {
          revert();
          showError(courseErrorMessage(result.error));
        }
      } catch {
        revert();
        showError("Something went wrong. Try again.");
      }
    });
  }

  /**
   * 드래그 정렬. Day 안에서만 움직인다 (Day 간 이동은 지우고 다시 담는다).
   *
   * SortableTagList 는 정렬 저장 실패를 무시하지만 여기서는 되돌린다 —
   * 사용자가 직접 짠 순서라 조용히 어긋나면 안 된다.
   */
  function handleDragEnd(dayId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previous = days.find((day) => day.id === dayId)?.items;
    if (!previous) return;

    const oldIndex = previous.findIndex((item) => item.id === active.id);
    const newIndex = previous.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(previous, oldIndex, newIndex);
    setDayItems(dayId, next);

    // 초안이거나, 아직 서버에 없는 아이템이 섞여 있으면 저장하지 않는다.
    // reorderCourseItems 는 Day 의 아이템 집합이 정확히 일치해야 받아준다(course-actions:589).
    if (!courseIdRef.current || isLocalDay(dayId) || next.some((item) => isLocalItem(item.id))) {
      return;
    }

    startItemTransition(async () => {
      try {
        const result = await reorderCourseItems(
          dayId,
          next.map((item) => item.id),
        );
        if (result.error) {
          setDayItems(dayId, previous);
          showError(courseErrorMessage(result.error));
        }
      } catch {
        setDayItems(dayId, previous);
        showError("Something went wrong. Try again.");
      }
    });
  }

  // ── 완료 ───────────────────────────────────────────────────────────────────

  /**
   * 초안을 실제 코스로 만든다. Done 을 눌렀을 때만 실행되는 유일한 커밋 지점이다.
   *
   *   createCourse       코스 + Day 1 (둘의 id 를 함께 받는다)
   *   addCourseDay × N   Day 2..n — 각각의 id 를 받아 아이템을 걸 자리로 쓴다
   *   addCourseItem × M  Day 별로 화면에 보이는 순서 그대로. sortOrder 는 서버가 맨 뒤에 붙인다
   *   updateCourse       공개로 켜 두었으면 마지막에 반영
   *
   * 중간에 실패해도 코스는 이미 존재하므로 상세 화면으로 보낸다 — 거기가 진실이다.
   * 편집기에 붙잡아 두면 로컬 Day 와 서버 Day 가 어긋난 채로 남는다.
   */
  async function materializeDraft(): Promise<void> {
    const created = await createCourse({ title: trimmedTitle });
    if (created.error || !created.id) {
      showError(courseErrorMessage(created.error));
      return;
    }

    const id = created.id;
    courseIdRef.current = id;
    // 상세 화면으로 넘어가기 전 짧은 구간이지만, 이 사이에 토글을 누르면 이미 존재하는
    // 코스다 — state 도 ref 와 같은 사실을 보게 맞춘다.
    setCourseId(id);
    savedTitleRef.current = trimmedTitle;

    // 화면의 Day 1 은 createCourse 가 만든 Day 다. 나머지만 새로 만들고 id 를 모은다.
    // 화면에 Day 가 하나도 없어도 그 Day 1 은 남는다 — 빈 Day 하나는 정상 상태다.
    const dayIds: string[] = created.dayId ? [created.dayId] : [];
    let failed = !created.dayId;

    for (let i = 1; !failed && i < days.length; i++) {
      const result = await addCourseDay(id);
      if (result.error || !result.id) {
        showError(courseErrorMessage(result.error));
        failed = true;
        break;
      }
      dayIds.push(result.id);
    }

    // Day 를 다 만든 뒤에 아이템을 넣는다. 하나라도 실패하면 거기서 멈춘다 —
    // 이어서 넣으면 순서가 어긋난 채로 절반만 남는다.
    for (let i = 0; !failed && i < dayIds.length; i++) {
      for (const item of days[i]?.items ?? []) {
        const result = await addCourseItem(dayIds[i], toAddItemInput(item));
        if (result.error) {
          showError(courseErrorMessage(result.error));
          failed = true;
          break;
        }
      }
    }

    // createCourse 는 항상 비공개로 만든다 — 공개로 켜 두었으면 여기서 반영한다.
    // 앞이 실패해도 이건 시도한다. 사용자가 명시적으로 켠 값이고 코스는 이미 있다.
    if (isPublic) {
      const result = await updateCourse(id, { isPublic: true });
      if (result.error) showError(courseErrorMessage(result.error));
    }

    router.push(`/journeys/${id}`);
  }

  function handleDone() {
    if (!canFinish) return;

    startTitleTransition(async () => {
      if (!courseIdRef.current) {
        await materializeDraft();
        return;
      }
      // 이미 있는 코스 — 제목을 입력하다 blur 없이 눌렀을 수 있어 한 번 통과시킨다
      const ok = await commitTitle();
      if (!ok) return;
      router.push(`/journeys/${courseIdRef.current}`);
    });
  }

  // ── 렌더 ───────────────────────────────────────────────────────────────────

  const placeLabel = `${itemCount} ${itemCount === 1 ? "place" : "places"}`;
  /** 이미 있는 코스의 제목을 비운 것은 잘못된 상태다. 초안의 빈 제목은 아직 안 지은 것뿐이다. */
  const titleInvalid = !canFinish && !isDraft;

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
            // 제목이 없으면 끝낼 수 없다 — 두 갈래에서 같은 규칙이다.
            // 저장이 도는 중에도 막는다. 나가는 길은 ← 가 따로 있다.
            disabled={!canFinish || isBusy}
            className="flex h-11 flex-none items-center gap-1.5 rounded-full bg-brand pl-3.5 pr-4 text-sm font-semibold text-black transition-opacity disabled:opacity-40"
          >
            {titlePending ? (
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
          aria-invalid={titleInvalid}
          aria-describedby={canFinish ? undefined : titleHintId}
          className="w-full border-b-2 bg-transparent pb-3 text-[22px] font-bold leading-[1.2] tracking-[-0.02em] outline-none placeholder:font-bold placeholder:text-muted-foreground/50"
          style={{ color: INK, borderBottomColor: titleInvalid ? DANGER : FIELD_LINE }}
        />

        {/* Done 을 막았으면 왜 막혔는지 여기서 말한다. 메타 줄과 같은 자리·같은 크기라
            문구만 갈리고 레이아웃이 밀리지 않는다.
            초안의 빈 제목은 오류가 아니라 다음에 할 일이다 — 색과 문구를 나눈다. */}
        {canFinish ? (
          <p className="mt-3.5 text-[12.5px] font-medium leading-none" style={{ color: SUB }}>
            {placeLabel}
          </p>
        ) : (
          <p
            id={titleHintId}
            role={titleInvalid ? "alert" : undefined}
            className="mt-3.5 text-[12.5px] font-medium leading-none"
            style={{ color: titleInvalid ? DANGER : SUB }}
          >
            {titleInvalid
              ? "Journey title can't be empty."
              : "Name it when you're ready — everything else works now."}
          </p>
        )}

        {/* 카드 전체가 토글이다 — 시안의 46×26 스위치만으로는 터치 타깃이 부족하다.
            shadcn Switch 는 <button> 을 렌더해 이 행 안에 중첩할 수 없어 표시만 직접 그린다. */}
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          onClick={handleToggleVisibility}
          disabled={visibilityPending}
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
              Public journeys can be found and copied by other fans.
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

      {/* ── Day · 아이템 ─────────────────────────────────────────────────── */}
      {days.length === 0 ? (
        <div className="px-[18px] pt-6">
          <div
            className="rounded-[14px] px-[18px] py-[22px] text-center"
            style={{ background: PAPER }}
          >
            <p className="text-[12.5px] font-medium leading-[1.3]" style={{ color: INK }}>
              No days yet
            </p>
            <p className="mt-1.5 text-[11px] font-medium leading-[1.45]" style={{ color: MUTED }}>
              Add a day to start planning.
            </p>
          </div>
        </div>
      ) : (
        days.map((day) => {
          const dayFull = day.items.length >= MAX_ITEMS_PER_DAY;
          // 저장된 코스인데 Day 가 아직 서버에 없는 짧은 구간 — addCourseItem 이 받을 dayId 가 없다.
          // addCourseDay 응답이 오면 진짜 id 로 바뀌면서 바로 풀린다.
          const dayUnsaved = !isDraft && isLocalDay(day.id);
          return (
          <section key={day.id} className="px-[18px] pt-6">
            <div className="flex min-h-11 items-center gap-2.5">
              <h2 className="text-[15px] font-bold leading-none" style={{ color: INK }}>
                Day {day.dayNumber}
                {day.title ? ` · ${day.title}` : ""}
              </h2>
              <span className="text-[10.5px] font-semibold leading-none" style={{ color: SUB }}>
                {day.items.length} {day.items.length === 1 ? "place" : "places"}
              </span>

              <div className="flex-1" />

              {/* 시안은 28px 필이지만 터치 타깃 44px 을 맞춰 세로만 키웠다.
                  가로 여백까지 늘리면 Day 헤더에서 삭제가 제일 눈에 띈다. */}
              <button
                type="button"
                onClick={() => setPendingDeleteDayId(day.id)}
                disabled={isDayPending}
                aria-label={`Delete Day ${day.dayNumber}`}
                className="flex h-11 flex-none items-center gap-1.5 rounded-[14px] px-2.5 transition-opacity disabled:opacity-50"
                style={{ background: DANGER_BG }}
              >
                <Trash2 className="size-3.5" style={{ color: DANGER }} />
                <span
                  className="text-[10.5px] font-semibold leading-none"
                  style={{ color: DANGER }}
                >
                  Delete day
                </span>
              </button>
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
              // Day 마다 DndContext 를 따로 둔다 — Day 간 이동은 지원하지 않는다.
              // id 를 고정하지 않으면 SSR/CSR 이 다른 값을 만들어 하이드레이션이 어긋난다.
              <DndContext
                id={`${dndId}-${day.id}`}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(day.id, event)}
              >
                <SortableContext
                  items={day.items.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="mt-1">
                    {day.items.map((item, i) => (
                      <SortableItemRow
                        key={item.id}
                        item={item}
                        index={i}
                        cover={cover}
                        onRemove={(itemId) => handleRemoveItem(day.id, itemId)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* 장소 추가. Day 마다 따로 둔다 — 어느 날에 담는지가 버튼 위치로 드러나야
                시트에서 Day 를 다시 고르게 하지 않는다. */}
            <button
              type="button"
              onClick={() => {
                setSheetDayNumber(day.dayNumber);
                setSheetDayId(day.id);
              }}
              disabled={dayFull || dayUnsaved}
              className="mt-2.5 flex h-11 w-full items-center justify-center gap-1.5 rounded-[14px] transition-opacity disabled:opacity-40"
              style={{ background: PAPER }}
            >
              <Plus className="size-[15px]" style={{ color: INK }} strokeWidth={2.6} />
              <span className="text-[12.5px] font-semibold leading-none" style={{ color: INK }}>
                Add a place
              </span>
            </button>

            {/* Day 추가 상한과 같은 방식 — 눌러 보게 하고 토스트로 알리는 대신 막고 이유를 붙인다 */}
            {dayFull && (
              <p
                className="mt-2 text-center text-[11px] font-medium leading-none"
                style={{ color: MUTED }}
              >
                A day can have up to {MAX_ITEMS_PER_DAY} places.
              </p>
            )}
          </section>
          );
        })
      )}

      {/* ── Day 추가 ─────────────────────────────────────────────────────── */}
      <div className="px-[18px] pt-6">
        <button
          type="button"
          onClick={handleAddDay}
          disabled={atMaxDays || isDayPending}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[24px] transition-opacity disabled:opacity-40"
          style={{ background: INK }}
        >
          {isDayPending ? (
            <Loader2 className="size-[15px] animate-spin text-white" />
          ) : (
            <Plus className="size-[15px]" style={{ color: "var(--brand)" }} strokeWidth={2.6} />
          )}
          <span className="text-[13.5px] font-semibold leading-none text-white">Add a day</span>
        </button>

        {/* 상한은 days.length 로 이미 알 수 있다 — 눌러 보게 하고 토스트로 알리는 대신
            막아 두고 이유를 붙인다. 서버의 invalid_input 은 다른 탭에서 늘어난 경우의 대비다. */}
        {atMaxDays && (
          <p
            className="mt-2.5 text-center text-[11px] font-medium leading-none"
            style={{ color: MUTED }}
          >
            A journey can have up to {MAX_DAYS} days.
          </p>
        )}
      </div>

      <div className="h-10" />

      <ConfirmDialog
        open={pendingDeleteDay !== null}
        title={pendingDeleteDay ? `Delete Day ${pendingDeleteDay.dayNumber}?` : ""}
        description={
          pendingDeleteDay && pendingDeleteDay.items.length > 0
            ? `${pendingDeleteDay.items.length} ${
                pendingDeleteDay.items.length === 1 ? "place" : "places"
              } in this day will be removed too. This can't be undone.`
            : "This can't be undone."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDeleteDay}
        onCancel={() => setPendingDeleteDayId(null)}
      />

      <PlaceAddSheet
        open={sheetDay !== null}
        onOpenChange={(next) => {
          if (!next) setSheetDayId(null);
        }}
        dayNumber={sheetDayNumber}
        existingPlaceIds={
          sheetDay
            ? sheetDay.items
                .map((item) => item.placeId)
                .filter((placeId): placeId is string => placeId !== null)
            : []
        }
        anchor={sheetDay ? anchorForDay(sheetDay.id) : null}
        remainingSlots={sheetDay ? MAX_ITEMS_PER_DAY - sheetDay.items.length : 0}
        onPick={(picked) => {
          if (sheetDay) handlePickPlace(sheetDay.id, picked);
        }}
      />
    </div>
  );
}
