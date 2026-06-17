import { z } from "zod";

export const nicknameSchema = z
  .string()
  .trim()
  .min(1, "Nickname is required.")
  .max(20, "Nickname must be 20 characters or less.");
