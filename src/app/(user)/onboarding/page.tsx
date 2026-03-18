import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OnboardingFlow } from "./_components/OnboardingFlow";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.termsAcceptedAt) redirect("/");

  const emailPrefix = user.email.split("@")[0];
  const isExistingUser = !!(user.nickname || user.bio);

  return <OnboardingFlow emailPrefix={emailPrefix} isExistingUser={isExistingUser} />;
}
