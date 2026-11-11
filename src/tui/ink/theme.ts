// Theme - hệ thống màu và kiểu chữ cho TUI
// Bắt chước nguyên tắc pi-mono modes/interactive/theme/theme.ts:
//   - Mỗi tên màu là hàm nhận chuỗi và trả về chuỗi đã bọc escape
//   - Có sắc thái ngữ nghĩa: text, muted, accent, error, warning, success
//   - Có kiểu chữ: bold, dim, italic, underline, inverse
//   - Có nền: bg cho vùng nổi bật
//   - theme.fg(name, text) / theme.bg(name, text) tra cứu theo tên màu
// Port sang Ink TSX, khong copy code truc iep.

const ESC = "\x1b[";
const RESET = "\x1b[0m";

function wrap(code: string, text: string): string {
  return `${ESC}${code}m${text}${ESC}39m`;
}

function wrapBg(code: string, text: string): string {
  return `${ESC}${code}m${text}${ESC}49m`;
}

function attr(attrs: string, text: string): string {
  return `${ESC}${attrs}m${text}${RESET}`;
}

const base = {
  black: (t: string) => wrap("30", t),
  red: (t: string) => wrap("31", t),
  green: (t: string) => wrap("32", t),
  yellow: (t: string) => wrap("33", t),
  blue: (t: string) => wrap("34", t),
  magenta: (t: string) => wrap("35", t),
  cyan: (t: string) => wrap("36", t),
  white: (t: string) => wrap("37", t),
  gray: (t: string) => wrap("90", t),
};

const bright = {
  brightRed: (t: string) => wrap("91", t),
  brightGreen: (t: string) => wrap("92", t),
  brightYellow: (t: string) => wrap("93", t),
  brightBlue: (t: string) => wrap("94", t),
  brightMagenta: (t: string) => wrap("95", t),
  brightCyan: (t: string) => wrap("96", t),
};

const styles = {
  bold: (t: string) => attr("1", t),
  dim: (t: string) => attr("2", t),
  italic: (t: string) => attr("3", t),
  underline: (t: string) => attr("4", t),
  strikethrough: (t: string) => attr("9", t),
  inverse: (t: string) => attr("7", t),
};

const backgrounds = {
  bgBlack: (t: string) => wrapBg("40", t),
  bgRed: (t: string) => wrapBg("41", t),
  bgGreen: (t: string) => wrapBg("42", t),
  bgYellow: (t: string) => wrapBg("43", t),
  bgBlue: (t: string) => wrapBg("44", t),
  bgMagenta: (t: string) => wrapBg("45", t),
  bgCyan: (t: string) => wrapBg("46", t),
  bgWhite: (t: string) => wrapBg("47", t),
};

/** Bản đồ màu ngữ nghĩa của giao diện. */
export const theme = {
  ...base,
  ...bright,
  ...styles,
  ...backgrounds,

  // Sắc thái ngữ nghĩa
  text: (t: string) => base.white(t),
  muted: (t: string) => styles.dim(base.gray(t)),
  accent: (t: string) => bright.brightCyan(t),
  error: (t: string) => styles.bold(bright.brightRed(t)),
  warning: (t: string) => styles.bold(bright.brightYellow(t)),
  success: (t: string) => styles.bold(bright.brightGreen(t)),
  info: (t: string) => styles.bold(bright.brightCyan(t)),

  // Sắc thái cho từng khối
  heading: (t: string) => styles.bold(bright.brightCyan(t)),
  link: (t: string) => styles.underline(base.blue(t)),
  linkUrl: (t: string) => base.blue(t),
  listBullet: (t: string) => base.green(t),
  quote: (t: string) => styles.italic(base.white(t)),
  quoteBorder: (t: string) => base.gray(t),
  code: (t: string) => bright.brightYellow(t),
  codeBlock: (t: string) => base.cyan(t),
  codeBlockBorder: (t: string) => base.gray(t),
  hr: (t: string) => base.gray(t),

  userMessageText: (t: string) => base.white(t),
  userMessageBg: (t: string) => wrapBg("100", t),
  toolTitle: (t: string) => styles.bold(bright.brightCyan(t)),
  toolOutput: (t: string) => base.gray(t),
  toolPendingBg: (t: string) => wrapBg("100", t),
  toolSuccessBg: (t: string) => wrapBg("40", t),
  toolErrorBg: (t: string) => wrapBg("41", t),
  toolDiffAdded: (t: string) => base.green(t),
  toolDiffRemoved: (t: string) => base.red(t),
  toolDiffContext: (t: string) => base.gray(t),

  border: (t: string) => base.gray(t),
  borderAccent: (t: string) => bright.brightCyan(t),
  fgBorder: (t: string) => base.gray(t),
  customMessageBg: (t: string) => wrapBg("45", t),
  customMessageLabel: (t: string) => styles.bold(bright.brightMagenta(t)),
  customMessageText: (t: string) => base.white(t),
  selectedBg: (t: string) => wrapBg("44", t),

  reset: (): string => RESET,
};

type ThemeMap = typeof theme;

/** Tra màu theo tên: theme.fg("accent", text). */
export function fg(colorName: string, text: string): string {
  const fn = (theme as unknown as Record<string, unknown>)[colorName];
  return typeof fn === "function" ? (fn as (t: string) => string)(text) : text;
}

/** Tra nền theo tên: theme.bg("selectedBg", text). */
export function bg(colorName: string, text: string): string {
  const fn = (theme as unknown as Record<string, unknown>)[colorName];
  return typeof fn === "function" ? (fn as (t: string) => string)(text) : text;
}

export type { ThemeMap };

/** Chuẩn hóa chuỗi trạng thái: bỏ ký tự điều khiển, gộp khoảng trắng. */
export function sanitizeStatusText(text: string): string {
  return text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
}

export { formatCwdForFooter } from "./components/FormatCwd.js";
export { formatTokens } from "./components/FormatTokens.js";
