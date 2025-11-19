export function shortLatLon(lat?: number, lon?: number) {
  if (typeof lat !== "number" || typeof lon !== "number") return "—";
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
export function timeAgo(isoOrMs?: string | number) {
  if (!isoOrMs) return "";
  const t = typeof isoOrMs === "string" ? new Date(isoOrMs).getTime() : isoOrMs;
  const diff = Date.now() - t;
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return `${days}d`;
}
