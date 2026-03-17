import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getTagGroupsWithTags } from "@/lib/filter-queries";
import { ReCreeshotUploadFlow } from "./_components/ReCreeshotUploadFlow";

export default async function HallNewPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const [tagGroups, topics] = await Promise.all([
    getTagGroupsWithTags(),
    prisma.topic.findMany({
      where: { isActive: true },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
      select: { id: true, nameEn: true, colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true, level: true, parentId: true },
    }),
  ]);

  return (
    <ReCreeshotUploadFlow
      tagGroups={tagGroups}
      topics={topics}
      userId={currentUser.id}
    />
  );
}
