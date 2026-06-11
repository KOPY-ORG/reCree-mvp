import Link from "next/link";
import { Plus } from "lucide-react";

export function NewReCreeshotFab() {
  return (
    <Link
      href="/recreeshot/new"
      aria-label="New recreeshot"
      className="
        fixed bottom-[72px] right-2 z-50
        size-10 rounded-full
        flex items-center justify-center
        backdrop-blur-sm
        shadow-[0_4px_16px_rgba(0,0,0,0.18)]
        transition-all duration-200
        outline-none
      "
      style={{ background: "linear-gradient(135deg, rgba(216,255,120,0.92) 0%, rgba(200,255,9,0.92) 100%)" }}
    >
      <Plus size={20} color="#000000" strokeWidth={2.0} />
    </Link>
  );
}
