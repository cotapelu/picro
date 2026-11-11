// PiLogo - logo bằng nửa khối (half-block)
// Bắt chước nguyên tắc pi-mono components/pi-logo.ts:
//   - 4 ô rộng, 2 dòng cao; mỗi ô vẽ hai pixel vuông bằng half block
//   - Màu thương hiệu cố định xuyên các chủ đề, theo chế độ màu terminal
//   - Apple Terminal vẽ khe hở giữa các dòng nên dùng wordmark thay thế
// Port sang Ink TSX, khon copy code truc iep.

import { backgroundAnsi, foregroundAnsi, indexedColor, parseColor, type TerminalColorMode } from "../core/index.js";
import { getTheme } from "../theme/index.js";

export type BrandColor = ReturnType<typeof parseColor>;

export function brandColors(): { coral: BrandColor; blue: BrandColor; yellow: BrandColor } {
  return {
    coral: parseColor("oklch(0.72 0.11 25)"),
    blue: parseColor("oklch(0.60 0.09 240)"),
    yellow: parseColor("oklch(0.80 0.13 85)"),
  };
}

const RESET = "\x1b[0m";

/** Hai dòng logo, mỗi dùng half-block cho hai pixel dọc. */
export function piLogoLines(mode?: TerminalColorMode): [string, string] {
  const t = getTheme();
  const colorMode = mode ?? t.getColorMode();
  const { coral, blue, yellow } = brandColors();
  const fg = (color: BrandColor) => foregroundAnsi(color, colorMode);
  const bg = (color: BrandColor) => backgroundAnsi(color, colorMode);
  // Ô thứ tư của dòng trên trống nên đệm cho đủ bề rộng dòng dưới.
  const top = `${fg(coral)}${bg(blue)}▀${RESET}${fg(coral)}▀█${RESET} `;
  const bottom = `${fg(blue)}█▀${RESET} ${fg(yellow)}█${RESET}`;
  return [top, bottom];
}

/** Terminal có vẽ đúng half-block logo không. */
export function supportsPiLogo(): boolean {
  return !isAppleTerminal();
}

/** Wordmark văn bản thay thế: "Picro" với hai màu coral và yellow. */
export function piWordmark(mode?: TerminalColorMode): string {
  const t = getTheme();
  const colorMode = mode ?? t.getColorMode();
  const { coral, yellow } = brandColors();
  return `${foregroundAnsi(coral, colorMode)}P${RESET}${foregroundAnsi(yellow, colorMode)}i${RESET}`;
}

function isAppleTerminal(): boolean {
  return process.platform === "darwin" && process.env.TERM_PROGRAM === "Apple_Terminal";
}

/** Chỉ báo logo cho header: 2 dòng hoặc wordmark nếu terminal không hỗ trợ. */
export function logoForHeader(): [string, string] {
  if (!supportsPiLogo()) {
    return [piWordmark(), ""];
  }
  return piLogoLines();
}

export { indexedColor };
