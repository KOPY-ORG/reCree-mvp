import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { HallDetailClient } from "./_components/HallDetailClient";
import { ReCreeshotImage } from "@/components/recreeshot-image";

export default async function HallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const shot = await prisma.reCreeshot.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nickname: true, profileImageUrl: true } },
      reCreeshotTopics: {
        include: { topic: { select: { id: true, nameEn: true, colorHex: true, textColorHex: true } } },
      },
      reCreeshotTags: {
        include: { tag: { select: { id: true, name: true, colorHex: true, textColorHex: true } } },
      },
    },
  });

  if (!shot || shot.status === "DELETED") notFound();

  const liked = currentUser
    ? !!(await prisma.reCreeshotLike.findUnique({
        where: { userId_reCreeshotId: { userId: currentUser.id, reCreeshotId: id } },
      }))
    : false;

  const saved = currentUser
    ? !!(await prisma.save.findUnique({
        where: {
          userId_targetType_targetId: {
            userId: currentUser.id,
            targetType: "RECREESHOT",
            targetId: id,
          },
        },
      }))
    : false;

  return (
    <div className="max-w-2xl mx-auto pb-20">

      {/* 메인 이미지 + 오버레이 헤더 */}
      <div className="relative aspect-[3/4]">
        <ReCreeshotImage
          shotUrl={shot.imageUrl}
          referenceUrl={shot.referencePhotoUrl}
          matchScore={shot.matchScore}
          showBadge={shot.showBadge}
          rounded={false}
          className="w-full h-full"
          sizes="(max-width: 672px) 100vw, 672px"
          priority
        />

        {/* 뒤로가기 버튼 오버레이 (좌상단) */}
        <div className="absolute top-0 left-0 right-0 flex items-center px-2 pt-3 pb-8 bg-gradient-to-b from-black/40 to-transparent z-10">
          <Link href="/explore?tab=hall" className="p-2 rounded-full">
            <ChevronLeft className="size-5 text-white" />
          </Link>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="px-4 py-4 space-y-4">
        {/* 사용자 정보 + 액션 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-full bg-muted overflow-hidden flex items-center justify-center">
              {shot.user.profileImageUrl ? (
                <Image
                  src={shot.user.profileImageUrl}
                  alt={shot.user.nickname ?? "user"}
                  width={36}
                  height={36}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-sm font-bold text-muted-foreground">
                  {(shot.user.nickname ?? "A")[0].toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold">
              {shot.user.nickname ?? "Anonymous"}
            </span>
          </div>
          <HallDetailClient
            reCreeshotId={id}
            initialLiked={liked}
            initialSaved={saved}
            likeCount={shot.likeCount}
          />
        </div>

        {/* 장소명 */}
        {shot.locationName && (
          <p className="text-sm text-muted-foreground">{shot.locationName}</p>
        )}

        {/* 토픽/태그 배지 */}
        {(shot.reCreeshotTopics.length > 0 || shot.reCreeshotTags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {shot.reCreeshotTopics.map(({ topic }) => (
              <span
                key={topic.id}
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: topic.colorHex ?? "#C8FF09",
                  color: topic.textColorHex ?? "#000",
                }}
              >
                {topic.nameEn}
              </span>
            ))}
            {shot.reCreeshotTags.map(({ tag }) => (
              <span
                key={tag.id}
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: tag.colorHex ?? "#e5e7eb",
                  color: tag.textColorHex ?? "#000",
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* 스토리 */}
        {shot.story && (
          <div>
            <p className="text-sm font-semibold mb-1">Story</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{shot.story}</p>
          </div>
        )}

        {/* 팁 */}
        {shot.tips && (
          <div>
            <p className="text-sm font-semibold mb-1">Tips</p>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{shot.tips}</p>
          </div>
        )}
      </div>
    </div>
  );
}
