/**
 * Format a token count for compact display.
 * 1.5e15 → "1.5P", 1.5e12 → "1.5T", 1.5e9 → "1.5B", 1.5e6 → "1.5M", 15300 → "15.3k", 152 → "152"
 */
export function formatTokens(n: number): string {
  if (n >= 1e15) return (n / 1e15).toFixed(1) + "P";
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(n);
}
