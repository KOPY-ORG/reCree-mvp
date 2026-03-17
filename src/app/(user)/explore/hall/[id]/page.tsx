import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { HallDetailClient } from "./_components/HallDetailClient";
import { HallDetailMenuButton } from "./_components/HallDetailMenuButton";
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
        include: {
          topic: {
            select: {
              id: true, nameEn: true,
              colorHex: true, colorHex2: true, gradientDir: true, gradientStop: true, textColorHex: true,
            },
          },
        },
      },
      reCreeshotTags: {
        include: {
          tag: { select: { id: true, name: true, group: true, colorHex: true, colorHex2: true, textColorHex: true } },
        },
      },
    },
  });

  if (!shot || shot.status === "DELETED") notFound();

  // 태그 그룹 컬러 맵
  const tagGroups = await prisma.tagGroupConfig.findMany();
  const groupMap = new Map(tagGroups.map((g) => [g.group, g]));

  const liked = currentUser
    ? !!(await prisma.reCreeshotLike.findUnique({
        where: { userId_reCreeshotId: { userId: currentUser.id, reCreeshotId: id } },
      }))
    : false;

  const saved = currentUser
    ? !!(await prisma.save.findUnique({
        where: { userId_targetType_targetId: { userId: currentUser.id, targetType: "RECREESHOT", targetId: id } },
      }))
    : false;

  const isOwner = currentUser?.id === shot.user.id;

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

        {/* 헤더 오버레이 */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-2 pt-3 pb-8 bg-gradient-to-b from-black/40 to-transparent z-10">
          <Link href="/explore?tab=hall" className="p-2 rounded-full">
            <ChevronLeft className="size-5 text-white" />
          </Link>
          <HallDetailMenuButton
            id={id}
            isOwner={isOwner}
            imageUrl={shot.imageUrl}
            referencePhotoUrl={shot.referencePhotoUrl}
            matchScore={shot.matchScore}
            showBadge={shot.showBadge}
          />
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="px-4 py-4 space-y-4">
        {/* 사용자 정보 + 날짜 + 액션 버튼 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {shot.user.profileImageUrl ? (
                <Image
                  src={shot.user.profileImageUrl}
                  alt={shot.user.nickname ?? "user"}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-xs font-bold text-muted-foreground">
                  {(shot.user.nickname ?? "A")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{shot.user.nickname ?? "Anonymous"}</p>
              <p className="text-xs text-muted-foreground/60 leading-tight mt-0.5">
                {shot.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </p>
            </div>
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
          shot.placeId ? (
            <Link
              href={`/my-map?place=${shot.placeId}`}
              className="flex items-center gap-1.5 text-sm text-muted-foreground w-fit"
            >
              <MapPin className="size-3.5 shrink-0" />
              <span>{shot.locationName}</span>
              <ChevronRight className="size-3.5 shrink-0 opacity-60" />
            </Link>
          ) : (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              {shot.locationName}
            </p>
          )
        )}

        {/* 토픽/태그 배지 */}
        {(shot.reCreeshotTopics.length > 0 || shot.reCreeshotTags.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {shot.reCreeshotTopics.map(({ topic }) => {
              const bg = topic.colorHex2
                ? `linear-gradient(${topic.gradientDir}, ${topic.colorHex}, ${topic.colorHex2} ${topic.gradientStop}%)`
                : (topic.colorHex ?? "#C8FF09");
              return (
                <span
                  key={topic.id}
                  className="pill-badge text-xs font-medium"
                  style={{ background: bg, color: topic.textColorHex ?? "#000" }}
                >
                  {topic.nameEn}
                </span>
              );
            })}
            {shot.reCreeshotTags.map(({ tag }) => {
              const group = groupMap.get(tag.group);
              const colorHex = tag.colorHex ?? group?.colorHex ?? "#e5e7eb";
              const colorHex2 = tag.colorHex2 ?? group?.colorHex2;
              const gradientDir = group?.gradientDir ?? "to right";
              const gradientStop = group?.gradientStop ?? 150;
              const textColorHex = tag.textColorHex ?? group?.textColorHex ?? "#000";
              const bg = colorHex2
                ? `linear-gradient(${gradientDir}, ${colorHex}, ${colorHex2} ${gradientStop}%)`
                : colorHex;
              return (
                <span
                  key={tag.id}
                  className="pill-badge text-xs font-medium"
                  style={{ background: bg, color: textColorHex }}
                >
                  {tag.name}
                </span>
              );
            })}
          </div>
        )}

        {/* 스토리 */}
        {shot.story && (
          <div className="rounded-xl px-4 py-3 space-y-1 bg-muted/50">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Story</p>
            <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed break-words">{shot.story}</p>
          </div>
        )}

        {/* 팁 — 뉴트럴 카드 */}
        {shot.tips && (
          <div className="rounded-xl px-4 py-3 space-y-1 bg-brand-sub3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tips</p>
            <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed break-words">{shot.tips}</p>
          </div>
        )}
      </div>
    </div>
  );
}
