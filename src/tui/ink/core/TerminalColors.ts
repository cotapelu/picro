// TerminalColors - đọc màu và chủ đề terminal báo về
// Bắt chước nguyên tắc pi-tui terminal-colors.ts:
//   - Phân tích phản hồi OSC 10/11/4 (màu mặc định và bảng 16 màu)
//   - Nhận diện báo cáo chủ đề sáng/tối (CSI ? 997 ; n)
//   - Chấp nhận cả dạng "#rrggbb" và "rgba:rr/gg/bb"
// Port sang TSX riêng, khong copy code truc iep.

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export type TerminalColorScheme = "dark" | "light";

export interface TerminalColors {
  foreground?: RgbColor;
  background?: RgbColor;
  palette?: RgbColor[];
}

export type OscColorTarget = "foreground" | "background" | number;

const OSC_COLOR_RESPONSE_PATTERN = /^\x1b\](?:(1[01])|4;(\d{1,3}));([^\x07\x1b]*)(?:\x07|\x1b\\)$/i;
const COLOR_SCHEME_REPORT_PATTERN = /^(?:\x1b\[\?997;(1|2)n)+$/;

function hexToRgb(hex: string): RgbColor {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function parseHexChannel(channel: string): number | undefined {
  if (!/^[0-9a-f]+$/i.test(channel)) return undefined;
  const max = 16 ** channel.length - 1;
  if (max <= 0) return undefined;
  return Math.round((Number.parseInt(channel, 16) / max) * 255);
}

function parseOscColorValue(raw: string): RgbColor | undefined {
  const value = raw.trim();
  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (/^[0-9a-f]{6}$/i.test(hex)) return hexToRgb(value);
    if (/^[0-9a-f]{12}$/i.test(hex)) {
      const r = parseHexChannel(hex.slice(0, 4));
      const g = parseHexChannel(hex.slice(4, 8));
      const b = parseHexChannel(hex.slice(8, 12));
      return r !== undefined && g !== undefined && b !== undefined ? { r, g, b } : undefined;
    }
    return undefined;
  }
  const rgb = value.replace(/^rgba?:/i, "");
  const [red, green, blue] = rgb.split("/");
  if (red === undefined || green === undefined || blue === undefined) return undefined;
  const r = parseHexChannel(red);
  const g = parseHexChannel(green);
  const b = parseHexChannel(blue);
  return r !== undefined && g !== undefined && b !== undefined ? { r, g, b } : undefined;
}

/** Phân tích phản hồi màu OSC; rgb undefined nếu không đọc được. */
export function parseOscColorResponse(data: string): { target: OscColorTarget; rgb: RgbColor | undefined } | undefined {
  const match = data.match(OSC_COLOR_RESPONSE_PATTERN);
  if (!match) return undefined;
  const target: OscColorTarget =
    match[1] === "10" ? "foreground" : match[1] === "11" ? "background" : Number.parseInt(match[2]!, 10);
  return { target, rgb: parseOscColorValue(match[3]!) };
}

/** Đọc báo cáo chủ đề sáng/tối từ terminal. */
export function parseTerminalColorSchemeReport(data: string): TerminalColorScheme | undefined {
  const match = data.match(COLOR_SCHEME_REPORT_PATTERN);
  if (!match) return undefined;
  return match[1] === "2" ? "light" : "dark";
}
