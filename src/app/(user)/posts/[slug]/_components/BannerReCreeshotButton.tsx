"use client";

import { Camera } from "lucide-react";
import { useAddReCreeshot } from "./useAddReCreeshot";

interface Props {
  postId: string;
  originalImageUrl: string | null;
  isLoggedIn: boolean;
}

// 배너 우측 하단의 recreeshot 추가 버튼. 위쪽 버튼들보다 크고 진한 회색 원(.photo-action-camera)이다.
// 누르는 칸 44 의 가운데에 40 원이 있어, 칸을 10px 안쪽에 두면 원이 가장자리에서 12px 떨어진다.
// 누르는 흐름은 아래 추가 카드와 같다
export function BannerReCreeshotButton({ postId, originalImageUrl, isLoggedIn }: Props) {
  const { handleAdd, loginDialog } = useAddReCreeshot({ postId, originalImageUrl, isLoggedIn });

  return (
    <>
      <button
        type="button"
        onClick={handleAdd}
        aria-label="Add recreeshot"
        className="photo-action photo-action-camera press-scale absolute bottom-2.5 right-2.5 z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Camera className="size-5" strokeWidth={2} aria-hidden="true" />
      </button>
      {loginDialog}
    </>
  );
}
