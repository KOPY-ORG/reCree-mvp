import { defineConfig } from "prisma/config";

// Prisma CLI는 .env.local을 자동으로 읽지 않으므로 명시적으로 로드
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local이 없어도 무시 (CI 환경 등에서는 환경변수가 직접 주입됨)
}

export default defineConfig({
  migrations: {
    // Prisma v7: seed는 prisma.config.ts의 migrations.seed로 설정
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  // Migrate용 직접 연결 URL (Supabase의 connection pooler 우회)
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
