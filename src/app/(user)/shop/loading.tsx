import { CARD_GRID, CARD_GRID_GUTTER } from "@/app/(user)/_components/card-grid";

export default function ShopLoading() {
  return (
    <div className={`${CARD_GRID} ${CARD_GRID_GUTTER} pt-4`}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="aspect-[4/3] rounded-lg bg-muted animate-pulse" />
          <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}
