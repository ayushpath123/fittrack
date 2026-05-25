export function isPositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

export function isValidOtp(value: string) {
  return /^\d{6}$/.test(value.trim());
}

export function isNonEmpty(value: string) {
  return value.trim().length > 0;
}
