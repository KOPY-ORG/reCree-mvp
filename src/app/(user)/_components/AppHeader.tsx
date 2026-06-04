import Link from "next/link";
import { LayoutGrid } from "lucide-react";
// import { LanguageSelector } from "./LanguageSelector";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="h-12 flex items-center justify-between px-4">
        <span className="font-bold text-base tracking-tight">reCree</span>

        <div className="flex items-center gap-1">
          <Link
            href="/topics"
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center size-8"
          >
            <LayoutGrid className="size-5" />
          </Link>
          {/* <LanguageSelector /> */}
        </div>
      </div>
    </header>
  );
}
