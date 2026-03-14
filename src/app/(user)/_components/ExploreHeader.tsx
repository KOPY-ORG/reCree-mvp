import Link from "next/link";
import { Search } from "lucide-react";

export function ExploreHeader() {
  return (
    <header className="app-header">
      <div className="h-12 flex items-center justify-between px-4">
        <span className="font-bold text-base tracking-tight">reCree</span>
        <Link href="/search" className="text-muted-foreground hover:text-foreground transition-colors">
          <Search className="size-5" />
        </Link>
      </div>
    </header>
  );
}
