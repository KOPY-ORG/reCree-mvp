import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { MobileTitleBar } from "./MobileTitleBar";

export function AppHeader() {
  return (
    <MobileTitleBar
      title="reCree"
      action={
        <div className="flex items-center gap-1">
          <Link
            href="/topics"
            aria-label="Topics"
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center size-8"
          >
            <LayoutGrid className="size-5" aria-hidden="true" />
          </Link>
        </div>
      }
    />
  );
}
