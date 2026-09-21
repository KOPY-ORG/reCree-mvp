"use client";

// ─── Your topics ──────────────────────────────────────────────────────────────
// 팔로우한 토픽이 위, 아직 팔로우하지 않은 것이 상위 분류별로 아래.
//
// 이 화면이 하는 일은 "팔로우"다. 그것이 글자로 드러나야 해서 섹션 제목을 Following,
// 버튼을 Follow / Following 으로 둔다. 프로토타입의 Pinned·+−는 무엇을 하는 화면인지
// 말해 주지 않는다 — 팔로우가 홈 탭이 된다는 것을 빈 상태 문구가 한 번 더 말한다.
//
// 목록은 서버가 준 것을 그대로 쓴다. 검색은 새 조회가 아니라 받은 목록을 거르는 것이다.

import { useId, useMemo, useState, useTransition } from "react";
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
import {
  Check,
  ChevronDown,
  GripVertical,
  Plus,
  Search,
  X,
} from "lucide-react";
import { showError } from "@/lib/toast";
import {
  followTopic,
  reorderFollows,
  unfollowTopic,
} from "@/app/(user)/_actions/follow-actions";

export type TopicItem = {
  id: string;
  nameEn: string;
  /** DB 색에서 나온 CSS background 문자열. 색을 코드가 정하지 않는다 */
  background: string;
  /** 상위 분류 이름. 팔로우 줄의 아랫줄이 된다 */
  groupLabel: string;
};

export type TopicGroup = { id: string; label: string; topics: TopicItem[] };

export function TopicsBrowser({
  groups,
  initialFollowedIds,
  hiddenFollowIds,
  isLoggedIn,
}: {
  /** 화면에 그릴 토픽 전부. 묶음은 서버가 정한다 (오늘과 같은 K-POP · K-CONTENT L1) */
  groups: TopicGroup[];
  /** 그중 팔로우한 것, sortOrder 순 */
  initialFollowedIds: string[];
  /**
   * 이 화면 밖에서 팔로우된 토픽 id.
   *
   * **지우지 마라.** reorderFollows 는 구독 **전량**을 요구하고 개수가 하나라도 안 맞으면
   * 통째로 거절한다 (follow-actions.ts:146). /topics 는 K-POP·K-CONTENT 만 그리는데
   * Creator L0 처럼 그 밖의 L2 도 상세 페이지(TopicHero.tsx:28)에서 팔로우된다 —
   * 그런 구독이 하나라도 있으면 보이는 것만 보냈을 때 드래그가 조용히 실패한다.
   * 그래서 화면에 없는 id 도 들고 있다가 재정렬 때 뒤에 붙여 보낸다.
   */
  hiddenFollowIds: string[];
  isLoggedIn: boolean;
}) {
  const [followedIds, setFollowedIds] = useState(initialFollowedIds);
  const [query, setQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());
  const [, startTransition] = useTransition();

  /**
   * DndContext 에 고정 id 를 준다. 안 주면 dnd-kit 이 전역 카운터로 aria-describedby 를
   * 만들어 서버가 DndDescribedBy-0, 클라이언트가 -1 을 뱉고 하이드레이션이 깨진다
   * (CourseEditor.tsx:338, :1177 이 같은 이유로 useId 를 쓴다).
   */
  const dndId = useId();

  /**
   * 터치와 마우스를 모두 등록한다. 모바일에서 드래그와 세로 스크롤은 같은 제스처라
   * PointerSensor 만으로는 부딪힌다 (CourseEditor.tsx:358-364 와 같은 값).
   * 실제 충돌을 막는 것은 센서가 아니라 핸들에만 listeners 를 붙이는 쪽이다.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 0, tolerance: 5 },
    }),
  );

  const byId = useMemo(
    () => new Map(groups.flatMap((g) => g.topics).map((t) => [t.id, t])),
    [groups],
  );

  const needle = query.trim().toLowerCase();
  const isSearching = needle !== "";

  const followedSet = useMemo(() => new Set(followedIds), [followedIds]);
  const following = followedIds
    .map((id) => byId.get(id))
    .filter((t): t is TopicItem => t !== undefined);

  const visibleFollowing = isSearching
    ? following.filter((t) => t.nameEn.toLowerCase().includes(needle))
    : following;

  const visibleGroups = groups
    .map((g) => ({
      ...g,
      topics: g.topics.filter(
        (t) =>
          !followedSet.has(t.id) &&
          (!isSearching || t.nameEn.toLowerCase().includes(needle)),
      ),
    }))
    .filter((g) => g.topics.length > 0);

  /**
   * 검색 중에는 순서를 못 바꾼다. 걸러진 목록에서 끌면 화면에 없는 줄을 건너뛴 순서가
   * 만들어지고, 그게 그대로 sortOrder 0..n-1 로 굳는다. 핸들을 아예 그리지 않아
   * "왜 안 되지"가 생기지 않게 한다.
   */
  const canReorder = !isSearching && following.length > 1;

  function withPending(id: string, on: boolean) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleFollow(item: TopicItem) {
    if (!isLoggedIn) {
      showError(`Sign in to follow ${item.nameEn}`);
      return;
    }
    const previous = followedIds;
    // 액션이 맨 뒤 sortOrder 를 준다 (follow-actions.ts:51-56) — 화면도 맨 뒤에 붙인다
    setFollowedIds([...previous, item.id]);
    withPending(item.id, true);

    startTransition(async () => {
      const result = await followTopic(item.id);
      withPending(item.id, false);
      if (result.error) {
        setFollowedIds(previous);
        showError(
          result.error === "unauthenticated"
            ? "Session expired. Sign in again."
            : "Couldn't follow. Try again.",
        );
      }
    });
  }

  function handleUnfollow(item: TopicItem) {
    const previous = followedIds;
    setFollowedIds(previous.filter((id) => id !== item.id));
    withPending(item.id, true);

    startTransition(async () => {
      const result = await unfollowTopic(item.id);
      withPending(item.id, false);
      if (result.error) {
        setFollowedIds(previous);
        showError(
          result.error === "unauthenticated"
            ? "Session expired. Sign in again."
            : "Couldn't unfollow. Try again.",
        );
      }
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previous = followedIds;
    const oldIndex = previous.indexOf(String(active.id));
    const newIndex = previous.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(previous, oldIndex, newIndex);
    setFollowedIds(next);

    startTransition(async () => {
      // 화면 밖 구독을 뒤에 붙여 전량을 보낸다 — hiddenFollowIds 주석 참고
      const result = await reorderFollows([...next, ...hiddenFollowIds]);
      if (result.error) {
        // 되돌리지 않으면 화면만 바뀐 채 남아 다음에 열 때 순서가 달라진다
        setFollowedIds(previous);
        showError("Couldn't save the new order. Try again.");
      }
    });
  }

  function toggleGroup(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const nothingFound =
    isSearching && visibleFollowing.length === 0 && visibleGroups.length === 0;

  return (
    <div className="px-4 pt-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artists, dramas, shows"
          aria-label="Search topics"
          className="h-10 w-full rounded-full bg-muted pl-9 pr-10 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand"
        />
        {isSearching && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-secondary"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {nothingFound ? (
        /* 전부 0건이면 문구 하나만 남긴다. 섹션마다 "없음"을 늘어놓으면 빈 화면이 더 시끄럽다 */
        <p className="py-14 text-center text-sm text-muted-foreground">
          No topics match “{query}”.
        </p>
      ) : (
        <>
          <section className="mt-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-bold">
                Following
                {/* 검색 중에는 숨긴다 — 걸러진 한 줄 옆에 전체 개수가 서 있으면 어느 쪽 수인지 모른다 */}
                {!isSearching && following.length > 0 && (
                  <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                    {following.length}
                  </span>
                )}
              </h2>
              {canReorder && (
                <p className="text-[11px] font-medium text-muted-foreground">
                  Drag to reorder
                </p>
              )}
            </div>

            {following.length === 0 ? (
              <div className="mt-2 rounded-2xl bg-muted px-4 py-5 text-center">
                <p className="text-sm font-semibold">
                  You&apos;re not following anything yet
                </p>
                <p className="mt-1 text-xs leading-[1.5] text-muted-foreground">
                  {isLoggedIn
                    ? "Follow a topic below and it becomes a tab on your home screen."
                    : "Sign in to follow topics and get them as tabs on your home screen."}
                </p>
              </div>
            ) : visibleFollowing.length === 0 ? (
              <p className="py-5 text-center text-xs text-muted-foreground">
                Nothing you follow matches “{query}”.
              </p>
            ) : (
              <DndContext
                id={dndId}
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={visibleFollowing.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="mt-1">
                    {visibleFollowing.map((item) => (
                      <FollowingRow
                        key={item.id}
                        item={item}
                        canReorder={canReorder}
                        isPending={pendingIds.has(item.id)}
                        onUnfollow={handleUnfollow}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </section>

          {visibleGroups.map((group) => (
            <GroupSection
              key={group.id}
              group={group}
              // 검색 중에는 접힘을 무시한다. 접힌 분류 안에 결과가 숨으면 검색이 거짓말이 된다.
              // 상태를 건드리지 않아 검색을 지우면 접어 둔 그대로 돌아온다
              isCollapsed={!isSearching && collapsedIds.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              pendingIds={pendingIds}
              onFollow={handleFollow}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ─── 줄 ───────────────────────────────────────────────────────────────────────

/**
 * 색 한 조각. 글자를 얹지 않는다 — 바로 옆이 토픽 이름이라 약칭이 같은 것을 두 번 말하고,
 * 색이 그 토픽의 고유 속성이라는 것이 글자 없이 더 분명하게 읽힌다.
 *
 * 색은 전부 DB 에서 온 문자열이다. 여기서 정하는 것은 크기와 모양뿐이다.
 */
function TopicAvatar({ item }: { item: TopicItem }) {
  return (
    <span
      aria-hidden
      className="size-10 flex-none rounded-xl"
      style={{ background: item.background }}
    />
  );
}

/**
 * 팔로우한 토픽 한 줄. 드래그는 오른쪽 끝 핸들에서만 시작한다.
 *
 * 줄 전체를 드래그 영역으로 만들면 모바일에서 목록을 스크롤하려다 줄이 끌려온다.
 * 핸들에만 listeners 를 붙이고 나머지는 손대지 않으면 충돌이 생길 자리가 없다
 * (CourseEditor.tsx:188-193 과 같은 판단).
 */
function FollowingRow({
  item,
  canReorder,
  isPending,
  onUnfollow,
}: {
  item: TopicItem;
  canReorder: boolean;
  isPending: boolean;
  onUnfollow: (item: TopicItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: !canReorder,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
      className={`relative flex items-center gap-3 py-2 ${isDragging ? "opacity-80" : ""}`}
    >
      <TopicAvatar item={item} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-[1.3]">
          {item.nameEn}
        </p>
        <p className="mt-0.5 truncate text-[11.5px] font-medium leading-[1.2] text-muted-foreground">
          {item.groupLabel}
        </p>
      </div>

      {/* 팔로우 중인 것이 채워진 라임이다 — 한 줄씩 읽지 않아도 어느 것이 내 것인지 색으로 보인다.
          누르면 풀린다 */}
      <button
        type="button"
        onClick={() => onUnfollow(item)}
        disabled={isPending}
        aria-label={`Unfollow ${item.nameEn}`}
        className="flex h-8 flex-none items-center gap-1 rounded-full bg-brand px-3 text-xs font-bold text-black transition-opacity active:opacity-70 disabled:opacity-50"
      >
        <Check className="size-3.5" strokeWidth={2.6} />
        Following
      </button>

      {/* 핸들 — 44×44, touch-action: none. 여기 밖은 그냥 스크롤이다 */}
      {canReorder && (
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label={`Reorder ${item.nameEn}`}
          className="-mr-2 flex size-11 flex-none touch-none cursor-grab items-center justify-center rounded-full text-muted-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      )}
    </li>
  );
}

/** 아직 팔로우하지 않은 토픽 한 줄 */
function TopicRow({
  item,
  isPending,
  onFollow,
}: {
  item: TopicItem;
  isPending: boolean;
  onFollow: (item: TopicItem) => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <TopicAvatar item={item} />
      <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-[1.3]">
        {item.nameEn}
      </p>
      {/* 아직 팔로우하지 않은 것은 테두리만 — 채워진 라임과 나란히 두면 둘의 상태가 대비로 읽힌다 */}
      <button
        type="button"
        onClick={() => onFollow(item)}
        disabled={isPending}
        aria-label={`Follow ${item.nameEn}`}
        className="flex h-8 flex-none items-center gap-1 rounded-full border border-border px-3 text-xs font-semibold transition-colors active:bg-muted disabled:opacity-50"
      >
        <Plus className="size-3.5" strokeWidth={2.8} />
        Follow
      </button>
    </li>
  );
}

/** 상위 분류 한 덩어리. 접힘은 클라이언트 상태다 — URL 에 넣지 않는다 */
function GroupSection({
  group,
  isCollapsed,
  onToggle,
  pendingIds,
  onFollow,
}: {
  group: TopicGroup;
  isCollapsed: boolean;
  onToggle: () => void;
  pendingIds: ReadonlySet<string>;
  onFollow: (item: TopicItem) => void;
}) {
  return (
    <section className="mt-5 border-t border-secondary pt-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        className="flex w-full items-center justify-between py-1 text-left"
      >
        <span className="text-sm font-bold">{group.label}</span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="text-xs font-medium">{group.topics.length}</span>
          <ChevronDown
            className={`size-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
          />
        </span>
      </button>

      {!isCollapsed && (
        <ul className="mt-1">
          {group.topics.map((item) => (
            <TopicRow
              key={item.id}
              item={item}
              isPending={pendingIds.has(item.id)}
              onFollow={onFollow}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
