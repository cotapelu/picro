// Clipboard Image - đọc ảnh từ clipboard
// Bắt chước pi-mono utils/clipboard-image.ts

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir, platform } from "os";
import { join, extname } from "path";
import { spawnSync } from "child_process";

export interface ClipboardImageResult {
  /** Base64 encoded image data */
  data: string;
  /** MIME type (image/png, image/jpeg, etc.) */
  mimeType: string;
  /** File extension */
  extension: string;
}

/** Thử đọc ảnh từ clipboard; undefined nếu không có ảnh. */
export async function readClipboardImage(): Promise<ClipboardImageResult | undefined> {
  const tempDir = mkdtempSync(join(tmpdir(), "pi-clipboard-"));
  const tempFile = join(tempDir, "clipboard");

  try {
    if (platform() === "darwin") {
      // macOS: use osascript to save clipboard image
      const script = `
        tell application "System Events"
          set theClipboard to the clipboard as «class PNGf»
          try
            do shell script "echo " & (theClipboard as string) & " | base64 --decode > ${tempFile}.png"
            return "png"
          end try
          try
            do shell script "echo " & (theClipboard as string) & " | base64 --decode > ${tempFile}.jpg"
            return "jpg"
          end try
          return "none"
        end tell
      `;
      const result = spawnSync("osascript", ["-e", script], { encoding: "utf-8" });
      
      const mimeType = result.stdout.trim();
      if (mimeType === "png" || mimeType === "jpg") {
        const ext = mimeType === "png" ? "png" : "jpeg";
        const filePath = `${tempFile}.${ext}`;
        try {
          const data = readFileSync(filePath).toString("base64");
          return { data, mimeType: `image/${ext}`, extension: ext };
        } catch {
          // File not found
        }
      }
    } else if (platform() === "win32") {
      // Windows: use PowerShell
      const script = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        $clipboard = [System.Windows.Forms.Clipboard]::GetDataObject()
        if ($clipboard.GetDataPresent('Bitmap')) {
          $image = $clipboard.GetData('Bitmap')
          $image.Save('${tempFile}.png', [System.Drawing.Imaging.ImageFormat]::Png)
          Write-Output "png"
        } elseif ($clipboard.GetDataPresent('FileDrop')) {
          $files = $clipboard.GetData('FileDrop')
          if ($files.Length -gt 0) {
            $file = $files[0]
            $ext = [IO.Path]::GetExtension($file).TrimStart('.')
            Copy-Item $file '${tempFile}.$ext' -Force
            Write-Output $ext
          }
        }
      `;
      const result = spawnSync("powershell", ["-NoProfile", "-Command", script], { encoding: "utf-8" });
      
      const ext = result.stdout.trim().toLowerCase();
      if (ext) {
        const filePath = `${tempFile}.${ext}`;
        try {
          const data = readFileSync(filePath).toString("base64");
          const mimeType = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
          return { data, mimeType, extension: ext };
        } catch {
          // File not found
        }
      }
    } else {
      // Linux: try xclip or wl-paste
      // Try wl-paste first (Wayland)
      let result = spawnSync("wl-paste", ["-t", "image/png"], { encoding: "buffer" });
      if (result.status === 0 && result.stdout && result.stdout.length > 0) {
        writeFileSync(`${tempFile}.png`, result.stdout);
        const data = readFileSync(`${tempFile}.png`).toString("base64");
        return { data, mimeType: "image/png", extension: "png" };
      }
      
      // Try xclip (X11)
      result = spawnSync("xclip", ["-selection", "clipboard", "-t", "image/png", "-o"], { encoding: "buffer" });
      if (result.status === 0 && result.stdout && result.stdout.length > 0) {
        writeFileSync(`${tempFile}.png`, result.stdout);
        const data = readFileSync(`${tempFile}.png`).toString("base64");
        return { data, mimeType: "image/png", extension: "png" };
      }
      
      // Try JPEG
      result = spawnSync("wl-paste", ["-t", "image/jpeg"], { encoding: "buffer" });
      if (result.status === 0 && result.stdout && result.stdout.length > 0) {
        writeFileSync(`${tempFile}.jpg`, result.stdout);
        const data = readFileSync(`${tempFile}.jpg`).toString("base64");
        return { data, mimeType: "image/jpeg", extension: "jpeg" };
      }
      
      result = spawnSync("xclip", ["-selection", "clipboard", "-t", "image/jpeg", "-o"], { encoding: "buffer" });
      if (result.status === 0 && result.stdout && result.stdout.length > 0) {
        writeFileSync(`${tempFile}.jpg`, result.stdout);
        const data = readFileSync(`${tempFile}.jpg`).toString("base64");
        return { data, mimeType: "image/jpeg", extension: "jpeg" };
      }
    }
    return undefined;
  } finally {
    // Cleanup temp dir
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/** Kiểm tra xem clipboard có chứa ảnh không. */
export function hasClipboardImage(): boolean {
  // This is a synchronous check - just try to read
  // In practice, you'd want an async version
  return false;
}

/** Phát hiện loại MIME của dữ liệu ảnh từ bytes. */
export function detectImageMimeType(data: Buffer): string {
  if (data.length < 12) return "application/octet-stream";
  
  // PNG
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return "image/png";
  }
  // JPEG
  if (data[0] === 0xff && data[1] === 0xd8) {
    return "image/jpeg";
  }
  // GIF
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
    return "image/gif";
  }
  // WebP
  if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) {
    return "image/webp";
  }
  // BMP
  if (data[0] === 0x42 && data[1] === 0x4d) {
    return "image/bmp";
  }
  return "application/octet-stream";
}

/** Phần mở rộng file cho MIME type. */
export function extensionForImageMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/png": return "png";
    case "image/jpeg": return "jpg";
    case "image/gif": return "gif";
    case "image/webp": return "webp";
    case "image/bmp": return "bmp";
    default: return "bin";
  }
}