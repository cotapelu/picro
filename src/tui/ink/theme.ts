// Theme system - port ý tưởng từ pi-mono theme.ts
// Viết lại hoàn toàn, không copy code

export const theme = {
  black: (text: string) => `\x1b[30m${text}\x1b[39m`,
  red: (text: string) => `\x1b[31m${text}\x1b[39m`,
  green: (text: string) => `\x1b[32m${text}\x1b[39m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[39m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[39m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[39m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[39m`,
  white: (text: string) => `\x1b[37m${text}\x1b[39m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[39m`,
  brightRed: (text: string) => `\x1b[91m${text}\x1b[39m`,
  brightGreen: (text: string) => `\x1b[92m${text}\x1b[39m`,
  brightYellow: (text: string) => `\x1b[93m${text}\x1b[39m`,
  brightBlue: (text: string) => `\x1b[94m${text}\x1b[39m`,
  brightMagenta: (text: string) => `\x1b[95m${text}\x1b[39m`,
  brightCyan: (text: string) => `\x1b[96m${text}\x1b[39m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[22m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[22m`,
  italic: (text: string) => `\x1b[3m${text}\x1b[23m`,
  underline: (text: string) => `\x1b[4m${text}\x1b[24m`,
  inverse: (text: string) => `\x1b[7m${text}\x1b[27m`,
  bgBlack: (text: string) => `\x1b[40m${text}\x1b[49m`,
  bgRed: (text: string) => `\x1b[41m${text}\x1b[49m`,
  bgGreen: (text: string) => `\x1b[42m${text}\x1b[49m`,
  bgYellow: (text: string) => `\x1b[43m${text}\x1b[49m`,
  bgBlue: (text: string) => `\x1b[44m${text}\x1b[49m`,
  bgMagenta: (text: string) => `\x1b[45m${text}\x1b[49m`,
  bgCyan: (text: string) => `\x1b[46m${text}\x1b[49m`,
  bgWhite: (text: string) => `\x1b[47m${text}\x1b[49m`,
  error: (text: string) => theme.bold(theme.brightRed(text)),
  warning: (text: string) => theme.bold(theme.brightYellow(text)),
  success: (text: string) => theme.bold(theme.brightGreen(text)),
  info: (text: string) => theme.bold(theme.brightCyan(text)),
  reset: () => `\x1b[0m`,
};

export function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}

export function formatCwdForFooter(cwd: string, home: string | undefined): string {
  if (!home) return cwd;
  try {
    const { resolve, relative, sep, isAbsolute } = require('node:path');
    const resolvedCwd = resolve(cwd);
    const resolvedHome = resolve(home);
    const relativeToHome = relative(resolvedHome, resolvedCwd);
    const isInsideHome =
      relativeToHome === "" ||
      (relativeToHome !== ".." && !relativeToHome.startsWith(`..${sep}`) && !isAbsolute(relativeToHome));
    if (!isInsideHome) return cwd;
    return relativeToHome === "" ? "~" : `~${sep}${relativeToHome}`;
  } catch {
    return cwd;
  }
}

export function sanitizeStatusText(text: string): string {
  return text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
}

export function truncateToVisualLines(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  return text.slice(0, maxWidth - 3) + "...";
}
