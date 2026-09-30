import Link from "next/link";
import { Plus } from "lucide-react";

export function NewReCreeshotFab() {
  return (
    <div className="fixed bottom-[var(--bottom-nav-space)] inset-x-0 z-50 h-10 pointer-events-none lg:pl-[var(--side-nav-space)]">
      <div className="max-w-[var(--app-col-w)] mx-auto h-full relative">
        <Link
          href="/recreeshot/new"
          aria-label="New recreeshot"
          className="
            absolute bottom-0 right-2 pointer-events-auto
            size-10 rounded-full
            flex items-center justify-center
            backdrop-blur-sm
            shadow-[0_4px_16px_rgba(0,0,0,0.18)]
            transition-all duration-200
            outline-none
          "
          style={{ background: "linear-gradient(135deg, color-mix(in srgb, color-mix(in srgb, var(--palette-brand) 80%, white) 92%, transparent) 0%, color-mix(in srgb, var(--palette-brand) 92%, transparent) 100%)" }}
        >
          <Plus size={20} color="var(--palette-on-brand)" strokeWidth={2.0} />
        </Link>
      </div>
    </div>
  );
}
