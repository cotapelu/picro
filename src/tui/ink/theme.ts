// Theme system - port từ pi-mono packages/coding-agent/src/modes/interactive/theme/theme.ts
export const theme = {
  // Màu sắc cơ bản
  black: (text: string) => `\x1b[30m${text}\x1b[39m`,
  red: (text: string) => `\x1b[31m${text}\x1b[39m`,
  green: (text: string) => `\x1b[32m${text}\x1b[39m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[39m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[39m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[39m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[39m`,
  white: (text: string) => `\x1b[37m${text}\x1b[39m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[39m`,
  
  // Bright colors
  brightRed: (text: string) => `\x1b[91m${text}\x1b[39m`,
  brightGreen: (text: string) => `\x1b[92m${text}\x1b[39m`,
  brightYellow: (text: string) => `\x1b[93m${text}\x1b[39m`,
  brightBlue: (text: string) => `\x1b[94m${text}\x1b[39m`,
  brightMagenta: (text: string) => `\x1b[95m${text}\x1b[39m`,
  brightCyan: (text: string) => `\x1b[96m${text}\x1b[39m`,
  
  // Styles
  bold: (text: string) => `\x1b[1m${text}\x1b[22m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[22m`,
  italic: (text: string) => `\x1b[3m${text}\x1b[23m`,
  underline: (text: string) => `\x1b[4m${text}\x1b[24m`,
  inverse: (text: string) => `\x1b[7m${text}\x1b[27m`,
  
  // Background colors
  bgBlack: (text: string) => `\x1b[40m${text}\x1b[49m`,
  bgRed: (text: string) => `\x1b[41m${text}\x1b[49m`,
  bgGreen: (text: string) => `\x1b[42m${text}\x1b[49m`,
  bgYellow: (text: string) => `\x1b[43m${text}\x1b[49m`,
  bgBlue: (text: string) => `\x1b[44m${text}\x1b[49m`,
  bgMagenta: (text: string) => `\x1b[45m${text}\x1b[49m`,
  bgCyan: (text: string) => `\x1b[46m${text}\x1b[49m`,
  bgWhite: (text: string) => `\x1b[47m${text}\x1b[49m`,
  
  // Composite helpers
  error: (text: string) => theme.bold(theme.brightRed(text)),
  warning: (text: string) => theme.bold(theme.brightYellow(text)),
  success: (text: string) => theme.bold(theme.brightGreen(text)),
  info: (text: string) => theme.bold(theme.brightCyan(text)),
  
  // Reset
  reset: () => `\x1b[0m`,
};

export type Theme = typeof theme;
