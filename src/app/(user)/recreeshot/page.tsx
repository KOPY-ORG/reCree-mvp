import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PUBLIC_RECREESHOT_WHERE } from "@/lib/visibility";
import { HallGrid } from "./_components/HallGrid";
import { NewReCreeshotFab } from "./_components/NewReCreeshotFab";
import { PageContainer } from "../_components/PageContainer";

export default async function ReCreeshotPage() {
  const shots = await prisma.reCreeshot.findMany({
    where: PUBLIC_RECREESHOT_WHERE,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      imageUrl: true,
      referencePhotoUrl: true,
      templateId: true,
    },
  });

  const hallShots = shots.map((shot) => ({
    ...shot,
    labels: [],
  }));

  return (
    <>
      <PageContainer variant="wide" className="px-4 py-4 max-w-2xl mx-auto">
        {/* lg: 모바일 제목 바(AppHeader)의 토픽 링크를 본문 맨 위로 옮긴다 */}
        <div className="hidden lg:flex justify-end pt-4 pb-4">
          <Link
            href="/topics"
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LayoutGrid className="size-4" />
            Topics
          </Link>
        </div>
        <HallGrid shots={hallShots} />
      </PageContainer>
      <NewReCreeshotFab />
    </>
  );
}
