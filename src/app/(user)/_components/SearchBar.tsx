import Link from "next/link";
import { Search } from "lucide-react";

export function SearchBar({ className }: { className?: string }) {
  return (
    <Link
      href="/search"
      className={`flex items-center gap-2 h-8 w-full rounded-full border border-border bg-muted/30 px-3 hover:border-brand transition-colors ${className ?? ""}`}
    >
      <Search className="size-3.5 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground truncate">
        Search K-artists, dramas, foods
      </span>
    </Link>
  );
}
