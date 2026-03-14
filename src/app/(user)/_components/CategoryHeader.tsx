import Link from "next/link";
import { Bookmark } from "lucide-react";
import { SearchBar } from "./SearchBar";

export function CategoryHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="h-12 flex items-center gap-3 px-4">
        <SearchBar className="flex-1" />
        <Link
          href="/saved"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bookmark className="size-5" />
        </Link>
      </div>
    </header>
  );
}
