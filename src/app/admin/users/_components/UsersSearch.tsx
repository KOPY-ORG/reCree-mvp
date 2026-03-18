"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Props {
  currentSearch: string;
}

export function UsersSearch({ currentSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(currentSearch);
  const didMount = useRef(false);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const t = setTimeout(() => {
      const sp = new URLSearchParams();
      if (value) sp.set("search", value);
      const qs = sp.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="이메일 또는 닉네임 검색..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pl-9 rounded-lg bg-white shadow-sm border-0"
        />
      </div>
    </div>
  );
}
