import { redirect } from "next/navigation";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const target = q ? `/explore?q=${encodeURIComponent(q)}` : "/explore";
  redirect(target);
}
