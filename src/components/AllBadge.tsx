import Link from "next/link";
import { cn } from "@/lib/utils";

export function AllBadge({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "pill-badge border border-dashed border-border text-muted-foreground hover:border-foreground hover:text-foreground transition-colors",
        className
      )}
    >
      All
    </Link>
  );
}
