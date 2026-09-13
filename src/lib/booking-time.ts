export const BUSINESS_TIME_ZONE = "Asia/Shanghai";
export function businessTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
export function businessDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"]
    .map((t) => parts.find((p) => p.type === t)!.value)
    .join("-");
}
export function localInputToIso(value: string) {
  return new Date(value + ":00+08:00").toISOString();
}
export function isoToLocalInput(value: string) {
  const d = new Date(new Date(value).getTime() + 8 * 3600000);
  return d.toISOString().slice(0, 16);
}

export function businessRange(range: "weekend" | "next", now = new Date()) {
  const day = businessDay(now),
    midnight = new Date(day + "T00:00:00+08:00").getTime(),
    weekday = new Date(day + "T00:00:00Z").getUTCDay(),
    monday = midnight - ((weekday + 6) % 7) * 86400000;
  return {
    from: new Date(monday + (range === "weekend" ? 5 : 7) * 86400000),
    to: new Date(monday + (range === "weekend" ? 7 : 14) * 86400000),
  };
}
