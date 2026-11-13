// Clipboard - đọc/ghi clipboard đa nền tảng
// Nguyên tắc giống runtime.copyToClipboard: thử clipboardy trước, nếu không có
// thì dùng lệnh gốc của hệ điều hành. Port riêng, không copy code.

import { execSync } from "node:child_process";

/** Lệnh đọc clipboard theo từng nền tảng (thử lần lượt đến khi thành công). */
function readCommands(): Array<{ command: string; args: string[] }> {
  if (process.platform === "darwin") {
    return [{ command: "pbpaste", args: [] }];
  }
  if (process.platform === "win32") {
    return [
      { command: "powershell", args: ["-NoProfile", "-Command", "Get-Clipboard"] },
    ];
  }
  return [
    { command: "wl-paste", args: ["-n"] },
    { command: "xclip", args: ["-selection", "clipboard", "-o"] },
    { command: "xsel", args: ["-b", "-o"] },
  ];
}

/** Đọc text từ clipboard; rỗng/undefined khi không đọc được. */
export async function readClipboardText(): Promise<string | undefined> {
  try {
    const clipboardy = (await import("clipboardy")) as { default?: { read(): Promise<string> } };
    if (typeof clipboardy.default?.read === "function") {
      const text = await clipboardy.default.read();
      return typeof text === "string" ? text : undefined;
    }
  } catch {
    // clipboardy không có — dùng lệnh gốc.
  }

  for (const { command, args } of readCommands()) {
    try {
      const text = execSync(`${command} ${args.join(" ")}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 2000,
      });
      if (typeof text === "string") return text;
    } catch {
      // Thử lệnh tiếp theo.
    }
  }
  return undefined;
}

/** Ghi text ra clipboard. */
export async function writeClipboardText(text: string): Promise<boolean> {
  try {
    const clipboardy = (await import("clipboardy")) as { default?: { write(text: string): Promise<void> } };
    if (typeof clipboardy.default?.write === "function") {
      await clipboardy.default.write(text);
      return true;
    }
  } catch {
    // clipboardy không có.
  }

  const commands: Array<{ command: string; args: string[]; input?: boolean }> =
    process.platform === "darwin"
      ? [{ command: "pbcopy", args: [], input: true }]
      : process.platform === "win32"
        ? [{ command: "clip", args: [], input: true }]
        : [
            { command: "wl-copy", args: [], input: true },
            { command: "xclip", args: ["-selection", "clipboard"], input: true },
            { command: "xsel", args: ["-b", "-i"], input: true },
          ];

  for (const { command, args, input } of commands) {
    try {
      if (input) {
        execSync(command, { input: text, stdio: ["pipe", "ignore", "ignore"], timeout: 2000, ...args });
      } else {
        execSync(`${command} ${args.join(" ")}`, { input: text, stdio: ["pipe", "ignore", "ignore"], timeout: 2000 });
      }
      return true;
    } catch {
      // Thử lệnh tiếp theo.
    }
  }
  return false;
}
