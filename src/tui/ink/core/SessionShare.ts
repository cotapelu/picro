// SessionShare - chia sẻ phiên qua Radius hoặc gist riêng tư
// Bắt chước nguyên tắc pi-mono modes/interactive/session-share.ts:
//   - Xuất phiên ra JSONL kèm siêu dữ liệu trình bày (system prompt, tool schemas)
//   - Ưu tiên Radius; destination "radius" thì báo lỗi nếu chưa đăng nhập
//   - Gist là phương án dự phòng: cần gh CLI đăng nhập
//   - Loader hủy được trong suốt upload; hủy thì khôi phục editor
//   - Dọn thư mục tạm trong finally
// Port sang TSX riêng, khon copy code truc iep.

import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { hyperlink } from "./TerminalImage.js";
import { getTheme } from "../theme/index.js";

export type SessionShareDestination = "radius" | "gist";

/** Bề mặt phiên tối thiểu cần cho chia sẻ. */
export interface ShareableSession {
  sessionManager: {
    getLeafId(): string | null;
    getEntries(): unknown[];
  };
  state: {
    systemPrompt?: string;
    tools: Array<{ name: string; description?: string; parameters?: unknown }>;
  };
  settingsManager: {
    getSessionShareDestination(): SessionShareDestination;
  };
  modelRuntime?: {
    getProvider?(id: string): unknown;
    getAuth?(provider: string, options?: unknown): Promise<unknown>;
  };
}

export interface SessionShareContext {
  session: ShareableSession;
  showStatus: (message: string) => void;
  showError: (message: string) => void;
  /** Trạng thái "đang tải lên" do UI hiển thị. */
  setLoading?: (message: string | undefined, onAbort?: () => void) => void;
}

/** Entry cuối "share" chứa system prompt và schema công cụ cho trình xem phiên. */
export function createShareTrailingEntries(
  session: ShareableSession,
  parentId: string | null,
  timestamp: string,
): object[] {
  return [
    {
      type: "custom",
      customType: "share",
      id: randomId(),
      parentId,
      timestamp,
      data: {
        systemPrompt: session.state.systemPrompt,
        tools: session.state.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      },
    },
  ];
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Tuần tự hóa nhánh hiện tại ra JSONL kèm entry trailing.
 *
 * The output must stay a valid tree: every entry's parentId has to name an id
 * that exists in the same file. This used to replace each entry's id with a
 * fresh random one while leaving parentId pointing at the ORIGINAL id, so all
 * three links dangled and a share viewer could not rebuild the branch at all.
 * The original ids are preserved instead.
 */
export function serializeSessionBranch(session: ShareableSession): string {
  const entries = session.sessionManager.getEntries();
  const leafId = session.sessionManager.getLeafId();
  const lines: string[] = [];
  const timestamp = new Date().toISOString();
  for (const entry of entries) {
    lines.push(JSON.stringify(entry as object));
  }
  // The trailing entry must hang off the id that is actually present in the
  // file: the last serialised entry, falling back to the session leaf.
  const lastId = (entries[entries.length - 1] as { id?: string } | undefined)?.id ?? leafId;
  for (const trailing of createShareTrailingEntries(session, lastId, timestamp)) {
    lines.push(JSON.stringify(trailing));
  }
  return lines.join("\n");
}

/** Chia sẻ phiên: ưu tiên Radius, dự phòng gist. */
export async function shareSession(context: SessionShareContext): Promise<void> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "picro-share-"));
  const jsonlFile = path.join(tempDir, "session.jsonl");
  const htmlFile = path.join(tempDir, "session.html");

  try {
    fs.writeFileSync(jsonlFile, serializeSessionBranch(context.session), "utf-8");
    const destination = context.session.settingsManager.getSessionShareDestination();

    if (destination !== "gist") {
      if (await shareViaRadius(jsonlFile, context)) return;
      if (destination === "radius") {
        context.showError("Chưa cấu hình xác thực Radius. Chạy '/login radius' trước.");
        return;
      }
    }

    // Gist yêu cầu gh đăng nhập.
    const ghCheck = spawnSyncSafe("gh", ["auth", "status"]);
    if (ghCheck.status !== 0) {
      context.showError("GitHub CLI chưa đăng nhập. Chạy 'gh auth login' trước.");
      return;
    }
    fs.writeFileSync(htmlFile, exportPlaceholderHtml(), "utf-8");
    await shareViaGist(htmlFile, context);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Bỏ qua lỗi dọn dẹp.
    }
  }
}

function exportPlaceholderHtml(): string {
  const t = getTheme();
  return `<!doctype html><meta charset="utf-8"><title>Picro session</title><body><pre>${t.fg("muted", "(phiên picro)")}</pre></body>`;
}

async function shareViaRadius(file: string, context: SessionShareContext): Promise<boolean> {
  const provider = context.session.modelRuntime?.getProvider?.("radius");
  if (!provider) return false;
  const auth = await context.session.modelRuntime?.getAuth?.("radius", { minOAuthValidityMs: 5 * 60_000 });
  const token = extractToken(auth);
  if (!token) return false;

  return new Promise<boolean>((resolve) => {
    context.setLoading?.("Đang tải lên Radius...", () => {
      resolve(true);
    });

    const body = fs.readFileSync(file);
    const url = new URL("https://gateway.radius.example/v1/artifacts");
    url.searchParams.set("visibility", "organization");
    url.searchParams.set("title", "Phiên picro");

    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-ndjson",
        "Content-Length": String(body.byteLength),
      },
      body: body as unknown as BodyInit,
    })
      .then(async (response) => {
        context.setLoading?.(undefined);
        const json = (await response.json().catch(() => null)) as
          | { artifact?: { canonical_url?: string }; error?: string }
          | null;
        if (!response.ok || !json?.artifact?.canonical_url) {
          context.showError(`Tải lên Radius thất bại: ${json?.error || response.statusText}`);
          resolve(true);
          return;
        }
        const shareUrl = json.artifact.canonical_url;
        context.showStatus(`URL chia sẻ: ${hyperlink(shareUrl, shareUrl)}`);
        resolve(true);
      })
      .catch((error: unknown) => {
        context.setLoading?.(undefined);
        context.showError(`Tải lên Radius thất bại: ${error instanceof Error ? error.message : "Không rõ"}`);
        resolve(true);
      });
  });
}

async function shareViaGist(file: string, context: SessionShareContext): Promise<void> {
  return new Promise<void>((resolve) => {
    context.setLoading?.("Đang tạo gist...", () => {
      context.showStatus("Đã hủy chia sẻ");
      resolve();
    });

    const proc = spawn("gh", ["gist", "create", "--public=false", file]);
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    // spawn thất bại phát 'error' và có thể không phát 'close'.
    proc.on("error", (error) => {
      context.setLoading?.(undefined);
      context.showError(`Tạo gist thất bại: ${error.message}`);
      resolve();
    });
    proc.on("close", (code) => {
      context.setLoading?.(undefined);
      if (code !== 0) {
        context.showError(`Tạo gist thất bại: ${stderr.trim() || "Không rõ"}`);
        resolve();
        return;
      }
      const gistUrl = stdout.trim();
      const gistId = gistUrl.split("/").pop();
      if (!gistId) {
        context.showError("Không đọc được ID gist từ đầu ra gh");
        resolve();
        return;
      }
      const previewUrl = `https://gist.picro.dev/${gistId}`;
      context.showStatus(`URL chia sẻ: ${hyperlink(previewUrl, previewUrl)}\nGist: ${hyperlink(gistUrl, gistUrl)}`);
      resolve();
    });
  });
}

function extractToken(auth: unknown): string | undefined {
  if (!auth || typeof auth !== "object") return undefined;
  const credential = (auth as { apiKey?: string; token?: string }).apiKey ?? (auth as { token?: string }).token;
  return typeof credential === "string" && credential.length > 0 ? credential : undefined;
}

function spawnSyncSafe(command: string, args: string[]): { status: number | null } {
  try {
    const result = spawnSync(command, args, { encoding: "utf-8", stdio: "ignore" });
    return { status: result.status };
  } catch {
    return { status: 1 };
  }
}
