"use client";

import { useEffect } from "react";
import { trackDailyActivity } from "../_actions/activity-actions";

export function ActivityTracker() {
  useEffect(() => {
    const key = `dau_${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) return;
    trackDailyActivity().then(() => sessionStorage.setItem(key, "1"));
  }, []);

  return null;
}
