import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ReCreeshotUploadFlow } from "./_components/ReCreeshotUploadFlow";

export default async function HallNewPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const [tags, topics] = await Promise.all([
    prisma.tag.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, group: true, colorHex: true, textColorHex: true },
    }),
    prisma.topic.findMany({
      where: { isActive: true, level: { gte: 1 } },
      orderBy: [{ level: "asc" }, { sortOrder: "asc" }],
      select: { id: true, nameEn: true, colorHex: true, textColorHex: true },
    }),
  ]);

  return (
    <ReCreeshotUploadFlow
      tags={tags}
      topics={topics}
      userId={currentUser.id}
    />
  );
}
