"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Flag } from "lucide-react";
import { ReportDialog } from "@/components/ReportDialog";

interface Props {
  postId?: string;
}

export function PostDetailHeader({ postId }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-12 px-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center h-8 w-8"
        >
          <ArrowLeft className="h-5 w-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
        </button>

        {postId && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center justify-center h-8 w-8"
            >
              <MoreVertical className="h-5 w-5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute top-10 right-0 z-20 bg-white/80 backdrop-blur-md rounded-xl shadow-md overflow-hidden min-w-[160px]">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                    className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <Flag className="size-4 shrink-0" />
                    Report
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <ReportDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        postId={postId}
      />
    </>
  );
}
