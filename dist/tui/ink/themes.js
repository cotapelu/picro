"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lightTheme = exports.darkTheme = void 0;
/**
 * Default dark theme (ANSI escape codes)
 */
exports.darkTheme = {
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
    selectedBackground: '\x1b[48;5;24m',
    selectedForeground: '\x1b[38;5;15m', // bright white
    highlighted: '\x1b[48;5;237m', // slightly lighter bg
    dim: '\x1b[38;5;240m', // dim text
};
/**
 * Light theme
 */
exports.lightTheme = {
    primary: '\x1b[38;5;25m',
    secondary: '\x1b[38;5;60m',
    accent: '\x1b[38;5;178m',
    background: '\x1b[48;5;255m',
    foreground: '\x1b[38;5;16m',
    success: '\x1b[38;5;34m',
    warning: '\x1b[38;5;178m',
    error: '\x1b[38;5;196m',
    border: '\x1b[38;5;145m',
    selected: '\x1b[48;5;33m',
    selectedBackground: '\x1b[48;5;33m',
    selectedForeground: '\x1b[38;5;15m', // bright white
    highlighted: '\x1b[48;5;253m',
    dim: '\x1b[38;5;145m',
};
//# sourceMappingURL=themes.js.map