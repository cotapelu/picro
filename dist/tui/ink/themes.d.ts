/**
 * Semantic color roles for Ink TUI
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
    selectedBackground?: string;
    selectedForeground?: string;
    highlighted: string;
    dim: string;
}
/**
 * Default dark theme (ANSI escape codes)
 */
export declare const darkTheme: Theme;
/**
 * Light theme
 */
export declare const lightTheme: Theme;
//# sourceMappingURL=themes.d.ts.map