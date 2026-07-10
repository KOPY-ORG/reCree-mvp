"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";

export function ClarityInit({ projectId }: { projectId: string }) {
  useEffect(() => {
    Clarity.init(projectId);
  }, [projectId]);

  return null;
}
