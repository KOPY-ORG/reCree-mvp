import { z } from "zod";

export const topicIdSchema = z.string().uuid();
