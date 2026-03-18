import Link from "next/link";
import { User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";

export async function SavedHeader() {
  const user = await getCurrentUser();
  const initial = user?.email?.[0]?.toUpperCase() ?? null;

  return (
    <header className="app-header">
      <div className="h-12 flex items-center justify-between px-4">
        <span className="font-bold text-base tracking-tight">Saved</span>
        <Link href={user ? "/profile" : "/login"} className="text-foreground hover:text-muted-foreground transition-colors">
          {user ? (
            <div className="size-7 rounded-full bg-brand flex items-center justify-center text-xs font-semibold text-black overflow-hidden">
              {user.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.profileImageUrl} alt="Profile" className="size-7 object-cover" />
              ) : (
                initial
              )}
            </div>
          ) : (
            <User className="size-5 text-muted-foreground" />
          )}
        </Link>
      </div>
    </header>
  );
}
