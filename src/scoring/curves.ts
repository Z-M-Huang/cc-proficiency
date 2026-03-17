/**
 * Saturating score curves for anti-gaming.
 * All return 0-100.
 */

/**
 * Logarithmic saturating curve.
 * score = min(100, k * log(1 + value / scale))
 *
 * @param value - raw signal value
 * @param scale - divisor that controls how quickly the curve saturates
 * @param k - multiplier (typically calibrated so k * log(1 + maxExpected/scale) ≈ 100)
 */
export function logCurve(value: number, scale: number, k: number): number {
  if (value <= 0) return 0;
  return Math.min(100, k * Math.log(1 + value / scale));
}

/**
 * Capped ratio curve.
 * score = min(100, (value / cap) * 100)
 */
export function cappedRatio(value: number, cap: number): number {
  if (value <= 0 || cap <= 0) return 0;
  return Math.min(100, (value / cap) * 100);
}

/**
 * Binary score — either 0 or the specified value.
 */
export function binary(present: boolean, score: number): number {
  return present ? score : 0;
}

/**
 * Ratio to score — converts a 0-1 ratio to 0-100.
 */
export function ratioToScore(ratio: number): number {
  return Math.min(100, Math.max(0, ratio * 100));
}

/**
 * Weighted sum of sub-signals, clamped to 0-100.
 */
export function weightedSum(
  components: Array<{ score: number; weight: number }>
): number {
  let total = 0;
  let totalWeight = 0;
  for (const { score, weight } of components) {
    total += score * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return 0;
  return Math.min(100, Math.max(0, total / totalWeight));
}
