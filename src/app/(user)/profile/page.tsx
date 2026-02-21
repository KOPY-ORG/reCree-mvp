import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const initial = (user.nickname ?? user.email)[0].toUpperCase();

  return (
    <div className="px-4 py-8 flex flex-col items-center gap-6">
      {/* 아바타 */}
      <div className="size-20 rounded-full bg-brand flex items-center justify-center text-brand-foreground text-2xl font-bold shrink-0">
        {user.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.profileImageUrl}
            alt="프로필"
            className="size-20 rounded-full object-cover"
          />
        ) : (
          initial
        )}
      </div>

      {/* 사용자 정보 */}
      <div className="text-center space-y-1">
        {user.nickname && (
          <p className="font-semibold text-base">{user.nickname}</p>
        )}
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {user.role}
        </span>
      </div>

      {/* 로그아웃 */}
      <form action={signOut}>
        <button
          type="submit"
          className="px-6 py-2 rounded-lg border text-sm font-medium hover:bg-muted transition-colors"
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}
