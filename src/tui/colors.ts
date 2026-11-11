// ANSI Colors and Styles

// Reset
export const reset = '\x1b[0m';

// Text colors (normal)
export const black = '\x1b[30m';
export const red = '\x1b[31m';
export const green = '\x1b[32m';
export const yellow = '\x1b[33m';
export const blue = '\x1b[34m';
export const magenta = '\x1b[35m';
export const cyan = '\x1b[36m';
export const white = '\x1b[37m';

// Bright text colors
export const brightBlack = '\x1b[90m';
export const brightRed = '\x1b[91m';
export const brightGreen = '\x1b[92m';
export const brightYellow = '\x1b[93m';
export const brightBlue = '\x1b[94m';
export const brightMagenta = '\x1b[95m';
export const brightCyan = '\x1b[96m';
export const brightWhite = '\x1b[97m';

// Background colors (normal)
export const bgBlack = '\x1b[40m';
export const bgRed = '\x1b[41m';
export const bgGreen = '\x1b[42m';
export const bgYellow = '\x1b[43m';
export const bgBlue = '\x1b[44m';
export const bgMagenta = '\x1b[45m';
export const bgCyan = '\x1b[46m';
export const bgWhite = '\x1b[47m';

// Bright background colors
export const bgBrightBlack = '\x1b[100m';
export const bgBrightRed = '\x1b[101m';
export const bgBrightGreen = '\x1b[102m';
export const bgBrightYellow = '\x1b[103m';
export const bgBrightBlue = '\x1b[104m';
export const bgBrightMagenta = '\x1b[105m';
export const bgBrightCyan = '\x1b[106m';
export const bgBrightWhite = '\x1b[107m';

// Styles
export const bold = '\x1b[1m';
export const dim = '\x1b[2m';
export const italic = '\x1b[3m';
export const underline = '\x1b[4m';
export const blink = '\x1b[5m';
export const reverse = '\x1b[7m';
export const hidden = '\x1b[8m';

// Utility: combine color codes
export function colorize(text: string, colorName: string): string {
  const colorMap: Record<string, string> = {
    black, red, green, yellow, blue, magenta, cyan, white,
    brightBlack, brightRed, brightGreen, brightYellow, brightBlue, brightMagenta, brightCyan, brightWhite,
    bgBlack, bgRed, bgGreen, bgYellow, bgBlue, bgMagenta, bgCyan, bgWhite,
    bgBrightBlack, bgBrightRed, bgBrightGreen, bgBrightYellow, bgBrightBlue, bgBrightMagenta, bgBrightCyan, bgBrightWhite,
    bold, dim, italic, underline, blink, reverse, hidden,
  };
  const color = colorMap[colorName];
  return color ? color + text + reset() : text;
}

// Utility: make a color composition
export function composeColors(...colors: string[]): string {
  return colors.join('') + reset();
}

// 256-color support
export function rgb256(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`;
}

export function bgRgb256(r: number, g: number, b: number): string {
  return `\x1b[48;2;${r};${g};${b}m`;
}

// 16-color shortcuts with names
export const colors = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};
