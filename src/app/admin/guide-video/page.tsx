import { prisma } from "@/lib/prisma";
import { GuideVideoClient } from "./_components/GuideVideoClient";

export default async function GuideVideoPage() {
  const videos = await prisma.guideVideo.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-bold text-brand-foreground mb-6">가이드 영상 관리</h1>
      <GuideVideoClient videos={videos} />
    </div>
  );
}
