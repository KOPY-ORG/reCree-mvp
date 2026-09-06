import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyCourses } from "@/lib/course-queries";
import { ProfileView } from "./_components/ProfileView";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // course-actions 의 revalidateCoursePaths 가 "/profile" 을 무효화하므로
  // 코스를 만들거나 고치면 이 목록도 함께 갱신된다.
  const [recreeshots, courses] = await Promise.all([
    prisma.reCreeshot.findMany({
      where: { userId: user.id, status: { not: "DELETED" } },
      select: { id: true, imageUrl: true, referencePhotoUrl: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    getMyCourses(user.id),
  ]);

  return (
    <ProfileView
      email={user.email}
      nickname={user.nickname}
      bio={user.bio}
      profileImageUrl={user.profileImageUrl}
      recreeshots={recreeshots}
      courses={courses}
    />
  );
}
