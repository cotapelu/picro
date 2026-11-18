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
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  backgroundAnsi,
  type Color,
  colorToHex,
  colorToOklch,
  foregroundAnsi,
  getTerminalColorMode,
  indexedColor,
  mixColors,
  parseColor,
  type RgbColor,
  type TerminalColorMode,
  type TextAttributes,
} from "../core/index.js";
import {
  type ResolvedThemeColorValues,
  type ThemeColorValue,
  type ThemeBg,
  type ThemeColor,
  type ThemeColorValues,
  type ThemeToken,
  THEME_TOKENS,
  withThemeTokenFallbacks,
} from "./theme-tokens.js";

export type TerminalTheme = "dark" | "light";
export type ThemeAppearance = TerminalTheme;
export interface ThemeJson {
  $schema?: string;
  name: string;
  appearance?: ThemeAppearance;
  vars?: Record<string, ThemeColorValue>;
  colors: Record<string, ThemeColorValue>;
  export?: Record<string, ThemeColorValue>;
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

  /** Tất cả màu token đã phân giải. */
  get colors(): ResolvedThemeColorValues<Color> {
    const result: Record<ThemeToken, Color> = {} as Record<ThemeToken, Color>;
    for (const token of Object.keys(this.tokenValues) as ThemeToken[]) {
      const raw = this.tokenValues[token];
      result[token] = raw === "" ? guessDefaultColors(this.appearance).foreground : parseColor(raw);
    }
    return result;
  }
}

/**
 * Directory of this module, so the built-in themes resolve next to it.
 *
 * The previous implementation derived the path from process.cwd() and the
 * SOURCE layout ("<cwd>/src/modes/interactive/../theme"), which resolved to
 * "src/theme/dark.json" - a directory that does not exist - so
 * loadBuiltinTheme() threw ENOENT and getTheme() crashed on its first call
 * whenever no theme had been set. Deriving it from import.meta.url works both
 * from the TypeScript sources and from the compiled dist/ output.
 */
const THEME_DIR = dirname(fileURLToPath(import.meta.url));

/** Nạp theme từ file JSON. */
export function loadThemeFromFile(path: string): Theme {
  const json = JSON.parse(readFileSync(path, "utf8")) as ThemeJson;
  return new Theme(json);
}

/** Nạp theme có sẵn theo tên (dark/light). */
export function loadBuiltinTheme(name: string): Theme {
  const file = name === "light" ? "light.json" : "dark.json";
  return loadThemeFromFile(resolve(THEME_DIR, file));
}

/** Nạp theme JSON từ file bất kỳ (dùng cho theme người dùng). */
function loadThemeJson(name: string): ThemeJson {
  // Thử load từ file theme của người dùng
  const customPath = resolve(THEME_DIR, "..", "..", "..", "themes", `${name}.json`);
  try {
    return JSON.parse(readFileSync(customPath, "utf8")) as ThemeJson;
  } catch {
    // Fallback về built-in
    const file = name === "light" ? "light.json" : "dark.json";
    return JSON.parse(readFileSync(resolve(THEME_DIR, file), "utf8")) as ThemeJson;
  }
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

// ============================================================================
// TUI Helpers - mapping tokens cho các thành phần giao diện
// ============================================================================

import hljs from "highlight.js";
import { isSupportedLanguage, getHighlightLanguageCount } from "../core/syntax-highlight.js";

/** Theme mapping cho Markdown renderer. */
export function getMarkdownTheme(): MarkdownTheme {
  const t = getTheme();
  return {
    heading: (text: string) => t.fg("mdHeading", text),
    link: (text: string) => t.fg("mdLink", text),
    linkUrl: (text: string) => t.fg("mdLinkUrl", text),
    code: (text: string) => t.fg("mdCode", text),
    codeBlock: (text: string) => t.fg("mdCodeBlock", text),
    codeBlockBorder: (text: string) => t.fg("mdCodeBlockBorder", text),
    quote: (text: string) => t.fg("mdQuote", text),
    quoteBorder: (text: string) => t.fg("mdQuoteBorder", text),
    hr: (text: string) => t.fg("mdHr", text),
    listBullet: (text: string) => t.fg("mdListBullet", text),
    bold: (text: string) => t.bold(text),
    italic: (text: string) => t.italic(text),
    underline: (text: string) => t.underline(text),
    strikethrough: (text: string) => t.strikethrough(text),
    highlightCode,
  };
}

/** Theme mapping cho SelectList. */
export function getSelectListTheme(): SelectListTheme {
  const t = getTheme();
  return {
    selectedPrefix: (text: string) => t.fg("accent", text),
    selectedText: (text: string) => t.fg("accent", text),
    description: (text: string) => t.fg("muted", text),
    scrollInfo: (text: string) => t.fg("muted", text),
    noMatch: (text: string) => t.fg("muted", text),
  };
}

/** Theme mapping cho Editor. */
export function getEditorTheme(): EditorTheme {
  const t = getTheme();
  return {
    borderColor: (text: string) => t.fg("borderMuted", text),
    selectList: getSelectListTheme(),
  };
}

/** Theme mapping cho SettingsList. */
export function getSettingsListTheme(): SettingsListTheme {
  const t = getTheme();
  return {
    label: (text: string, selected: boolean) => (selected ? t.fg("accent", text) : text),
    value: (text: string, selected: boolean) => (selected ? t.fg("accent", text) : t.fg("muted", text)),
    description: (text: string) => t.fg("dim", text),
    cursor: t.fg("accent", "→ "),
    hint: (text: string) => t.fg("dim", text),
  };
}

/** Highlight code với highlight.js, sử dụng token màu của theme. */
export function highlightCode(code: string, lang?: string): string[] {
  const t = getTheme();
  const validLang = lang && isSupportedLanguage(lang) ? lang : undefined;
  if (!validLang) {
    return code.split("\n").map((line) => t.fg("mdCodeBlock", line));
  }
  const opts = {
    language: validLang,
    ignoreIllegals: true,
    theme: {
      keyword: (s: string) => t.fg("syntaxKeyword", s),
      built_in: (s: string) => t.fg("syntaxType", s),
      literal: (s: string) => t.fg("syntaxNumber", s),
      number: (s: string) => t.fg("syntaxNumber", s),
      regexp: (s: string) => t.fg("syntaxString", s),
      string: (s: string) => t.fg("syntaxString", s),
      subst: (s: string) => t.fg("text", s),
      comment: (s: string) => t.fg("syntaxComment", s),
      doctag: (s: string) => t.fg("syntaxComment", s),
      meta: (s: string) => t.fg("muted", s),
      function: (s: string) => t.fg("syntaxFunction", s),
      title: (s: string) => t.fg("syntaxFunction", s),
      class: (s: string) => t.fg("syntaxType", s),
      type: (s: string) => t.fg("syntaxType", s),
      tag: (s: string) => t.fg("syntaxPunctuation", s),
      name: (s: string) => t.fg("syntaxKeyword", s),
      attr: (s: string) => t.fg("syntaxVariable", s),
      variable: (s: string) => t.fg("syntaxVariable", s),
      params: (s: string) => t.fg("syntaxVariable", s),
      operator: (s: string) => t.fg("syntaxOperator", s),
      punctuation: (s: string) => t.fg("syntaxPunctuation", s),
      emphasis: (s: string) => t.italic(s),
      strong: (s: string) => t.bold(s),
      link: (s: string) => t.underline(s),
      addition: (s: string) => t.fg("toolDiffAdded", s),
      deletion: (s: string) => t.fg("toolDiffRemoved", s),
    },
  };
  try {
    return hljs.highlight(code, opts).value.split("\n");
  } catch {
    return code.split("\n").map((line) => t.fg("mdCodeBlock", line));
  }
}

/**
 * Highlighter per-owner để cache kết quả tô sáng.
 * Mỗi owner (vd mỗi tool result) giữ cache riêng, sống đúng bằng tuổi của code.
 */
export class CodeHighlighter {
  private last?: {
    code: string;
    lang: string | undefined;
    theme: Theme | undefined;
    languageCount: number;
    lines: readonly string[];
  };

  /** Như highlightCode nhưng cache kết quả theo owner. */
  highlight(code: string, lang: string | undefined): readonly string[] {
    const currentTheme = getTheme();
    const languageCount = getHighlightLanguageCount();
    const last = this.last;
    if (
      last?.code === code &&
      last.lang === lang &&
      last.theme === currentTheme &&
      last.languageCount === languageCount
    ) {
      return last.lines;
    }
    const lines = highlightCode(code, lang);
    this.last = { code, lang, theme: currentTheme, languageCount, lines };
    return lines;
  }
}

/** Lấy ngôn ngữ từ đuôi file. */
export function getLanguageFromPath(filePath: string): string | undefined {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!ext) return undefined;

  const extToLang: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    dart: "dart",
    groovy: "groovy",
    gradle: "groovy",
    nix: "nix",
    c: "c",
    h: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "fish",
    ps1: "powershell",
    sql: "sql",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    md: "markdown",
    markdown: "markdown",
    dockerfile: "dockerfile",
    makefile: "makefile",
    cmake: "cmake",
    lua: "lua",
    perl: "perl",
    r: "r",
    scala: "scala",
    clj: "clojure",
    ex: "elixir",
    exs: "elixir",
    erl: "erlang",
    hs: "haskell",
    ml: "ocaml",
    vim: "vim",
    graphql: "graphql",
    proto: "protobuf",
    tf: "hcl",
    hcl: "hcl",
  };

  return extToLang[ext];
}

/** Lấy theme màu dùng cho xuất HTML (CSS custom properties). */
export function getResolvedThemeColors(themeName?: string): Record<string, string> {
  const colors = loadBuiltinTheme(themeName ?? (getTheme() as unknown as Theme).name ?? "dark").colors;
  return Object.fromEntries(
    Object.entries(colors).map(([token, color]) => [token, colorToHex(color)]),
  );
}

/** Kiểm tra theme có phải light theme không (cho CSS light/dark variants). */
export function isLightTheme(themeName?: string): boolean {
  return loadBuiltinTheme(themeName ?? (getTheme() as unknown as Theme).name ?? "dark").appearance === "light";
}

/** Lấy màu xuất HTML từ theme JSON. */
export function getThemeExportColors(themeName?: string): {
  pageBg?: string;
  cardBg?: string;
  infoBg?: string;
} {
  const name = themeName ?? (getTheme() as unknown as Theme).name ?? "dark";
  if (name === "system") return {};
  try {
    const themeJson = loadThemeJson(name);
    const exportSection = themeJson.export;
    if (!exportSection) return {};

    const vars = themeJson.vars ?? {};
    const resolve = (value: ThemeColorValue | undefined): string | undefined => {
      if (value === undefined) return undefined;
      const resolved = resolveVarRefs(value, vars);
      if (typeof resolved === "number") return colorToHex(indexedColor(resolved));
      if (resolved === "") return undefined;
      if (/^okhsl\(/i.test(resolved)) return colorToHex(parseColor(resolved));
      return resolved;
    };

    return {
      pageBg: resolve(exportSection.pageBg),
      cardBg: resolve(exportSection.cardBg),
      infoBg: resolve(exportSection.infoBg),
    };
  } catch {
    return {};
  }
}

// ============================================================================
// Types for TUI Helpers
// ============================================================================

interface MarkdownTheme {
  heading: (text: string) => string;
  link: (text: string) => string;
  linkUrl: (text: string) => string;
  code: (text: string) => string;
  codeBlock: (text: string) => string;
  codeBlockBorder: (text: string) => string;
  quote: (text: string) => string;
  quoteBorder: (text: string) => string;
  hr: (text: string) => string;
  listBullet: (text: string) => string;
  bold: (text: string) => string;
  italic: (text: string) => string;
  underline: (text: string) => string;
  strikethrough: (text: string) => string;
  highlightCode: (code: string, lang?: string) => string[];
}

interface SelectListTheme {
  selectedPrefix: (text: string) => string;
  selectedText: (text: string) => string;
  description: (text: string) => string;
  scrollInfo: (text: string) => string;
  noMatch: (text: string) => string;
}

interface EditorTheme {
  borderColor: (text: string) => string;
  selectList: SelectListTheme;
}

interface SettingsListTheme {
  label: (text: string, selected: boolean) => string;
  value: (text: string, selected: boolean) => string;
  description: (text: string) => string;
  cursor: string;
  hint: (text: string) => string;
}

export { mixColors, parseColor, colorToHex, colorToOklch, resolveVarRefs, loadThemeJson };
export type { RgbColor, Color, TerminalColorMode, ThemeToken, ThemeColor, ThemeBg };

// Re-export helpers for convenience
export { indexedColor } from "../core/index.js";
export { isSupportedLanguage } from "../core/syntax-highlight.js";