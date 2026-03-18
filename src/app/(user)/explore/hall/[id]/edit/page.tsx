import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { EditForm } from "./_components/EditForm";

export default async function HallEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/explore/hall/" + id);

  const shot = await prisma.reCreeshot.findUnique({
    where: { id },
    select: { userId: true, story: true, tips: true, status: true },
  });

  if (!shot || shot.status === "DELETED") notFound();
  if (shot.userId !== currentUser.id) redirect("/explore/hall/" + id);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="app-header">
        <div className="relative h-12 flex items-center px-2">
          <Link replace href={`/explore/hall/${id}`} className="flex items-center justify-center size-8">
            <ChevronLeft className="size-5" />
          </Link>
          <span className="absolute left-1/2 -translate-x-1/2 font-bold text-base tracking-tight">
            Edit
          </span>
        </div>
      </header>

      <EditForm
        id={id}
        initialStory={shot.story ?? ""}
        initialTips={shot.tips ?? ""}
      />
    </div>
  );
}
