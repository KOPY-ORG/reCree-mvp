import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PolicyContent } from "./_components/PolicyContent";
import { PolicyBackButton } from "./_components/PolicyBackButton";

const TITLES: Record<string, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;

  if (type !== "terms" && type !== "privacy") notFound();

  const policy = await prisma.policy.findUnique({ where: { id: type } });
  if (!policy) notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* lg 는 상단 바가 길을 잡고, 문서 제목은 본문 h1 이 맡는다 */}
      <header className="app-header lg:hidden">
        <div className="h-12 flex items-center gap-1 px-2">
          <PolicyBackButton />
          <h1 className="text-sm font-semibold">{TITLES[type]}</h1>
        </div>
      </header>

      <main className="px-5 pt-2 pb-6 max-w-3xl mx-auto lg:pt-[var(--space-page-top)]">
        <h1 className="text-2xl font-bold mb-6">{TITLES[type]}</h1>
        <PolicyContent content={policy.content} />
      </main>
    </div>
  );
}