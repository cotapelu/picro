import * as fs from 'fs';
import * as path from 'path';
import { adaptThemeToTerminal } from './color-fallback';

/**
 * Semantic color roles
 */
export interface Theme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  success: string;
  warning: string;
  error: string;
  border: string;
  selected: string;
  highlighted: string;
  dim: string;
}

/**
 * Default dark theme
 */
export const darkTheme: Theme = {
  primary: '\x1b[38;5;111m', // purple
  secondary: '\x1b[38;5;109m', // gray
  accent: '\x1b[38;5;221m', // yellow
  background: '\x1b[48;5;235m', // dark gray
  foreground: '\x1b[38;5;255m', // white
  success: '\x1b[38;5;84m', // green
  warning: '\x1b[38;5;214m', // orange
  error: '\x1b[38;5;203m', // red
  border: '\x1b[38;5;239m', // dark border
  selected: '\x1b[48;5;24m', // dark blue bg
  highlighted: '\x1b[48;5;237m', // slightly lighter bg
  dim: '\x1b[38;5;240m', // dim text
};

/**
 * Light theme
 */
export const lightTheme: Theme = {
  primary: '\x1b[38;5;25m',
  secondary: '\x1b[38;5;60m',
  accent: '\x1b[38;5;178m',
  background: '\x1b[48;5;255m',
  foreground: '\x1b[38;5;16m',
  success: '\x1b[38;5;34m',
  warning: '\x1b[38;5;202m',
  error: '\x1b[38;5;196m',
  border: '\x1b[38;5;188m',
  selected: '\x1b[48;5;189m',
  highlighted: '\x1b[48;5;254m',
  dim: '\x1b[38;5;145m',
};

/**
 * High contrast theme
 */
export const highContrastTheme: Theme = {
  primary: '\x1b[38;5;15m\x1b[1m',
  secondary: '\x1b[38;5;15m',
  accent: '\x1b[38;5;11m',
  background: '\x1b[48;5;0m',
  foreground: '\x1b[38;5;15m',
  success: '\x1b[38;5;84m',
  warning: '\x1b[38;5;214m',
  error: '\x1b[38;5;203m',
  border: '\x1b[38;5;15m',
  selected: '\x1b[48;5;60m\x1b[38;5;15m',
  highlighted: '\x1b[48;5;8m',
  dim: '\x1b[38;5;8m',
};

/**
 * Theme manager singleton
 */
export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: Theme = darkTheme;
  private listeners: Set<(theme: Theme) => void> = new Set();
  private palettes = new Map<string, Theme>();
  private configPath: string;
  private watcher?: fs.FSWatcher;
  private trueColor = true;
  private has256Color = true;

  private constructor() {
    this.configPath = path.join(process.env.HOME || process.env.USERPROFILE || '', '.config', 'picro', 'tui', 'theme.json');
    // Register built-in palettes
    this.palettes.set('dark', darkTheme);
    this.palettes.set('light', lightTheme);
    this.palettes.set('high-contrast', highContrastTheme);
    this.loadFromFile();
    // Start file watcher for live reload
    try {
      if (fs.existsSync(this.configPath)) {
        this.watcher = fs.watch(this.configPath, () => {
          this.loadFromFile();
        });
      }
    } catch {
      // ignore watcher errors
    }
  }

  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /** Set terminal color capabilities */
  setTerminalCapabilities(trueColor: boolean, has256Color?: boolean): void {
    this.trueColor = trueColor;
    this.has256Color = has256Color ?? true;
    this.notifyListeners();
  }

  /**
   * Get current theme (adapted to terminal capabilities)
   */
  getTheme(): Theme {
    if (this.trueColor) {
      return this.currentTheme;
    }
    return adaptThemeToTerminal(this.currentTheme, this.trueColor, this.has256Color);
  }

  /**
   * Set theme (by name: 'dark', 'light', 'high-contrast', or custom object)
   */
  setTheme(theme: string | Partial<Theme>): void {
    let newTheme: Theme;

    if (typeof theme === 'string') {
      const palette = this.palettes.get(theme);
      if (palette) {
        newTheme = palette;
      } else {
        console.warn(`Unknown theme: ${theme}, falling back to dark`);
        newTheme = darkTheme;
      }
    } else {
      // Merge with current to preserve unprovided roles
      newTheme = { ...this.currentTheme, ...theme };
    }

    this.currentTheme = newTheme;
    this.saveToFile();
    this.notifyListeners();
  }

  /**
   * Subscribe to theme changes
   */
  onChange(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Register a custom color palette */
  registerPalette(name: string, theme: Theme): void {
    this.palettes.set(name, theme);
  }

  /** Get a registered palette by name */
  getPalette(name: string): Theme | undefined {
    return this.palettes.get(name);
  }

  /**
   * Apply theme to text (foreground)
   */
  fg(role: keyof Theme, text: string): string {
    const ansi = this.currentTheme[role];
    if (!ansi) return text;
    return ansi + text + '\x1b[0m';
  }

  /**
   * Apply theme to text (background)
   */
  bg(role: keyof Theme, text: string): string {
    // Extract background codes: for now just replace 3[89] with 4[89] in the ansi sequence
    const fgAnsi = this.currentTheme[role];
    if (!fgAnsi) return text;
    // Convert SGR 30-37 (fg) to 40-47 (bg) for simple 8-color codes.
    // For 256-color codes, we assume format \x1b[38;5;Xm for fg -> \x1b[48;5;Xm for bg.
    const bgAnsi = fgAnsi.replace(/\[38;5;(\d+)m/g, '\x1b[48;5;$1m').replace(/\[38;2;(\d+);(\d+);(\d+)m/g, '\x1b[48;2;$1;$2;$3m');
    return bgAnsi + text + '\x1b[0m';
  }

  private loadFromFile(): void {
    try {
      if (!fs.existsSync(this.configPath)) return;
      const data = fs.readFileSync(this.configPath, 'utf8');
      const json = JSON.parse(data);
      if (json.theme) {
        this.setTheme(json.theme);
      }
    } catch (e) {
      // ignore
    }
  }

  private saveToFile(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify({ theme: this.currentTheme }), 'utf8');
    } catch (e) {
      // ignore
    }
  }

  private notifyListeners(): void {
    for (const l of this.listeners) {
      try {
        l(this.currentTheme);
      } catch {
        // ignore
      }
    }
  }

  stopThemeWatcher(): void {
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch {
        // ignore
      }
      this.watcher = undefined;
    }
  }
}

// Convenience singleton access
export const themeManager = ThemeManager.getInstance();
