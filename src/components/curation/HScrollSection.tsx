import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function HScrollSection({
  title,
  moreHref,
  children,
}: {
  title: string;
  moreHref?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3 px-4">
        <h2 className="font-bold text-lg">{title}</h2>
        {moreHref && (
          <Link
            href={moreHref}
            className="text-sm text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
          >
            More <ChevronRight className="size-3.5" />
          </Link>
        )}
      </div>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 pl-4 pb-1">
          {children}
          <div className="shrink-0 w-1" />
        </div>
      </div>
    </section>
  );
}
