export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  void params;
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">이벤트 수정</h1>
      <p className="text-sm text-muted-foreground mt-1">이벤트 폼 — E2-2에서 구현 예정</p>
    </div>
  );
}
