// ExternalEditor - sửa nội dung bằng editor ngoài
// Bắt chước nguyên tắc pi-mono external-editor.ts:
//   - Ghi nội dung ra file tạm, mở editor, đọc lại kết quả
//   - Không dùng spawnSync: trên Windows gọi đồng bộ có thể giữ quyền đọc
//     console, tranh chấp với vim/ncoe cho tới khi Ctrl+C
//   - Thoát khác 0 hoặc không mở được: báo lỗi, giữ nguyên nội dung
//   - Dọn thư mục tạm trong finally
// Port sang TSX riêng, khon copy code truc iep.

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface ExternalEditorOptions {
  command: string;
  content: string;
}

export type ExternalEditorResult =
  | { status: "complete"; content: string }
  | { status: "failed"; message: string };

/** Bỏ BOM đầu file nếu editor thêm vào. */
function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Mở editor ngoài để sửa nội dung; trả về nội dung đã sửa hoặc lỗi. */
export async function editInExternalEditor(options: ExternalEditorOptions): Promise<ExternalEditorResult> {
  const directory = mkdtempSync(join(tmpdir(), "picro-editor-"));
  const filePath = join(directory, "prompt.md");
  try {
    writeFileSync(filePath, options.content, "utf-8");
    const [editor, ...editorArgs] = options.command.split(" ");
    process.stdout.write(`Mở editor ngoài: ${options.command}\nPicro sẽ tiếp tục khi editor đóng.\n`);

    const exit = await new Promise<number | NodeJS.Signals | null>((resolve) => {
      const child = spawn(editor!, [...editorArgs, filePath], {
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      child.on("error", () => resolve(null));
      child.on("close", (code, signal) => resolve(code ?? signal));
    });

    if (exit === null) {
      return { status: "failed", message: `Không mở được editor: ${options.command}` };
    }
    if (exit !== 0) {
      return {
        status: "failed",
        message: `Editor thoát với ${typeof exit === "number" ? `mã ${exit}` : exit}; nội dung không đổi`,
      };
    }
    return {
      status: "complete",
      content: stripBom(readFileSync(filePath, "utf-8")).replace(/\n$/, ""),
    };
  } finally {
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch {
      // Dọn dẹp là best effort.
    }
  }
}
