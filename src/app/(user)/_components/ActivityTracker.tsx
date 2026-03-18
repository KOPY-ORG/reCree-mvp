"use client";

import { useEffect } from "react";
import { trackDailyActivity } from "../_actions/activity-actions";

export function ActivityTracker() {
  useEffect(() => {
    trackDailyActivity();
  }, []);

  return null;
}
