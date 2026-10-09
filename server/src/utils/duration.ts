
/** duration 字符串（MM:SS / H:MM:SS）→ 秒；无法解析则返回 Infinity */
function durationToSeconds(duration: unknown) {
  if (duration == null || duration === "") return Infinity;
  const parts = String(duration)
    .trim()
    .split(":")
    .map((p) => Number(p));
  if (!parts.length || parts.some((n) => Number.isNaN(n))) return Infinity;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function isShortDuration(duration: unknown, maxSeconds = 60) {
  return durationToSeconds(duration) <= maxSeconds;
}

export { durationToSeconds, isShortDuration };
