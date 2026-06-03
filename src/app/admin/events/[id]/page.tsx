import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/events"
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">컬렉션 상세</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        이벤트 목록 및 관리 — 다음 단계(E2-C-4)에서 구현 예정
      </p>
    </div>
  );
}
