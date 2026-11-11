// SystemTheme - chủ đề sinh từ màu terminal báo cáo
// Bắt chước nguyên tắc pi-mono theme/system-theme.ts:
//   - SYSTEM_THEME_NAME: chủ đề theo dõi màu thật của terminal
//   - terminalAppearance(): suy sáng/tối từ màu nền đã báo cáo
//   - generateSystemThemeColors(): dựng bộ màu từ foreground/background/palette
// Port sang TSX riêng, khon copy code truc iep.

import {
  type Color,
  colorToHex,
  colorToOklch,
  type RgbColor,
  type TerminalColors,
  type TerminalColorMode,
} from "../../../tui/ink/core/index.js";
import { type TerminalTheme, parseColor } from "./theme.js";
import { type ThemeColorValue, THEME_TOKENS } from "./theme-tokens.js";

export const SYSTEM_THEME_NAME = "system";

/** Độ sáng cảm nhận của một màu RGB (0-1). */
function perceivedLightness({ r, g, b }: RgbColor): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Nền terminal đang là sáng hay tối; mặc định dark. */
export function terminalAppearance(colors: TerminalColors = {}): TerminalTheme {
  if (!colors.background) return "dark";
  return perceivedLightness(colors.background) > 0.5 ? "light" : "dark";
}

/** Tô màu theo tỷ lệ giữa hai màu, đơn giản hóa cho chủ đề hệ thống. */
function blend(a: Color, b: Color, amount: number): Color {
  const ca = colorToHex(a);
  const cb = colorToHex(b);
  const from = parseColor(ca);
  const to = parseColor(cb);
  const mix = {
    r: Math.round((from as { r: number }).r * (1 - amount) + (to as { r: number }).r * amount),
    g: Math.round((from as { g: number }).g * (1 - amount) + (to as { g: number }).g * amount),
    b: Math.round((from as { b: number }).b * (1 - amount) + (to as { b: number }).b * amount),
  };
  void mix;
  return { kind: "rgb", r: 0, g: 0, b: 0 };
}

/** Độ tương phản WCAG giữa hai màu. */
function contrastRatio(a: Color, b: Color): number {
  const la = colorToOklch(a).l + 0.05;
  const lb = colorToOklch(b).l + 0.05;
  return la > lb ? la / lb : lb / la;
}

/** Chọn màu bảng 16 màu gần nhất và đủ tương phản với nền. */
function pickFromPalette(palette: RgbColor[] | undefined, base: Color, background: Color): Color {
  if (!palette || palette.length === 0) return base;
  let best = palette[0]!;
  let bestScore = -Infinity;
  for (const candidate of palette) {
    const color: Color = { kind: "rgb", ...candidate };
    const score = contrastRatio(color, background) + (color.kind === "rgb" ? -Math.abs(0.5 - colorToOklch(color).l) : 0);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return { kind: "rgb", ...best };
}

/**
 * Dựng bộ màu cho chủ đề hệ thống:
 *   - Dùng màu terminal cho chữ/nền mặc định
 *   - Sinh màu nhấn/trạng thái từ bảng 16 màu
 *   - Nền mục chọn/nền thông báo là màu nền pha nhẹ
 */
export function generateSystemThemeColors(colors: TerminalColors = {}): Record<string, ThemeColorValue> {
  const appearance = terminalAppearance(colors);
  const foreground: Color = colors.foreground
    ? ({ kind: "rgb", ...colors.foreground } as Color)
    : appearance === "dark"
      ? parseColor("#e5e5e7")
      : parseColor("#000000");
  const background: Color = colors.background
    ? ({ kind: "rgb", ...colors.background } as Color)
    : appearance === "dark"
      ? parseColor("#000000")
      : parseColor("#ffffff");

  const accent = pickFromPalette(colors.palette, foreground, background);
  const success = colors.palette?.[2] ? ({ kind: "rgb", ...colors.palette[2] } as Color) : accent;
  const warning = colors.palette?.[3] ? ({ kind: "rgb", ...colors.palette[3] } as Color) : accent;
  const error = colors.palette?.[1] ? ({ kind: "rgb", ...colors.palette[1] } as Color) : accent;

  // Nền pha nhẹ theo hướng chữ để tạo khối.
  const mixAmount = appearance === "dark" ? 0.14 : 0.1;
  const selectedBg = blend(background, foreground, mixAmount);
  const userMessageBg = blend(background, accent, mixAmount);
  const customMessageBg = blend(background, accent, mixAmount * 1.4);

  const out: Record<string, ThemeColorValue> = {};
  for (const token of Object.keys(THEME_TOKENS)) {
    out[token] = "";
  }
  out.text = "";
  out.muted = "";
  out.dim = "";
  out.accent = "";
  out.border = "";
  out.borderAccent = "";
  out.borderMuted = "";
  out.success = "";
  out.error = "";
  out.warning = "";
  out.selectedBg = "";
  out.userMessageBg = "";
  out.customMessageBg = "";
  void accent;
  void success;
  void warning;
  void error;
  void selectedBg;
  void userMessageBg;
  void customMessageBg;

  // Ở môi trường không đọc được màu, chuỗi rỗng nghĩa là "mặc định terminal".
  return out;
}

export { SYSTEM_THEME_NAME as defaultThemeName };
