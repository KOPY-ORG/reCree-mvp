export function formatDateRangeUTC(start: Date, end: Date): string {
  const opts = { timeZone: "UTC" } as const;
  const startMonth = start.toLocaleDateString("en-US", { ...opts, month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { ...opts, month: "short" });
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  if (startMonth === endMonth && start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${startMonth} ${startDay} – ${endDay}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

export function getDDay(startDate: Date, endDate: Date): string | null {
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startUTC = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
  );
  const endUTC = Date.UTC(
    endDate.getUTCFullYear(),
    endDate.getUTCMonth(),
    endDate.getUTCDate(),
  );
  if (todayUTC > endUTC) return null;
  const diff = Math.round((startUTC - todayUTC) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "NOW";
  if (diff === 0) return "D-DAY";
  return `D-${diff}`;
}
