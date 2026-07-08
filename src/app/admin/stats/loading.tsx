import { Skeleton } from "@/components/ui/skeleton";

export default function AdminStatsLoading() {
  return (
    <div className="p-6 space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-1 min-w-0 bg-white rounded-xl border border-zinc-100 px-4 py-3 space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
