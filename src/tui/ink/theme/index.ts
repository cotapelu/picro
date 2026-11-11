// Theme - điểm vào duy nhất của tầng chủ đề
// Gộp: token, lớp Theme, xác thực JSON, chủ đề hệ thống, controller đồng bộ.
export * from "./theme-tokens.js";
export * from "./theme.js";
export * from "./theme-schema.js";
export * from "./system-theme.js";
export * from "./theme-controller.js";

// Alias tiện dụng: theme.fg("accent", text) / theme.bold(text) / theme.accent(text)
// Cùng nguồn với lớp Theme, không tạo bộ màu thứ hai.
import { getTheme, type Theme } from "./theme.js";
import type { ThemeToken } from "./theme-tokens.js";

type ThemeAlias = {
  fg: (name: string, text: string) => string;
  bg: (name: string, text: string) => string;
  bold: (text: string) => string;
  italic: (text: string) => string;
  underline: (text: string) => string;
  strikethrough: (text: string) => string;
  inverse: (text: string) => string;
  dim: (text: string) => string;
} & Record<ThemeToken, (text: string) => string> & { [key: string]: unknown };

function makeAlias(): ThemeAlias {
  const tokens = Object.keys(
    // Danh sách token lấy từ theme-tokens; dùng require gián tiếp để tránh vòng.
    {} as Record<string, unknown>,
  );
  void tokens;
  const alias = {
    fg: (name: string, text: string) => getTheme().fg(name as never, text),
    bg: (name: string, text: string) => getTheme().bg(name as never, text),
    bold: (text: string) => getTheme().bold(text),
    italic: (text: string) => getTheme().italic(text),
    underline: (text: string) => getTheme().underline(text),
    strikethrough: (text: string) => getTheme().strikethrough(text),
    inverse: (text: string) => getTheme().inverse(text),
    dim: (text: string) => getTheme().dim(text),
  } as ThemeAlias;

  // Mọi token màu đều truy cập được dạng theme.<token>(text).
  return new Proxy(alias, {
    get(target, prop: string) {
      if (prop in target) return (target as Record<string, unknown>)[prop];
      return (text: string) => getTheme().fg(prop as never, text);
    },
  });
}

export const theme: ThemeAlias = makeAlias();
export { getTheme };
export type { Theme };

/** Hàm tô màu theo token, dùng độc lập không cần object theme. */
export function fg(name: string, text: string): string {
  return getTheme().fg(name as never, text);
}

/** Hàm tô nền theo token, dùng độc lập không cần object theme. */
export function bg(name: string, text: string): string {
  return getTheme().bg(name as never, text);
}
