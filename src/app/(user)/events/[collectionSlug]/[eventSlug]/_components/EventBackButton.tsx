"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function EventBackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      aria-label="Go back"
      style={{
        width: 38,
        height: 38,
        borderRadius: 999,
        background: "rgba(20,16,18,.4)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        cursor: "pointer",
      }}
    >
      <ArrowLeft size={16} color="#fff" />
    </button>
  );
}
