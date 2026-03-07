import Link from "next/link";
import { Search } from "lucide-react";

export function SearchBar() {
  return (
    <Link
      href="/search"
      className="flex items-center gap-2 h-11 w-full rounded-full border border-border bg-muted/30 px-4 mb-4 hover:border-brand transition-colors"
    >
      <Search className="size-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground">
        Search K-artists, dramas, foods
      </span>
    </Link>
  );
}
