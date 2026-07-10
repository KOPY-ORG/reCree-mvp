import { getCurrentUser } from "@/lib/auth";
import { ClarityInit } from "./ClarityInit";

export async function ClarityAnalytics() {
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  if (!projectId) return null;

  const user = await getCurrentUser();
  if (user?.role === "ADMIN" || user?.role === "EDITOR") return null;

  return <ClarityInit projectId={projectId} />;
}
