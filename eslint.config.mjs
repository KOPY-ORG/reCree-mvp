import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 도구 폴더 — 앱 코드가 아니다 (Claude Code 스킬 · Playwright MCP 결과물)
    ".claude/**",
    ".playwright-mcp/**",
  ]),
]);

export default eslintConfig;
