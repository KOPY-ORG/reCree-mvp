import Link from "next/link";
import Image from "next/image";
import { isExternalImage, focalStyle } from "@/lib/image";
import {
  resolveTopicColors,
  resolveTagColors,
  labelBackground,
  type TagGroupColorMap,
  type ResolvedLabel,
} from "@/lib/post-labels";
import { LabelBadge } from "@/components/LabelBadge";
import type { PostItem } from "@/lib/post-queries";
import { ScrapButton } from "./ScrapButton";

const K_SCENE_GROUP = "K_MEDIA";

// 슬롯 선택 후 displayLabel 적용 여부를 결정하기 위한 중간 타입
type LabelSlot = {
  group: string;          // "TOPIC" | 실제 tag group key
  name: string;           // 항상 원본 이름 (topic.nameEn 또는 tag.name)
  displayLabel: string | null; // 그룹의 displayLabel (토픽·없는 그룹은 null)
  colors: Omit<ResolvedLabel, "text">;
};

function resolvePostLabels(
  post: PostItem,
  tagGroupMap: TagGroupColorMap,
  variant: "home" | "list",
): ResolvedLabel[] {
  // 토픽 슬롯 (displayOrder 오름차순, 쿼리에서 이미 정렬)
  const topicSlots: LabelSlot[] = post.postTopics.map(({ topic }) => ({
    group: "TOPIC",
    name: topic.nameEn,
    displayLabel: null,
    colors: resolveTopicColors(topic),
  }));

  // K_MEDIA 태그 슬롯
  const ksceneSlots: LabelSlot[] = post.postTags
    .filter(({ tag }) => tag.group === K_SCENE_GROUP)
    .map(({ tag }) => {
      const gc = tagGroupMap.get(tag.group);
      return { group: tag.group, name: tag.name, displayLabel: null, colors: resolveTagColors(tag, gc) };
    });

  // non-K_MEDIA 태그 슬롯
  const otherSlots: LabelSlot[] = post.postTags
    .filter(({ tag }) => tag.group !== K_SCENE_GROUP)
    .map(({ tag }) => {
      const gc = tagGroupMap.get(tag.group);
      return { group: tag.group, name: tag.name, displayLabel: gc?.displayLabel ?? null, colors: resolveTagColors(tag, gc) };
    });

  // 슬롯 선택
  let selected: LabelSlot[];
  if (variant === "home") {
    // 슬롯 1: 토픽 우선, 없으면 non-K_MEDIA 태그
    // 슬롯 2: non-K_MEDIA 태그 우선, 없으면 다음 토픽
    selected = [];
    let topicUsed = 0, otherUsed = 0;
    if (topicUsed < topicSlots.length) selected.push(topicSlots[topicUsed++]);
    else if (otherUsed < otherSlots.length) selected.push(otherSlots[otherUsed++]);
    if (otherUsed < otherSlots.length) selected.push(otherSlots[otherUsed++]);
    else if (topicUsed < topicSlots.length) selected.push(topicSlots[topicUsed++]);
  } else {
    // list: 토픽 1 + K_MEDIA 1 + non-K_MEDIA 1, 빈 슬롯은 남은 항목으로 보충 (최대 3개)
    selected = [];
    let topicUsed = 0, ksceneUsed = 0, otherUsed = 0;

    // 1단계: 각 풀에서 대표 1개씩
    if (topicUsed < topicSlots.length)  selected.push(topicSlots[topicUsed++]);
    if (ksceneUsed < ksceneSlots.length) selected.push(ksceneSlots[ksceneUsed++]);
    if (otherUsed < otherSlots.length)  selected.push(otherSlots[otherUsed++]);

    // 2단계: 빈 슬롯 보충 — 남은 항목을 displayOrder 순(토픽→K_MEDIA→나머지)으로 채움
    if (selected.length < 3) {
      const remaining = [
        ...topicSlots.slice(topicUsed),
        ...ksceneSlots.slice(ksceneUsed),
        ...otherSlots.slice(otherUsed),
      ];
      for (const slot of remaining) {
        if (selected.length >= 3) break;
        selected.push(slot);
      }
    }
  }

  // 렌더링 순서 보정: 토픽 → K-MEDIA → 나머지 태그
  const ORDER = (g: string) => g === "TOPIC" ? 0 : g === K_SCENE_GROUP ? 1 : 2;
  selected.sort((a, b) => ORDER(a.group) - ORDER(b.group));

  // displayLabel 적용 조건:
  // 해당 슬롯 외에 다른 group의 슬롯이 함께 표시될 때만 displayLabel 사용.
  // 단독이거나 같은 group끼리만 표시되면 tag.name 그대로 사용.
  return selected.map((slot) => {
    const hasOtherGroup = selected.some((s) => s.group !== slot.group);
    const text = slot.displayLabel && hasOtherGroup ? slot.displayLabel : slot.name;
    return { text, ...slot.colors };
  });
}

export function PostBadges({
  post,
  tagGroupMap,
  variant = "home",
}: {
  post: PostItem;
  tagGroupMap: TagGroupColorMap;
  variant?: "home" | "list";
}) {
  const labels = resolvePostLabels(post, tagGroupMap, variant);
  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 [--pill-fs:0.625rem]">
      {labels.map((label, i) => (
        <LabelBadge
          key={i}
          text={label.text}
          background={labelBackground(label)}
          color={label.textColorHex}
        />
      ))}
    </div>
  );
}

export function PostCard({
  post,
  tagGroupMap,
  isSaved,
  variant = "carousel",
}: {
  post: PostItem;
  tagGroupMap: TagGroupColorMap;
  isSaved?: boolean;
  variant?: "carousel" | "grid";
}) {
  const wrapperClass =
    variant === "carousel" ? "snap-start shrink-0 w-[160px] md:w-[200px]" : "";
  const imageSizes =
    variant === "carousel" ? "200px" : "(max-width: 672px) 50vw, 336px";

  return (
    <Link href={`/posts/${post.slug}`} className={wrapperClass}>
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
        {post.postImages[0]?.url ? (
          <Image
            src={post.postImages[0].url}
            alt={post.titleEn}
            fill
            unoptimized={isExternalImage(post.postImages[0].url)}
            className="object-cover"
            style={focalStyle(post.postImages[0].focalX, post.postImages[0].focalY, post.postImages[0].zoom)}
            sizes={imageSizes}
          />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-2 left-2 right-2">
          <PostBadges post={post} tagGroupMap={tagGroupMap} />
        </div>
        <div className="absolute bottom-2 left-2 right-10">
          <p className="text-white text-xs font-semibold line-clamp-2 leading-snug drop-shadow">
            {post.postPlaces[0]?.place.nameEn ?? post.postPlaces[0]?.place.nameKo ?? post.titleEn}
          </p>
        </div>
        <div className="absolute bottom-2 right-2 z-10">
          <ScrapButton postId={post.id} initialSaved={isSaved ?? false} size="sm" />
        </div>
      </div>
    </Link>
  );
}
