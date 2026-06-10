import { prisma } from "@/lib/prisma";
import { HallGrid } from "./_components/HallGrid";

export default async function ReCreeshotPage() {
  const shots = await prisma.reCreeshot.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      imageUrl: true,
      matchScore: true,
      showBadge: true,
      referencePhotoUrl: true,
      templateId: true,
    },
  });

  const hallShots = shots.map((shot) => ({
    ...shot,
    labels: [],
  }));

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto">
      <HallGrid shots={hallShots} />
    </div>
  );
}
