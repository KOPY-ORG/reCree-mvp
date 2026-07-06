import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function SavedHeader() {
  return (
    <header className="app-header">
      <div className="h-12 flex items-center gap-1 px-4">
        <span className="font-bold text-base tracking-tight">Saved</span>
      </div>
    </header>
  );
}
