/** Empty field instead of 0 — avoids leading-zero typing bugs (e.g. 015). */
export function numberToInputValue(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return String(value);
}

/** Strip invalid chars and leading zeros while the user types. */
export function sanitizeNumericInput(raw: string): string {
  if (raw === "") return "";
  let v = raw.replace(/[^\d.]/g, "");
  const dotIdx = v.indexOf(".");
  if (dotIdx !== -1) {
    v = v.slice(0, dotIdx + 1) + v.slice(dotIdx + 1).replace(/\./g, "");
  }
  const endsWithDot = v.endsWith(".");
  const [intRaw = "", dec] = v.split(".") as [string, string | undefined];
  let intPart = intRaw.replace(/^0+(?=\d)/, "");
  if (intPart === "" && (dec !== undefined || endsWithDot)) intPart = "0";
  if (dec !== undefined) return `${intPart}.${dec}`;
  if (endsWithDot) return `${intPart}.`;
  return intPart;
}

export function parseNumericInput(value: string): number {
  const trimmed = value.trim();
  if (!trimmed || trimmed === ".") return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export function parseIntegerInput(value: string): number {
  return Math.round(parseNumericInput(value));
}
