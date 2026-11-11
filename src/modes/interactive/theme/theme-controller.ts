// ThemeController - áp chủ đề và giữ nó đồng bộ với terminal
// Bắt chước nguyên tắc pi-mono theme/theme-controller.ts:
//   - Áp chủ đề ngay; màu terminal cập nhật chủ đề khi chúng đến
//   - Chủ đề hệ thống render xám tới khi nhận được màu terminal
//   - waitForTerminalColors(): chờ truy vấn màu xong (hoặc timeout)
//   - setThemeName/setThemeSetting: đổi chủ đề theo tên hoặc chuỗi cài đặt
//   - parseAutoThemeSetting: "auto"/"system" nghĩa là theo terminal
// Port sang TSX riêng, khon copy code truc iep.

import type { RgbColor, TerminalColors } from "../../../tui/ink/core/index.js";
import { Theme, setThemeInstance, setTheme, loadBuiltinTheme } from "./theme.js";
import { SYSTEM_THEME_NAME, generateSystemThemeColors, terminalAppearance } from "./system-theme.js";
import { resolveColorValue, setThemeJsonValidator, validateThemeJson, type ThemeJsonInput } from "./theme-schema.js";
import { THEME_TOKENS, withThemeTokenFallbacks } from "./theme-tokens.js";
import type { ThemeColorValue } from "./theme-tokens.js";

export type ThemeResult = { success: boolean; error?: string };
type TerminalTheme = "dark" | "light";

/** Chủ đề hệ thống giữ xám trong bao lâu trước khi rơi về chỉ mục bảng. */
const TERMINAL_QUERY_TIMEOUT_MS = 100;

/** Đọc cài đặt "auto"/"system" -> true nếu là chế độ tự động. */
export function parseAutoThemeSetting(setting: string | undefined): boolean {
  if (!setting) return false;
  const value = setting.toLowerCase();
  return value === "auto" || value === SYSTEM_THEME_NAME;
}

/** Ghép appearance vào tên chủ đề: "auto:dark". */
export function resolveThemeSetting(setting: string | undefined, appearance: TerminalTheme): string {
  if (!setting) return appearance;
  const [name, suffix] = setting.split(":", 2);
  if (suffix !== undefined) return setting;
  return `${name}:${appearance}`;
}

/** Giao diện cần có của controller. */
export interface ThemeTerminal {
  queryTerminalColors(options: {
    timeoutMs: number;
    onLateReply?: (colors: TerminalColors) => void;
  }): Promise<TerminalColors>;
  setTerminalColorSchemeNotifications(enabled: boolean): void;
  onTerminalColorSchemeChange(listener: (scheme: TerminalTheme) => void): () => void;
  invalidate(): void;
  requestRender(): void;
}

export interface InteractiveThemeControllerOptions {
  getSettingsManager: () => { getThemeSetting?: () => string | undefined };
  showError: (message: string) => void;
  onChanged: () => void;
  initialThemeSetting?: string;
  /** Chủ đề người dùng nạp từ tệp (tên -> JSON). */
  loadUserTheme?: (name: string) => ThemeJsonInput | undefined;
}

function sameRgb(a: RgbColor | undefined, b: RgbColor | undefined): boolean {
  return a === b || (a !== undefined && b !== undefined && a.r === b.r && a.g === b.g && a.b === b.b);
}

function sameColors(a: TerminalColors, b: TerminalColors): boolean {
  if (!sameRgb(a.foreground, b.foreground) || !sameRgb(a.background, b.background)) return false;
  if (a.palette === b.palette) return true;
  if (!a.palette || !b.palette || a.palette.length !== b.palette.length) return false;
  return a.palette.every((color, i) => sameRgb(color, b.palette?.[i]));
}

/**
 * Áp chủ đề và giữ đồng bộ với terminal.
 * Chủ đề áp ngay lập tức; màu terminal cập nhật nó khi đến.
 */
export class InteractiveThemeController {
  private readonly ui: ThemeTerminal;
  private readonly options: InteractiveThemeControllerOptions;
  private currentThemeSetting: string | undefined;
  private terminalColors: TerminalColors | undefined;
  private activeThemeName: string | undefined;
  private autoSyncEnabled = false;
  private schemeUnsubscribe: (() => void) | undefined;
  private terminalQuery: Promise<void> = Promise.resolve();

  constructor(ui: ThemeTerminal, options: InteractiveThemeControllerOptions) {
    this.ui = ui;
    this.options = options;
    this.currentThemeSetting = options.initialThemeSetting;
    this.activeThemeName = this.resolveThemeName();
    this.bindSchemeListener();
  }

  private bindSchemeListener(): void {
    this.schemeUnsubscribe?.();
    this.schemeUnsubscribe = this.ui.onTerminalColorSchemeChange((scheme) => {
      // Chủ đề auto theo dõi sáng/tối; đổi thì áp lại.
      if (parseAutoThemeSetting(this.currentThemeSetting)) {
        const setting = `${SYSTEM_THEME_NAME}:${scheme}`;
        this.applyThemeSetting(setting);
      }
    });
    this.ui.setTerminalColorSchemeNotifications(this.autoSyncEnabled);
  }

  /** Gọi lại khi renderer bị thay (đổi chế độ giao diện). */
  rebindUi(ui: ThemeTerminal): void {
    (this as unknown as { ui: ThemeTerminal }).ui = ui;
    this.bindSchemeListener();
  }

  /** Áp chủ đề từ cài đặt và hỏi màu terminal. */
  applyFromSettings(): void {
    const setting = this.getThemeSetting();
    const name = this.resolveThemeName();
    this.setAutoSync(parseAutoThemeSetting(setting) || name === SYSTEM_THEME_NAME);
    this.applyThemeName(name, setting !== undefined);
    this.queryTerminalColors();
  }

  /** Chờ truy vấn màu xong hoặc timeout. */
  waitForTerminalColors(): Promise<void> {
    return this.terminalQuery;
  }

  /** Chuỗi chủ đề đang chọn. */
  getThemeSelection(): string | undefined {
    return this.currentThemeSetting ?? this.options.getSettingsManager().getThemeSetting?.() ?? this.activeThemeName;
  }

  setThemeName(themeName: string, showError = false): ThemeResult {
    this.setAutoSync(themeName === SYSTEM_THEME_NAME);
    const result = this.applyThemeName(themeName, showError);
    if (result.success) this.currentThemeSetting = themeName;
    return result;
  }

  setThemeSetting(themeSetting: string): void {
    this.currentThemeSetting = themeSetting;
    this.applyFromSettings();
  }

  private setAutoSync(enabled: boolean): void {
    if (this.autoSyncEnabled === enabled) return;
    this.autoSyncEnabled = enabled;
    this.ui.setTerminalColorSchemeNotifications(enabled);
  }

  private getThemeSetting(): string | undefined {
    return this.currentThemeSetting ?? this.options.getSettingsManager().getThemeSetting?.();
  }

  private resolveThemeName(): string {
    const setting = this.getThemeSetting();
    if (!setting) return "dark";
    const [name] = setting.split(":", 2);
    return name || "dark";
  }

  private applyThemeName(name: string, showError: boolean): ThemeResult {
    try {
      if (name === SYSTEM_THEME_NAME) {
        setTheme(buildSystemTheme(this.terminalColors ?? {}));
      } else {
        const userTheme = this.options.loadUserTheme?.(name);
        if (userTheme) {
          setTheme(themeFromJson(userTheme));
        } else {
          setTheme(loadBuiltinTheme(name));
        }
      }
      this.activeThemeName = name;
      this.options.onChanged();
      return { success: true };
    } catch (error) {
      if (showError) {
        this.options.showError(error instanceof Error ? error.message : String(error));
      }
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private applyThemeSetting(setting: string): void {
    this.currentThemeSetting = setting;
    this.applyFromSettings();
  }

  /** Hỏi màu terminal và áp khi có. */
  queryTerminalColors(): void {
    const query = this.ui
      .queryTerminalColors({ timeoutMs: TERMINAL_QUERY_TIMEOUT_MS, onLateReply: (colors) => this.applyTerminalColors(colors) })
      .then((colors) => this.applyTerminalColors(colors))
      .catch(() => {
        // Coi như terminal không báo màu.
      });
    this.terminalQuery = query;
  }

  private applyTerminalColors(colors: TerminalColors): void {
    if (this.terminalColors && sameColors(this.terminalColors, colors)) return;
    this.terminalColors = colors;
    if (this.activeThemeName === SYSTEM_THEME_NAME || parseAutoThemeSetting(this.currentThemeSetting)) {
      setTheme(buildSystemTheme(colors));
      this.options.onChanged();
    }
  }
}

/** Dựng Theme hệ thống từ màu terminal. */
function buildSystemTheme(colors: TerminalColors): Theme {
  const appearance = terminalAppearance(colors);
  const generated = generateSystemThemeColors(colors);
  const merged: Record<string, ThemeColorValue> = {};
  for (const token of Object.keys(THEME_TOKENS)) {
    merged[token] = generated[token] ?? "";
  }
  const json: ThemeJsonInput = {
    name: SYSTEM_THEME_NAME,
    appearance,
    colors: merged as unknown as ThemeJsonInput["colors"],
  };
  return themeFromJson(json);
}

/** Dựng Theme từ JSON đã xác thực. */
function themeFromJson(json: ThemeJsonInput): Theme {
  const validated = validateThemeJson(json.name, json);
  const vars = validated.vars ?? {};
  const colors: Record<string, ThemeColorValue> = {};
  for (const [key, value] of Object.entries(validated.colors)) {
    colors[key] = resolveColorValue(value, vars);
  }
  const themeJson = {
    name: validated.name,
    appearance: validated.appearance,
    colors: colors as unknown as ThemeJsonInput["colors"],
  };
  return setThemeInstance(new Theme(themeJson));
}

export { SYSTEM_THEME_NAME };
void resolveThemeSetting;
