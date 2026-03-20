/**
 * Calculate the display width of a string, accounting for
 * CJK full-width characters that take 2 columns in a terminal.
 */
export function displayWidth(str: string): number {
  let width = 0;
  for (const ch of str) {
    const code = ch.codePointAt(0)!;
    if (isFullWidth(code)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Pad a string to a target display width (like padEnd but CJK-aware).
 */
export function padEndDisplay(str: string, targetWidth: number): string {
  const current = displayWidth(str);
  if (current >= targetWidth) return str;
  return str + " ".repeat(targetWidth - current);
}

function isFullWidth(code: number): boolean {
  // CJK Unified Ideographs
  if (code >= 0x4e00 && code <= 0x9fff) return true;
  // CJK Unified Ideographs Extension A
  if (code >= 0x3400 && code <= 0x4dbf) return true;
  // CJK Compatibility Ideographs
  if (code >= 0xf900 && code <= 0xfaff) return true;
  // Hangul Syllables
  if (code >= 0xac00 && code <= 0xd7af) return true;
  // Katakana
  if (code >= 0x30a0 && code <= 0x30ff) return true;
  // Hiragana
  if (code >= 0x3040 && code <= 0x309f) return true;
  // Fullwidth Forms
  if (code >= 0xff01 && code <= 0xff60) return true;
  // CJK Symbols and Punctuation
  if (code >= 0x3000 && code <= 0x303f) return true;
  return false;
}
