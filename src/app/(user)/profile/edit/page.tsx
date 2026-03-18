import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ProfileEditForm } from "../_components/ProfileEditForm";

export default async function ProfileEditPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="max-w-md mx-auto">
      <div className="px-2 pt-2 flex items-center gap-1">
        <Link
          href="/profile"
          className="flex items-center justify-center size-8"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-base font-bold">Edit Profile</h1>
      </div>
      <ProfileEditForm
        userId={user.id}
        email={user.email}
        nickname={user.nickname}
        bio={user.bio}
        profileImageUrl={user.profileImageUrl}
      />
    </div>
  );
}
