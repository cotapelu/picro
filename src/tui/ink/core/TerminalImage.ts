// TerminalImage - phát hiện khả năng ảnh và mã hóa đồ họa
// Bắt chước nguyên tắc pi-tui terminal-image.ts (phần dùng cho layout):
//   - Phát hiện giao thức ảnh (kitty/iterm2) qua biến môi trường
//   - isImageLine: nhận diện dòng chứa ảnh
//   - encodeKitty/encodeITerm2: sinh escape truyền ảnh
//   - hyperlink: bọc OSC 8
//   - imageFallback: chữ thay thế khi không hiển thị được
// Port sang TSX riêng, khong copy code truc iep.

import { homedir } from "node:os";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

export type ImageProtocol = "kitty" | "iterm2" | null;

export interface TerminalCapabilities {
  images: ImageProtocol;
  trueColor: boolean;
  hyperlinks: boolean;
}

export interface CellDimensions {
  widthPx: number;
  heightPx: number;
}

export interface ImageDimensions {
  widthPx: number;
  heightPx: number;
}

export interface ImageCellSize {
  columns: number;
  rows: number;
}

let cachedCapabilities: TerminalCapabilities | null = null;
let capabilityOverrides: Partial<TerminalCapabilities> = {};
let cellDimensions: CellDimensions = { widthPx: 9, heightPx: 18 };

export function getCellDimensions(): CellDimensions {
  return cellDimensions;
}

export function setCellDimensions(dims: CellDimensions): void {
  cellDimensions = dims;
}

function hasTrueColorHint(): boolean {
  const colorTerm = process.env.COLORTERM?.toLowerCase();
  const term = process.env.TERM?.toLowerCase();
  return colorTerm === "truecolor" || colorTerm === "24bit" || (term?.endsWith("-direct") ?? false);
}

/** Phát hiện khả năng terminal từ biến môi trường (không truy vấn tty). */
export function detectCapabilitiesFromEnvironment(): TerminalCapabilities {
  const termProgram = process.env.TERM_PROGRAM?.toLowerCase() ?? "";
  const term = process.env.TERM?.toLowerCase() ?? "";

  if (process.env.TMUX || term.startsWith("tmux")) {
    return { images: null, trueColor: hasTrueColorHint(), hyperlinks: false };
  }
  if (term.startsWith("screen")) {
    return { images: null, trueColor: hasTrueColorHint(), hyperlinks: false };
  }
  if (process.env.KITTY_WINDOW_ID || termProgram === "kitty") {
    return { images: "kitty", trueColor: true, hyperlinks: true };
  }
  if (termProgram === "ghostty" || term.includes("ghostty") || process.env.GHOSTTY_RESOURCES_DIR) {
    return { images: "kitty", trueColor: true, hyperlinks: true };
  }
  if (process.env.WEZTERM_PANE || termProgram === "wezterm") {
    return { images: "kitty", trueColor: true, hyperlinks: true };
  }
  if (process.env.ITERM_SESSION_ID || termProgram === "iterm.app") {
    return { images: "iterm2", trueColor: true, hyperlinks: true };
  }
  if (process.env.WT_SESSION) {
    return { images: null, trueColor: true, hyperlinks: true };
  }
  if (termProgram === "alacritty" || term.startsWith("alacritty") || termProgram === "vscode" || termProgram === "zed") {
    return { images: null, trueColor: true, hyperlinks: true };
  }
  return { images: null, trueColor: hasTrueColorHint(), hyperlinks: false };
}

export function detectCapabilities(): TerminalCapabilities {
  const override = process.env.PI_IMAGE_PROTOCOL?.toLowerCase();
  const detected = detectCapabilitiesFromEnvironment();
  const images: ImageProtocol =
    override === "kitty" || override === "iterm2"
      ? override
      : override === "none" || override === "0"
        ? null
        : detected.images;
  return { ...detected, images };
}

export function getCapabilities(): TerminalCapabilities {
  if (!cachedCapabilities) cachedCapabilities = { ...detectCapabilities(), ...capabilityOverrides };
  return cachedCapabilities;
}

export function setCapabilities(caps: TerminalCapabilities): void {
  cachedCapabilities = caps;
}

export function setCapabilityOverrides(overrides: Partial<TerminalCapabilities>): void {
  capabilityOverrides = { ...overrides };
  cachedCapabilities = null;
}

const KITTY_PREFIX = "\x1b_G";
const ITERM2_PREFIX = "\x1b]1337;File=";

export function isImageLine(line: string): boolean {
  if (line.startsWith(KITTY_PREFIX) || line.startsWith(ITERM2_PREFIX)) return true;
  return line.includes(KITTY_PREFIX) || line.includes(ITERM2_PREFIX);
}

export function allocateImageId(): number {
  return Math.floor(Math.random() * 0xfffffffe) + 1;
}

const KITTY_CHUNK = 4096;

/** Mã hóa ảnh base64 theo giao thức Kitty, chia chunk nếu quá lớn. */
export function encodeKitty(
  base64Data: string,
  options: { columns?: number; rows?: number; imageId?: number; moveCursor?: boolean } = {},
): string {
  const params = ["a=T", "f=100", "q=2"];
  if (options.moveCursor === false) params.push("C=1");
  if (options.columns) params.push(`c=${options.columns}`);
  if (options.rows) params.push(`r=${options.rows}`);
  if (options.imageId) params.push(`i=${options.imageId}`);

  if (base64Data.length <= KITTY_CHUNK) return `${KITTY_PREFIX}${params.join(",")};${base64Data}\x1b\\`;

  const chunks: string[] = [];
  let offset = 0;
  let first = true;
  while (offset < base64Data.length) {
    const chunk = base64Data.slice(offset, offset + KITTY_CHUNK);
    const isLast = offset + KITTY_CHUNK >= base64Data.length;
    if (first) {
      chunks.push(`${KITTY_PREFIX}${params.join(",")},m=1;${chunk}\x1b\\`);
      first = false;
    } else if (isLast) chunks.push(`${KITTY_PREFIX}m=0;${chunk}\x1b\\`);
    else chunks.push(`${KITTY_PREFIX}m=1;${chunk}\x1b\\`);
    offset += KITTY_CHUNK;
  }
  return chunks.join("");
}

export function encodeITerm2(
  base64Data: string,
  options: { width?: number | string; height?: number | string; name?: string; preserveAspectRatio?: boolean; inline?: boolean } = {},
): string {
  const params = [`inline=${options.inline !== false ? 1 : 0}`, `size=${Buffer.byteLength(base64Data, "base64")}`];
  if (options.width !== undefined) params.push(`width=${options.width}`);
  if (options.height !== undefined) params.push(`height=${options.height}`);
  if (options.name) params.push(`name=${Buffer.from(options.name).toString("base64")}`);
  if (options.preserveAspectRatio === false) params.push("preserveAspectRatio=0");
  return `${ITERM2_PREFIX}${params.join(";")}:${base64Data}\x07`;
}

/** Tính số ô (columns, rows) cho ảnh trong khung cho phép. */
export function calculateImageCellSize(
  dimensions: ImageDimensions,
  maxWidthCells: number,
  maxHeightCells?: number,
  cells: CellDimensions = cellDimensions,
): ImageCellSize {
  const maxWidth = Math.max(1, Math.floor(maxWidthCells));
  const maxHeight = maxHeightCells === undefined ? undefined : Math.max(1, Math.floor(maxHeightCells));
  const imageWidth = Math.max(1, dimensions.widthPx);
  const imageHeight = Math.max(1, dimensions.heightPx);

  const widthScale = (maxWidth * cells.widthPx) / imageWidth;
  const heightScale = maxHeight === undefined ? widthScale : (maxHeight * cells.heightPx) / imageHeight;
  const scale = Math.min(widthScale, heightScale);

  const scaledWidth = imageWidth * scale;
  const scaledHeight = imageHeight * scale;
  const columns = Math.max(1, Math.min(maxWidth, Math.ceil(scaledWidth / cells.widthPx)));
  let rows = Math.max(1, Math.ceil(scaledHeight / cells.heightPx));
  if (maxHeight !== undefined) rows = Math.min(maxHeight, rows);
  return { columns, rows };
}

/** Bọc văn bản thành liên kết OSC 8. */
export function hyperlink(text: string, url: string): string {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

/** Rút gọn đường dẫn trong thư mục nhà thành ~/... */
function shortenImagePath(filename: string): string {
  const home = homedir();
  if (home && (filename === home || filename.startsWith(`${home}/`) || filename.startsWith(`${home}\\`))) {
    return `~${filename.slice(home.length)}`;
  }
  return filename;
}

/** Chữ thay thế khi terminal không hiển thị ảnh inline. */
export function imageFallback(mimeType: string, dimensions?: ImageDimensions, filename?: string): string {
  const parts: string[] = [];
  if (filename) {
    const display = shortenImagePath(filename);
    parts.push(getCapabilities().hyperlinks && isAbsolute(filename) ? hyperlink(display, pathToFileURL(filename).href) : display);
  }
  parts.push(`[${mimeType}]`);
  if (dimensions) parts.push(`${dimensions.widthPx}x${dimensions.heightPx}`);
  return `[Ảnh: ${parts.join(" ")}]`;
}
