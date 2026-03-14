import Link from "next/link";
import { Search } from "lucide-react";

export function ExploreHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="h-12 flex items-center justify-between px-4">
        <span className="font-bold text-base tracking-tight">reCree</span>
        <Link href="/search" className="text-muted-foreground hover:text-foreground transition-colors">
          <Search className="size-5" />
        </Link>
      </div>
    </header>
  );
}
