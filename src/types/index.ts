// reCree MVP 공통 타입 정의
import type { User } from "@prisma/client";

export type { User };

export type SourcePlatform =
  | "YOUTUBE"
  | "INSTAGRAM"
  | "X"
  | "PINTEREST"
  | "NETFLIX"
  | "WEVERSE"
  | "BLOG"
  | "ARTICLE"
  | "TIKTOK"
  | "NEWS"
  | "OTHER";
