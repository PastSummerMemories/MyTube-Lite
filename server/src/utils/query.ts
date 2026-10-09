/** 把 Express query / params 收成单个字符串 */
export function asString(value: unknown, fallback = ""): string {
  if (Array.isArray(value)) return asString(value[0], fallback);
  if (value == null) return fallback;
  if (typeof value === "object") return fallback;
  return String(value);
}

export function asInt(value: unknown, fallback = 0): number {
  const n = parseInt(asString(value), 10);
  return Number.isFinite(n) ? n : fallback;
}
