/**
 * Theme System
 * Theme definitions and management
 */

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  border: string;
  selected: string;
  highlighted: string;
  dim: string;
  muted: string;
  link: string;
}

export const darkTheme: ThemeColors = {
  background: '\x1b[48;5;235m',
  foreground: '\x1b[38;5;255m',
  primary: '\x1b[38;5;141m',
  secondary: '\x1b[38;5;109m',
  accent: '\x1b[38;5;221m',
  success: '\x1b[38;5;84m',
  warning: '\x1b[38;5;214m',
  error: '\x1b[38;5;203m',
  info: '\x1b[38;5;75m',
  border: '\x1b[38;5;239m',
  selected: '\x1b[48;5;24m',
  highlighted: '\x1b[48;5;237m',
  dim: '\x1b[38;5;240m',
  muted: '\x1b[38;5;245m',
  link: '\x1b[38;5;117m',
};

export const lightTheme: ThemeColors = {
  background: '\x1b[48;5;255m',
  foreground: '\x1b[38;5;16m',
  primary: '\x1b[38;5;25m',
  secondary: '\x1b[38;5;60m',
  accent: '\x1b[38;5;178m',
  success: '\x1b[38;5;34m',
  warning: '\x1b[38;5;202m',
  error: '\x1b[38;5;196m',
  info: '\x1b[38;5;31m',
  border: '\x1b[38;5;188m',
  selected: '\x1b[48;5;189m',
  highlighted: '\x1b[48;5;254m',
  dim: '\x1b[38;5;145m',
  muted: '\x1b[38;5;243m',
  link: '\x1b[38;5;32m',
};

export type ThemeName = 'dark' | 'light';

export const themes: Record<ThemeName, ThemeColors> = {
  dark: darkTheme,
  light: lightTheme,
};

class ThemeManagerClass {
  private currentTheme: ThemeColors = darkTheme;
  private currentThemeName: ThemeName = 'dark';
  private listeners: Array<(theme: ThemeColors) => void> = [];

  getTheme(): ThemeColors {
    return this.currentTheme;
  }

  getThemeName(): ThemeName {
    return this.currentThemeName;
  }

  setTheme(name: ThemeName): void {
    if (themes[name]) {
      this.currentTheme = themes[name];
      this.currentThemeName = name;
      this.notifyListeners();
    }
  }

  onChange(listener: (theme: ThemeColors) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentTheme);
    }
  }

  fg(role: keyof ThemeColors, text: string): string {
    return this.currentTheme[role] + text + '\x1b[0m';
  }

  bg(role: keyof ThemeColors, text: string): string {
    return this.currentTheme.background + text + '\x1b[0m';
  }
}

export const themeManager = new ThemeManagerClass();

export function getTheme(): ThemeColors {
  return themeManager.getTheme();
}

export function setTheme(name: ThemeName): void {
  themeManager.setTheme(name);
}

export function onThemeChange(listener: (theme: ThemeColors) => void): () => void {
  return themeManager.onChange(listener);
}

export function fg(role: keyof ThemeColors, text: string): string {
  return themeManager.fg(role, text);
}

export function bg(role: keyof ThemeColors, text: string): string {
  return themeManager.bg(role, text);
}
