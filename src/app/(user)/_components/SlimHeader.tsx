import Link from "next/link";
import { User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export async function SlimHeader() {
  const user = await getCurrentUser();
  const initial = user?.email?.[0]?.toUpperCase() ?? null;

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      <div className="h-10 flex items-center justify-between px-4">
        <span className="font-bold text-base tracking-tight">reCree</span>

        <Link
          href={user ? "/profile" : "/login"}
          className="text-foreground hover:text-muted-foreground transition-colors"
        >
          {initial ? (
            <div className="size-6 rounded-full bg-brand flex items-center justify-center text-xs font-semibold text-black">
              {initial}
            </div>
          ) : (
            <User className="size-4 text-muted-foreground" />
          )}
        </Link>
      </div>
    </header>
  );
}
