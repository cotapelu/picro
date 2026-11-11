// NativePlatform - truy cập clipboard qua công cụ nền tảng
// Bắt chước nguyên tắc pi-tui native-platform.ts:
//   - macOS/Windows: module native nếu có
//   - Linux: dùng công cụ dòng lệnh xsel/xclip/wl-paste để GIỮ quyền sở hữu
//   - getText: undefined = không khả dụng, null = rỗng
// Port sang TSX riêng, khong copy code truc iep.

import { execSync, spawnSync } from "node:child_process";

export type ModifierKey = "shift" | "command" | "control" | "option";

export interface NativeClipboard {
  /** undefined = không khả dụng, null = rỗng. */
  getText(): Promise<string | null | undefined>;
  getImage(): Promise<Uint8Array | null | undefined>;
  getFilePaths?(): Promise<string[] | null | undefined>;
  /** Linux dùng công cụ dòng lệnh thay vì setText. */
  setText?(text: string): Promise<void>;
}

type PlatformHelper = NativeClipboard & {
  enableVirtualTerminalInput?: () => boolean;
  isModifierPressed?: (name: ModifierKey) => boolean;
};

const helpers = new Map<string, PlatformHelper | undefined>();

/** Tìm công cụ clipboard khả dụng trên PATH. */
function findCommand(name: string): string | undefined {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", [name], { stdio: "ignore" });
  return result.status === 0 ? name : undefined;
}

/** Clipboard Linux qua xsel/xclip/wl-paste. */
function createLinuxClipboard(): NativeClipboard | undefined {
  const hasDisplay = Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  if (!hasDisplay && process.platform === "linux") return undefined;

  const reader =
    (process.env.WAYLAND_DISPLAY && findCommand("wl-paste")) ||
    findCommand("xsel") ||
    findCommand("xclip");

  if (!reader) return undefined;

  return {
    async getText(): Promise<string | null | undefined> {
      try {
        if (reader === "xsel") {
          return execSync("xsel --clipboard --output", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
        }
        if (reader === "wl-paste") {
          return execSync("wl-paste --no-newline", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
        }
        return execSync("xclip -selection clipboard -o", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      } catch {
        return undefined;
      }
    },
    async getImage(): Promise<Uint8Array | null | undefined> {
      return undefined;
    },
    async setText(text: string): Promise<void> {
      try {
        if (reader === "xsel") {
          execSync("xsel --clipboard --input", { input: text, stdio: ["ignore", "ignore", "ignore"] });
        } else if (reader === "wl-paste") {
          execSync("wl-copy", { input: text, stdio: ["ignore", "ignore", "ignore"] });
        } else {
          execSync("xclip -selection clipboard -i", { input: text, stdio: ["ignore", "ignore", "ignore"] });
        }
      } catch {
        // Bỏ qua lỗi ghi clipboard.
      }
    },
  };
}

export function getNativePlatformHelper(): PlatformHelper | undefined {
  const key = process.platform;
  if (helpers.has(key)) return helpers.get(key);
  if (key !== "darwin" && key !== "win32") return undefined;
  // Chưa tích hợp module native; coi như không khả dụng.
  helpers.set(key, undefined);
  return undefined;
}

export function getNativeClipboard(): NativeClipboard | undefined {
  if (process.platform !== "linux") return getNativePlatformHelper();
  return createLinuxClipboard();
}
