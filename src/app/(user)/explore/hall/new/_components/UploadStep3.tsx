"use client";

import { useEffect } from "react";
import Image from "next/image";
import { scoreReCreeshot } from "@/app/(user)/_actions/recreeshot-actions";
import { useRouter } from "next/navigation";

interface Props {
  shotPreviewUrl: string;
  createdId: string;
}

export function UploadStep3({ shotPreviewUrl, createdId }: Props) {
  const router = useRouter();

  useEffect(() => {
    async function runScoring() {
      await scoreReCreeshot(createdId);
      router.push(`/explore/hall/${createdId}`);
    }
    runScoring();
  }, [createdId, router]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* 헤더 */}
      <div className="flex items-center justify-center py-4 border-b border-border/50">
        <span className="font-bold text-base tracking-tight">reCree</span>
      </div>

      <div className="relative flex-1">
        <Image
          src={shotPreviewUrl}
          alt="your recreeshot"
          fill
          className="object-cover"
          sizes="100vw"
        />
        {/* 분석 중 펄스 오버레이 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex size-24 rounded-full bg-brand/40 animate-ping" />
            <span className="relative inline-flex size-16 rounded-full bg-brand/80 items-center justify-center">
              <span className="text-black text-xs font-bold text-center leading-tight">
                AI<br/>Scoring
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
