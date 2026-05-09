import { getCurrentUser } from "@/lib/auth";
import { VercelAnalyticsClient } from "./VercelAnalyticsClient";

export async function VercelAnalytics() {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN" || user?.role === "EDITOR") return null;
  return <VercelAnalyticsClient />;
}
