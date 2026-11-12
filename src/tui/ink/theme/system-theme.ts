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
} from "../core/index.js";
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
  const clamped = Math.max(0, Math.min(1, amount));
  const channel = (x: number, y: number) => Math.round(x * (1 - clamped) + y * clamped);
  // colourToHex always yields an rgb colour for hex input, but stay defensive.
  const fr = (from as { r: number }).r ?? 0;
  const fg = (from as { g: number }).g ?? 0;
  const fb = (from as { b: number }).b ?? 0;
  const tr = (to as { r: number }).r ?? 0;
  const tg = (to as { g: number }).g ?? 0;
  const tb = (to as { b: number }).b ?? 0;
  return { kind: "rgb", r: channel(fr, tr), g: channel(fg, tg), b: channel(fb, tb) };
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
 *
 * Every token gets a real value. This used to compute accent/success/warning/
 * error/selectedBg/... and then discard all of them ("void x") while returning
 * an empty string for every token, so the system theme rendered every token with
 * the same guessed foreground colour: no colour differentiation anywhere, and
 * background tokens drew with the foreground colour.
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

  // Các mức mờ của chữ: pha nền vào chữ.
  const muted = blend(foreground, background, appearance === "dark" ? 0.35 : 0.3);
  const dim = blend(foreground, background, appearance === "dark" ? 0.55 : 0.5);
  // A lighter mix than `dim` so ordinary borders and very-dim text stay distinct.
  const border = blend(foreground, background, appearance === "dark" ? 0.45 : 0.4);
  const borderAccent = blend(accent, background, 0.25);
  const borderMuted = dim;

  // Hộp công cụ: nền pha rất nhẹ, chữ giữ màu chữ/thông tin.
  const toolBg = blend(background, foreground, appearance === "dark" ? 0.07 : 0.05);
  const thinkingText = blend(foreground, background, 0.25);

  const out: Record<string, ThemeColorValue> = {};
  for (const token of Object.keys(THEME_TOKENS)) {
    out[token] = "";
  }

  // foreground slots
  out.text = colorToHex(foreground);
  out.muted = colorToHex(muted);
  out.dim = colorToHex(dim);
  out.accent = colorToHex(accent);
  out.border = colorToHex(border);
  out.borderAccent = colorToHex(borderAccent);
  out.borderMuted = colorToHex(borderMuted);
  out.success = colorToHex(success);
  out.error = colorToHex(error);
  out.warning = colorToHex(warning);
  out.thinkingText = colorToHex(thinkingText);
  out.toolTitle = colorToHex(foreground);
  out.toolOutput = colorToHex(foreground);
  out.userMessageText = colorToHex(foreground);
  out.customMessageText = colorToHex(foreground);
  out.customMessageLabel = colorToHex(accent);
  out.bashMode = colorToHex(accent);
  out.mdHeading = colorToHex(accent);
  out.mdLink = colorToHex(accent);
  out.mdLinkUrl = colorToHex(dim);
  out.mdCode = colorToHex(foreground);
  out.mdCodeBlock = colorToHex(foreground);
  out.mdCodeBlockBorder = colorToHex(border);
  out.mdQuote = colorToHex(muted);
  out.mdQuoteBorder = colorToHex(border);
  out.mdHr = colorToHex(border);
  out.mdListBullet = colorToHex(accent);
  out.toolDiffAdded = colorToHex(success);
  out.toolDiffRemoved = colorToHex(error);
  out.toolDiffContext = colorToHex(muted);
  out.searchMatchText = colorToHex(foreground);

  // Tô sáng cú pháp: lấy từ bảng màu nếu có, không thì theo vai trò.
  const palette = colors.palette ?? [];
  const paletteAt = (i: number, fallback: Color): Color =>
    palette[i] ? ({ kind: "rgb", ...palette[i] } as Color) : fallback;
  out.syntaxComment = colorToHex(dim);
  out.syntaxKeyword = colorToHex(paletteAt(4, accent));
  out.syntaxFunction = colorToHex(paletteAt(5, accent));
  out.syntaxVariable = colorToHex(foreground);
  out.syntaxString = colorToHex(paletteAt(2, success));
  out.syntaxNumber = colorToHex(paletteAt(3, warning));
  out.syntaxType = colorToHex(paletteAt(6, accent));
  out.syntaxOperator = colorToHex(muted);
  out.syntaxPunctuation = colorToHex(muted);

  // Viền cấp độ suy nghĩ: nhấn dần theo mức.
  const thinkingRamp: TerminalTheme extends never ? never : Color[] = [dim, muted, accent, accent, success, warning, error];
  const thinkingTokens: Array<[string, Color]> = [
    ["thinkingOff", thinkingRamp[0]!],
    ["thinkingMinimal", thinkingRamp[1]!],
    ["thinkingLow", thinkingRamp[2]!],
    ["thinkingMedium", thinkingRamp[3]!],
    ["thinkingHigh", thinkingRamp[4]!],
    ["thinkingXhigh", thinkingRamp[5]!],
  ];
  for (const [token, color] of thinkingTokens) out[token] = colorToHex(color);

  // background slots
  out.selectedBg = colorToHex(selectedBg);
  out.userMessageBg = colorToHex(userMessageBg);
  out.customMessageBg = colorToHex(customMessageBg);
  out.toolPendingBg = colorToHex(toolBg);
  out.toolSuccessBg = colorToHex(toolBg);
  out.toolErrorBg = colorToHex(blend(toolBg, error, 0.2));

  return out;
}

export { SYSTEM_THEME_NAME as defaultThemeName };
