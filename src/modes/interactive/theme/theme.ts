// Theme - chủ đề màu của giao diện tương tác
// Bắt chước nguyên tắc pi-mono theme/theme.ts:
//   - Nạp theme JSON, phân giải tham chiếu biến (vars) và fallback token
//   - theme.fg(token, text) / theme.bg(token, text): tô màu theo token
//   - theme.style(text, { fg, bg, bold, italic, ... }): tô kiểu kết hợp
//   - getThinkingBorderColor(level) / getBashModeBorderColor()
//   - parseColor/colorToHex/mixColors lấy từ tầng core
//   - appearance: "dark" | "light" để suy ra màu theo nền
// Port sang TSX riêng, khong copy code truc iep.

import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import {
  backgroundAnsi,
  type Color,
  colorToHex,
  colorToOklch,
  foregroundAnsi,
  getTerminalColorMode,
  mixColors,
  parseColor,
  type RgbColor,
  type TerminalColorMode,
  type TextAttributes,
} from "../../../tui/ink/core/index.js";
import {
  type ResolvedThemeColorValues,
  type ThemeBg,
  type ThemeColor,
  type ThemeColorValues,
  type ThemeToken,
  THEME_TOKENS,
  withThemeTokenFallbacks,
} from "./theme-tokens.js";

export type TerminalTheme = "dark" | "light";
export type ThemeAppearance = TerminalTheme;
export type ThemeColorValue = string | number;

export interface ThemeJson {
  $schema?: string;
  name: string;
  appearance?: ThemeAppearance;
  vars?: Record<string, ThemeColorValue>;
  colors: Record<string, ThemeColorValue>;
}

export interface ThemeStyle extends TextAttributes {
  fg?: ThemeColor | Color;
  bg?: ThemeBg | Color;
}

const GUESSED_DEFAULTS: Record<ThemeAppearance, { foreground: Color; background: Color }> = {
  dark: { foreground: parseColor("#e5e5e7"), background: parseColor("#000000") },
  light: { foreground: parseColor("#000000"), background: parseColor("#ffffff") },
};

/** Giải tham chiếu biến trong giá trị màu, phát hiện vòng lặp. */
function resolveVarRefs(
  value: ThemeColorValue,
  vars: Record<string, ThemeColorValue>,
  visited = new Set<string>(),
): ThemeColorValue {
  if (typeof value === "number" || value === "" || value.startsWith("#") || /^ok(lch|hsl)\(/i.test(value)) {
    return value;
  }
  if (visited.has(value)) throw new Error(`Tham chiếu biến vòng lặp: ${value}`);
  if (!(value in vars)) throw new Error(`Không tìm thấy biến: ${value}`);
  visited.add(value);
  return resolveVarRefs(vars[value]!, vars, visited);
}

function resolveColors<T extends Record<string, ThemeColorValue>>(
  colors: T,
  vars: Record<string, ThemeColorValue> = {},
): Record<keyof T, ThemeColorValue> {
  const resolved: Record<string, ThemeColorValue> = {};
  for (const [key, value] of Object.entries(colors)) resolved[key] = resolveVarRefs(value, vars);
  return resolved as Record<keyof T, ThemeColorValue>;
}

function averageLightness(colors: Color[]): number | undefined {
  const fixed = colors.filter((c) => c.kind !== "indexed" || c.index >= 16);
  if (fixed.length === 0) return undefined;
  return fixed.reduce((sum, c) => sum + colorToOklch(c).l, 0) / fixed.length;
}

/** Suy ra nền của chủ đề từ độ sáng của các màu nó định nghĩa. */
function detectAppearance(foregrounds: Color[], backgrounds: Color[]): ThemeAppearance | undefined {
  const fg = averageLightness(foregrounds);
  const bg = averageLightness(backgrounds);
  if (fg !== undefined && bg !== undefined) return bg < fg ? "dark" : "light";
  if (bg !== undefined) return bg < 0.5 ? "dark" : "light";
  if (fg !== undefined) return fg > 0.5 ? "dark" : "light";
  return undefined;
}

/** Màu mặc định đoán khi terminal không báo cáo. */
function guessDefaultColors(appearance: ThemeAppearance): { foreground: Color; background: Color } {
  return GUESSED_DEFAULTS[appearance];
}

/** Chủ đề: giữ bản đồ token -> escape màu đã tính sẵn. */
export class Theme {
  readonly name: string;
  readonly appearance: ThemeAppearance;
  private readonly tokenValues: ResolvedThemeColorValues<ThemeColorValue>;
  private readonly colorMode: TerminalColorMode;
  private readonly fgAnsi: Record<ThemeToken, string>;
  private readonly bgAnsi: Record<ThemeToken, string>;

  constructor(json: ThemeJson, colorMode: TerminalColorMode = getTerminalColorMode()) {
    this.name = json.name;
    this.colorMode = colorMode;
    const resolved = resolveColors(json.colors, json.vars ?? {}) as ThemeColorValues<ThemeColorValue>;
    this.tokenValues = withThemeTokenFallbacks(resolved);

    const fgs: Color[] = [];
    const bgs: Color[] = [];
    this.fgAnsi = {} as Record<ThemeToken, string>;
    this.bgAnsi = {} as Record<ThemeToken, string>;

    for (const token of Object.keys(THEME_TOKENS) as ThemeToken[]) {
      const slot = THEME_TOKENS[token].slot;
      const raw = this.tokenValues[token];
      const color: Color =
        raw === "" ? guessDefaultColors(json.appearance ?? "dark").foreground : parseColor(raw);
      if (slot === "foreground") {
        fgs.push(color);
        this.fgAnsi[token] = foregroundAnsi(color, colorMode);
      } else {
        bgs.push(color);
        this.bgAnsi[token] = backgroundAnsi(color, colorMode);
      }
    }

    this.appearance = json.appearance ?? detectAppearance(fgs, bgs) ?? "dark";
  }

  /** Tô màu tiền cảnh theo token. */
  fg(token: ThemeColor, text: string): string {
    const ansi = this.fgAnsi[token];
    return ansi ? `${ansi}${text}\x1b[39m` : text;
  }

  /** Tô màu nền theo token. */
  bg(token: ThemeBg, text: string): string {
    const ansi = this.bgAnsi[token];
    return ansi ? `${ansi}${text}\x1b[49m` : text;
  }

  /** Tô kiểu kết hợp: màu, nền, thuộc tính chữ. */
  style(text: string, style: ThemeStyle): string {
    const fgAnsi = style.fg === undefined ? undefined : this.resolveFg(style.fg);
    const bgAnsi = style.bg === undefined ? undefined : this.resolveBg(style.bg);
    const attrs: TextAttributes = {
      bold: style.bold,
      dim: style.dim,
      italic: style.italic,
      underline: style.underline,
      inverse: style.inverse,
      strikethrough: style.strikethrough,
    };
    // ghép escape theo thứ tự đóng ngược
    let prefix = "";
    let suffix = "";
    if (fgAnsi) {
      prefix += fgAnsi;
      suffix = "\x1b[39m";
    }
    if (bgAnsi) {
      prefix += bgAnsi;
      suffix = `\x1b[49m${suffix}`;
    }
    if (attrs.bold) prefix += "\x1b[1m";
    if (attrs.dim) prefix += "\x1b[2m";
    if (attrs.bold || attrs.dim) suffix = `\x1b[22m${suffix}`;
    if (attrs.italic) {
      prefix += "\x1b[3m";
      suffix = `\x1b[23m${suffix}`;
    }
    if (attrs.underline) {
      prefix += "\x1b[4m";
      suffix = `\x1b[24m${suffix}`;
    }
    if (attrs.inverse) {
      prefix += "\x1b[7m";
      suffix = `\x1b[27m${suffix}`;
    }
    if (attrs.strikethrough) {
      prefix += "\x1b[9m";
      suffix = `\x1b[29m${suffix}`;
    }
    return `${prefix}${text}${suffix}`;
  }

  private resolveFg(token: ThemeColor | Color): string {
    if (typeof token !== "string") return foregroundAnsi(token, this.colorMode);
    return this.fgAnsi[token];
  }

  private resolveBg(token: ThemeBg | Color): string {
    if (typeof token !== "string") return backgroundAnsi(token, this.colorMode);
    return this.bgAnsi[token];
  }

  /** Mã hex của một token, để xuất HTML. */
  colorToHex(token: ThemeToken): string {
    const raw = this.tokenValues[token];
    if (raw === "") return "#000000";
    return colorToHex(parseColor(raw));
  }

  // In đám phụ: các phương thức style.
  bold(text: string): string {
    return `\x1b[1m${text}\x1b[22m`;
  }

  /** In nghiêng đoạn văn bản. */
  italic(text: string): string {
    return `\x1b[3m${text}\x1b[23m`;
  }

  /** Gạch chân đoạn văn bản. */
  underline(text: string): string {
    return `\x1b[4m${text}\x1b[24m`;
  }

  /** Gạch ngang đoạn văn bản. */
  strikethrough(text: string): string {
    return `\x1b[9m${text}\x1b[29m`;
  }

  /** Video ngược đoạn văn bản. */
  inverse(text: string): string {
    return `\x1b[7m${text}\x1b[27m`;
  }

  /** Làm mờ đoạn văn bản. */
  dim(text: string): string {
    return `\x1b[2m${text}\x1b[22m`;
  }

  /** Màu viền editor theo cấp độ suy nghĩ. */
  getThinkingBorderColor(level: string): (text: string) => string {
    const token = (["off", "minimal", "low", "medium", "high", "xhigh", "max"] as const).includes(level as never)
      ? (`thinking${level.charAt(0).toUpperCase()}${level.slice(1)}` as ThemeColor)
      : "thinkingOff";
    return (text: string) => this.fg(token, text);
  }

  /** Màu viền editor ở chế độ bash. */
  getBashModeBorderColor(): (text: string) => string {
    return (text: string) => this.fg("bashMode", text);
  }

  /** Giá trị màu chữ thật của một token. */
  getColor(token: ThemeToken): Color {
    const raw = this.tokenValues[token];
    return raw === "" ? guessDefaultColors(this.appearance).foreground : parseColor(raw);
  }

  getColorMode(): TerminalColorMode {
    return this.colorMode;
  }
}

/** Nạp theme từ file JSON. */
export function loadThemeFromFile(path: string): Theme {
  const json = JSON.parse(readFileSync(path, "utf8")) as ThemeJson;
  return new Theme(json);
}

/** Nạp theme có sẵn theo tên (dark/light). */
export function loadBuiltinTheme(name: string): Theme {
  const base = dirname(dirname(join(process.cwd(), "src", "modes", "interactive")));
  const file = name === "light" ? "light.json" : "dark.json";
  return loadThemeFromFile(resolve(base, "theme", file));
}

// ============================================================================
// Theme toàn cục cho phiên làm việc hiện tại
// ============================================================================

let activeTheme: Theme | undefined;

export function setTheme(themeInstance: Theme | undefined): void {
  activeTheme = themeInstance;
}

/** Đặt chủ đề và trả lại nó (tiện chuân hóa). */
export function setThemeInstance(instance: Theme): Theme {
  activeTheme = instance;
  return instance;
}

export function getTheme(): Theme {
  if (!activeTheme) activeTheme = loadBuiltinTheme("dark");
  return activeTheme;
}

export { mixColors, parseColor, colorToHex, colorToOklch };
export type { RgbColor, Color, TerminalColorMode, ThemeToken, ThemeColor, ThemeBg };
