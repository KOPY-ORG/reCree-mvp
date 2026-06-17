import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function SavedHeader() {
  return (
    <header className="app-header">
      <div className="h-12 flex items-center gap-1 px-2">
        <Link
          href="/profile"
          className="flex items-center justify-center h-8 w-8 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="font-bold text-base tracking-tight">Saved</span>
      </div>
    </header>
  );
}
