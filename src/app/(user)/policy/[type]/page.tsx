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
      <header className="app-header">
        <div className="h-12 flex items-center gap-1 px-2">
          <PolicyBackButton />
          <h1 className="text-sm font-semibold">{TITLES[type]}</h1>
        </div>
      </header>

      <div className="px-5 pt-2 pb-6">
        <PolicyContent content={policy.content} />
      </div>
    </div>
  );
}
