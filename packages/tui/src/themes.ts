/**
 * Theme presets for Terminal UI
 * Supports dark (default), light, and high-contrast themes
 */
import type { UITheme } from './tui.js';

// ANSI color codes
const colors = {
  // Standard colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  // Extended colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  // Backgrounds
  bgBlack: '\x1b[40m',
  bgWhite: '\x1b[47m',
  bgGray: '\x1b[100m',
};

/**
 * Dark theme (default) - easy on the eyes
 */
export const darkTheme: UITheme = {
  textColor: colors.white,
  bgColor: colors.black,
  borderColor: colors.gray,
  accentColor: colors.cyan,
  errorColor: colors.red,
  warningColor: colors.yellow,
  successColor: colors.green,
};

/**
 * Light theme - for bright environments
 */
export const lightTheme: UITheme = {
  textColor: colors.black,
  bgColor: colors.white,
  borderColor: colors.gray,
  accentColor: colors.blue,
  errorColor: colors.brightRed,
  warningColor: colors.brightYellow,
  successColor: colors.green,
};

/**
 * High contrast theme - accessibility focused
 */
export const highContrastTheme: UITheme = {
  textColor: colors.brightWhite,
  bgColor: colors.black,
  borderColor: colors.white,
  accentColor: colors.brightCyan,
  errorColor: colors.brightRed,
  warningColor: colors.brightYellow,
  successColor: colors.brightGreen,
};

// Complete theme interface with metadata
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: UITheme;
}

/**
 * Available theme presets
 */
export const themePresets: ThemePreset[] = [
  {
    id: 'dark',
    name: 'Dark',
    description: 'Default dark theme - easy on the eyes',
    theme: darkTheme,
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Light theme for bright environments',
    theme: lightTheme,
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'High contrast theme for accessibility',
    theme: highContrastTheme,
  },
];

/**
 * Get theme by ID
 */
export function getThemeById(id: string): UITheme {
  const preset = themePresets.find(t => t.id === id);
  return preset?.theme ?? darkTheme;
}

/**
 * Theme manager for runtime theme switching
 */
export class ThemeManager {
  private currentThemeId: string = 'dark';
  private customThemes: Map<string, UITheme> = new Map();

  /**
   * Get current theme
   */
  getCurrentTheme(): UITheme {
    return getThemeById(this.currentThemeId);
  }

  /**
   * Get current theme ID
   */
  getCurrentThemeId(): string {
    return this.currentThemeId;
  }

  /**
   * Set theme by ID
   */
  setTheme(themeId: string): boolean {
    if (themePresets.some(t => t.id === themeId) || this.customThemes.has(themeId)) {
      this.currentThemeId = themeId;
      return true;
    }
    return false;
  }

  /**
   * List available themes
   */
  listThemes(): Omit<ThemePreset, 'theme'>[] {
    const presetList = themePresets.map(({ id, name, description }) => ({ id, name, description }));
    const customList = Array.from(this.customThemes.keys()).map(id => ({
      id,
      name: `Custom: ${id}`,
      description: 'Custom theme',
    }));
    return [...presetList, ...customList];
  }

  /**
   * Register custom theme
   */
  registerCustomTheme(id: string, theme: UITheme): void {
    this.customThemes.set(id, theme);
  }

  /**
   * Save theme preference to storage
   */
  savePreference(): { themeId: string } {
    return { themeId: this.currentThemeId };
  }

  /**
   * Load theme preference from storage
   */
  loadPreference(preference: { themeId: string }): void {
    if (preference.themeId) {
      this.setTheme(preference.themeId);
    }
  }
}

// Global theme manager instance
export const themeManager = new ThemeManager();
