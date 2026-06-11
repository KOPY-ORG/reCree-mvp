"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

interface Props {
  shotPreviewUrl: string;
  createdId: string;
}

export function DoneStep({ shotPreviewUrl, createdId }: Props) {
  const router = useRouter();

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-6 gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <CheckCircle2 className="size-12 text-brand" strokeWidth={1.5} />
        <p className="text-xl font-bold">Shared!</p>
        <p className="text-sm text-muted-foreground">Your recreeshot has been shared.</p>
      </div>

      {/* 사진 미리보기 */}
      <div className="w-48 aspect-[4/5] overflow-hidden bg-muted mx-auto shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={shotPreviewUrl} alt="recreeshot" className="w-full h-full object-cover" />
      </div>

      <div className="w-full space-y-2">
        <button
          type="button"
          onClick={() => router.push(`/recreeshot/${createdId}?from=new`)}
          className="w-full py-3 rounded-full font-semibold text-sm bg-brand text-black"
        >
          View your recreeshot
        </button>
        <button
          type="button"
          onClick={() => router.push("/recreeshot")}
          className="w-full py-3 rounded-full font-semibold text-sm border border-border"
        >
          View all recreeshots
        </button>
      </div>
    </div>
  );
}
