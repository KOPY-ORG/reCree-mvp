"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "../../_components/SearchBar";

export function ExploreSearchActiveBar({ q }: { q: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    router.push(`/explore?${params.toString()}`);
  };

  return (
    <div className="px-4 pt-2">
      <SearchBar variant="active" activeQuery={q} onClear={handleClear} />
    </div>
  );
}
