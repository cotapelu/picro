// NativeModulePath - dò tìm module native trong các vị trí đóng gói
// Bắt chước nguyên tắc pi-tui native-module-path.ts:
//   - Ưu tiên module nằm trong package đã cài
//   - Rồi tới cạnh thư mục nguồn, thư mục hiện tại, cạnh executable
// Port sang TSX riêng, khon copy code truc iep.

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const moduleRequire = createRequire(import.meta.url);
const TUI_PACKAGE_NAME = "@earendil-works/pi-tui";

export interface NativeModuleCandidateOptions {
  moduleUrl?: string;
  execPath?: string;
  resolvePackage?: (specifier: string) => string;
}

/** Danh sách đường dẫn khả dụng cho một module native. */
export function getNativeModuleCandidates(nativePath: string, options: NativeModuleCandidateOptions = {}): string[] {
  const moduleDir = dirname(fileURLToPath(options.moduleUrl ?? import.meta.url));
  const candidates: string[] = [];

  try {
    const packageEntry = (options.resolvePackage ?? moduleRequire.resolve)(TUI_PACKAGE_NAME);
    candidates.push(join(dirname(packageEntry), "..", nativePath));
  } catch {
    // Nhị phân độc lập không có package TUI cài đặt.
  }

  candidates.push(
    join(moduleDir, "..", nativePath),
    join(moduleDir, nativePath),
    join(dirname(options.execPath ?? process.execPath), nativePath),
  );
  return Array.from(new Set(candidates));
}
