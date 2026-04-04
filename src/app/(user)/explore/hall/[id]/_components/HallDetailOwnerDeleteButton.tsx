"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteReCreeshot } from "@/app/(user)/_actions/recreeshot-actions";
import { showError } from "@/lib/toast";
import { ReCreeshotDeleteConfirm } from "./ReCreeshotDeleteConfirm";

export function HallDetailOwnerDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteReCreeshot(id);
    if (result.error) {
      showError("Failed to delete. Please try again.");
      setIsDeleting(false);
      setShowConfirm(false);
      return;
    }
    router.back();
  }

  return (
    <>
      {showConfirm && (
        <ReCreeshotDeleteConfirm
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
          isDeleting={isDeleting}
        />
      )}
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1.5 text-sm text-red-500 font-medium"
      >
        <Trash2 className="size-4 shrink-0" />
        Delete my recreeshot
      </button>
    </>
  );
}
