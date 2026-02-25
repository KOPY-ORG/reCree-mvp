"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  currentSearch: string;
  currentStatus: string;
}

function buildUrl(
  pathname: string,
  values: { search: string; status: string },
): string {
  const sp = new URLSearchParams();
  if (values.search) sp.set("search", values.search);
  if (values.status) sp.set("status", values.status);
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function PostsFilters({ currentSearch, currentStatus }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(currentSearch);

  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const t = setTimeout(() => {
      router.push(
        buildUrl(pathname, { search: searchValue, status: currentStatus }),
      );
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const handleStatusChange = (value: string) => {
    const status = value === "all" ? "" : value;
    router.push(buildUrl(pathname, { search: searchValue, status }));
  };

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="제목으로 검색..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={currentStatus || "all"}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 상태</SelectItem>
          <SelectItem value="DRAFT">임시저장</SelectItem>
          <SelectItem value="PUBLISHED">발행됨</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
