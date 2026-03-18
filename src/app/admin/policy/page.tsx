import { prisma } from "@/lib/prisma";
import { PolicyEditor } from "./_components/PolicyEditor";

export default async function PolicyPage() {
  const [terms, privacy] = await Promise.all([
    prisma.policy.findUnique({ where: { id: "terms" } }),
    prisma.policy.findUnique({ where: { id: "privacy" } }),
  ]);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-xl font-bold mb-6">정책 관리</h1>
      <PolicyEditor terms={terms} privacy={privacy} />
    </div>
  );
}
