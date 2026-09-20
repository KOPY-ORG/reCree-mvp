"use client";

// ─── 테마 선택 시트 ───────────────────────────────────────────────────────────
// 코스의 Topic 을 고르는 자리. admin 의 TopicSelectDialog 를 쓰지 않는다 —
// 그쪽은 Dialog 에 L0~L3 전부를 트리로 펼치는 편집자 도구이고,
// 여기는 바텀시트에 L2 만 평평하게 세우는 사용자 화면이다.
//
// 껍데기(핸들 · 제목 줄 · max-w-[540px])는 PlaceAddSheet 과 같은 모양을 쓴다.
// 여정 편집기에서 위로 올라오는 시트가 둘인데 서로 다르게 생길 이유가 없다.

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LabelBadge } from "@/components/LabelBadge";
import { labelBackground, resolveTopicColors } from "@/lib/post-labels";
import { getCourseTopicOptions, type CourseTopicOption } from "../../_actions/course-actions";
import { CHIP_BG, INK, MUTED, SUB } from "../_constants";

/** course-actions 의 MAX_TOPICS 와 같은 값. 넘기면 서버가 invalid_input 을 돌려준다 */
const MAX_TOPICS = 3;

interface TopicPickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 지금 골라져 있는 것 — 시트를 열 때의 값이고, 고르는 동안은 시트가 들고 있는다 */
  selected: CourseTopicOption[];
  /** Done 을 눌렀을 때만 올라간다. 시트를 닫으면 고른 것은 버려진다 */
  onConfirm: (topics: CourseTopicOption[]) => void;
}

function optionLabel(topic: CourseTopicOption) {
  const colors = resolveTopicColors(topic);
  return { colors, background: labelBackground({ text: topic.nameEn, ...colors }) };
}

export function TopicPickSheet({ open, onOpenChange, selected, onConfirm }: TopicPickSheetProps) {
  const [options, setOptions] = useState<CourseTopicOption[] | null>(null);
  const [query, setQuery] = useState("");

  /**
   * 고르는 동안의 값. null 은 "아직 아무것도 건드리지 않았다"라서 바깥 값이 그대로 보인다.
   *
   * 열릴 때 바깥 값을 복사해 넣지 않는 이유는 그 복사가 effect 가 되기 때문이다 —
   * 닫을 때 null 로 되돌리면 같은 일을 이벤트 핸들러에서 할 수 있고,
   * 취소한 편집이 다음에 열 때 남지 않는 것도 그쪽이 확실하다.
   */
  const [draft, setDraft] = useState<CourseTopicOption[] | null>(null);
  const picked = draft ?? selected;

  // 목록은 한 번만 받는다. L2 35개라 페이지를 나눌 것이 없고, 열 때마다 다시 받을 이유도 없다
  useEffect(() => {
    if (!open || options !== null) return;
    let alive = true;
    getCourseTopicOptions().then((rows) => {
      if (alive) setOptions(rows);
    });
    return () => {
      alive = false;
    };
  }, [open, options]);

  const filtered = useMemo(() => {
    if (options === null) return null;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (t) =>
        t.nameEn.toLowerCase().includes(q) ||
        (t.parentNameEn?.toLowerCase().includes(q) ?? false)
    );
  }, [options, query]);

  const pickedIds = new Set(picked.map((t) => t.id));
  const atMax = picked.length >= MAX_TOPICS;

  /**
   * 갱신 함수 안에서 현재 값을 다시 읽는다. 바깥의 picked 를 그대로 쓰면 한 틱에 들어온
   * 두 번의 누름이 같은 값을 보고 뒤엣것이 앞엣것을 덮어쓴다 (빠르게 두 개를 누르면 하나만 남는다).
   */
  function toggle(topic: CourseTopicOption) {
    setDraft((prev) => {
      const current = prev ?? selected;
      if (current.some((t) => t.id === topic.id)) {
        return current.filter((t) => t.id !== topic.id);
      }
      // 상한에 닿으면 누르는 것이 아무 일도 하지 않는다. 가장 오래된 것을 밀어내지 않는다 —
      // 세 개를 고른 사람이 네 번째를 눌렀을 때 첫 번째가 조용히 사라지면 알아채지 못한다
      if (current.length >= MAX_TOPICS) return current;
      return [...current, topic];
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setQuery("");
          setDraft(null);
        }
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        aria-describedby={undefined}
        className="mx-auto flex max-h-[88vh] max-w-[540px] flex-col gap-0 rounded-t-2xl p-0"
      >
        <div className="flex flex-none justify-center pb-1 pt-3">
          <div className="h-1 w-9 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="flex flex-none items-center gap-2 px-3 pb-1">
          <SheetTitle className="min-w-0 flex-1 pl-2 text-[15px] font-bold" style={{ color: INK }}>
            Journey theme
          </SheetTitle>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="flex size-11 flex-none items-center justify-center rounded-full transition-colors active:bg-muted"
          >
            <X className="size-4" style={{ color: INK }} strokeWidth={2.4} />
          </button>
        </div>

        <p className="flex-none px-5 pb-3 text-[11.5px] font-medium leading-[1.45]" style={{ color: SUB }}>
          Pick up to {MAX_TOPICS}. The theme colors the cover and pulls matching spots into place
          search.
        </p>

        <div className="flex-none px-4 pb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists and shows"
            aria-label="Search themes"
            className="h-11 w-full rounded-full px-4 text-[13px] font-medium outline-none placeholder:font-medium"
            style={{ background: CHIP_BG, color: INK }}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {filtered === null ? (
            <p className="py-10 text-center text-[12.5px] font-medium" style={{ color: MUTED }}>
              Loading…
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-[12.5px] font-medium" style={{ color: MUTED }}>
              {options?.length === 0 ? "No themes available yet." : "No themes match that."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 pb-2" style={{ "--pill-fs": "0.8125rem" } as React.CSSProperties}>
              {filtered.map((topic) => {
                const { colors, background } = optionLabel(topic);
                const on = pickedIds.has(topic.id);
                return (
                  <LabelBadge
                    key={topic.id}
                    as="button"
                    text={topic.nameEn}
                    background={on ? background : CHIP_BG}
                    color={on ? colors.textColorHex : SUB}
                    onClick={() => toggle(topic)}
                    className="h-10 px-4"
                    // 아직 안 고른 것이 상한 때문에 눌리지 않는 상태를 흐리게 알린다
                    style={!on && atMax ? { opacity: 0.45 } : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-none items-center gap-3 border-t px-4 py-3">
          <span className="min-w-0 flex-1 text-[11.5px] font-medium" style={{ color: SUB }}>
            {picked.length} of {MAX_TOPICS} selected
          </span>
          <button
            type="button"
            onClick={() => {
              onConfirm(picked);
              onOpenChange(false);
            }}
            className="h-11 flex-none rounded-full bg-brand px-6 text-[13px] font-semibold text-black transition-opacity active:opacity-70"
          >
            Done
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
