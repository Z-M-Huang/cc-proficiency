/**
 * Format a token count for compact display.
 * 1500000 → "1.5M", 15300 → "15.3k", 152 → "152"
 */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}
