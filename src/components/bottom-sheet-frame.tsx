// 아래에서 올라오는 시트의 공통 껍데기 — AttractionDetailSheet · PlaceAddSheet · TopicPickSheet

/**
 * SheetContent 클래스. 시트는 fixed 라 레이아웃 기둥(--app-col-w) 밖으로 나간다 — 그 폭을 여기서 다시 건다.
 * (user)/layout.tsx 의 기둥과 같은 값·같은 방식이다.
 * inset-x-0 위에 max-w 와 mx-auto 를 얹으면 좌우 auto 가 남는 자리를 반씩 먹어 가운데로 간다
 */
export const BOTTOM_SHEET_CONTENT = "mx-auto flex max-h-[88vh] max-w-[var(--app-col-w)] flex-col gap-0 rounded-t-2xl p-0";

/** 시트 맨 위 손잡이. lg 는 끌어 올리는 몸짓이 없어 막대만 숨기고 위 여백은 남긴다 */
export function SheetHandle() {
  return (
    <div className="flex flex-none justify-center pb-1 pt-3">
      <div className="h-1 w-9 rounded-full bg-muted-foreground/25 lg:hidden" />
    </div>
  );
}
