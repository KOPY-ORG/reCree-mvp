import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileView } from "./_components/ProfileView";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const recreeshots = await prisma.reCreeshot.findMany({
    where: { userId: user.id },
    select: { id: true, imageUrl: true, referencePhotoUrl: true, matchScore: true, showBadge: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProfileView
      email={user.email}
      nickname={user.nickname}
      bio={user.bio}
      profileImageUrl={user.profileImageUrl}
      recreeshots={recreeshots}
    />
  );
}
