import { defineConfig } from "prisma/config";

export default defineConfig({
  // Migrate용 직접 연결 URL (Supabase의 connection pooler 우회)
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
