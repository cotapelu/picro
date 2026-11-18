// Image Convert - chuyển đổi ảnh sang PNG
// Bắt chước pi-mono utils/image-convert.ts

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { tmpdir, platform } from "os";
import { join } from "path";
import { spawnSync } from "child_process";

let pngTranscoderPromise: Promise<void> | null = null;
let pngTranscoderAvailable = false;

/** Đảm bảo PNG transcoder khả dụng (tải image-convert hoặc dùng lệnh hệ thống). */
export async function ensurePngTranscoder(onProgress?: (msg: string) => void): Promise<void> {
  if (pngTranscoderPromise) return pngTranscoderPromise;
  
  pngTranscoderPromise = (async () => {
    // Check for system tools
    const tools = [
      platform() === "darwin" ? "sips" : null,
      "magick",
      "convert",
    ].filter(Boolean) as string[];
    
    for (const tool of tools) {
      try {
        spawnSync(tool, ["-version"], { stdio: "ignore" });
        pngTranscoderAvailable = true;
        return;
      } catch {
        // Tool not available
      }
    }
    
    onProgress?.("PNG transcoder not available; image paste may not work");
  })();
  
  return pngTranscoderPromise;
}

/** Kiểm tra PNG transcoder có sẵn sàng không. */
export function isPngTranscoderAvailable(): boolean {
  return pngTranscoderAvailable;
}

/** Chuyển đổi ảnh sang PNG (dùng cho clipboard paste). */
export async function convertToPng(inputPath: string, outputPath: string): Promise<void> {
  // Fallback to system tools
  const tools = platform() === "darwin" 
    ? ["sips", "-s", "format", "png", inputPath, "--out", outputPath]
    : ["magick", inputPath, outputPath];
  
  for (const tool of tools) {
    try {
      const [cmd, ...args] = tool.split(" ");
      const result = spawnSync(cmd, args, { encoding: "utf-8" });
      if (result.status === 0) return;
    } catch {
      // Try next tool
    }
  }
  
  throw new Error("No PNG transcoder available");
}

/** Chuyển đổi Buffer ảnh sang PNG. */
export async function convertBufferToPng(buffer: Buffer, mimeType: string): Promise<Buffer> {
  const tempDir = join(process.cwd(), ".pi-temp");
  const inputPath = `${tempDir}/input.${mimeType.split("/")[1] || "png"}`;
  const outputPath = `${tempDir}/output.png`;
  
  try {
    await import("fs").then(fs => fs.promises.mkdir(tempDir, { recursive: true }));
    await import("fs").then(fs => fs.promises.writeFile(inputPath, buffer));
    await convertToPng(inputPath, outputPath);
    const result = readFileSync(outputPath);
    return result;
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}