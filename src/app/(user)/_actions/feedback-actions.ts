"use server";

import { prisma } from "@/lib/prisma";

const VALID_SOURCES = ["feed", "discover"] as const;
type FeedbackSource = (typeof VALID_SOURCES)[number];

function isValidSource(s: string): s is FeedbackSource {
  return (VALID_SOURCES as readonly string[]).includes(s);
}

export async function submitFeedback(input: {
  content: string;
  email?: string | null;
  source: string;
}): Promise<{ success: true } | { error: string }> {
  const content = input.content?.trim() ?? "";
  if (content.length < 10)
    return { error: "Please write at least 10 characters." };
  if (content.length > 500)
    return { error: "Feedback must be 500 characters or fewer." };

  if (!isValidSource(input.source))
    return { error: "Invalid source." };

  const email = input.email?.trim() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Please enter a valid email address." };

  try {
    await prisma.feedback.create({
      data: { content, email, source: input.source },
    });
    return { success: true };
  } catch (e) {
    console.error("submitFeedback failed:", e);
    return { error: "Something went wrong. Please try again later." };
  }
}
