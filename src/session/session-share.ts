// Session Share - chia sẻ phiên qua Radius hoặc gist
// Bắt chước pi-mono core/session-share.ts

import { writeFileSync, mkdirSync, rmSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { spawn, spawnSync } from "child_process";
import { randomUUID } from "crypto";
import type { AgentSessionInterface } from "../runtime/agent-session-interfaces.js";
import { serializeSessionBranch } from "./session-export.js";
import { createShareTrailingEntries } from "./bug-report.js";

const RADIUS_GATEWAY = "https://radius.earendil.net";

export interface SessionShareOptions {
  destination?: "radius" | "gist";
}

/** Chia sẻ phiên hiện tại. */
export async function shareSession(
  session: AgentSessionInterface,
  options: SessionShareOptions = {},
  callbacks: {
    showStatus: (message: string) => void;
    showError: (message: string) => void;
    copyToClipboard?: (text: string) => Promise<void>;
  },
): Promise<void> {
  const tempDir = mkdtempSync(join(tmpdir(), "pi-share-"));
  const jsonlFile = join(tempDir, "session.jsonl");
  const htmlFile = join(tempDir, "session.html");

  try {
    // Export session to JSONL
    try {
      const sessionManager = session.sessionManager as any;
      const entries = sessionManager.getEntries();
      const header = sessionManager.getHeader?.();
      const lines = [JSON.stringify(header), ...entries.map((e: any) => JSON.stringify(e))];
      writeFileSync(jsonlFile, `${lines.join("\n")}\n`, "utf8");
    } catch (error: unknown) {
      callbacks.showError(`Failed to export session: ${error instanceof Error ? error.message : "Unknown error"}`);
      return;
    }

    const destination = options.destination ?? "gist";
    
    if (destination === "radius") {
      if (await tryShareViaRadius(jsonlFile, session, callbacks)) return;
      callbacks.showError("Radius authentication is not configured. Run '/login radius' first.");
      return;
    }

    // Default to gist
    await shareViaGist(htmlFile, jsonlFile, session, callbacks);
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/** Thử chia sẻ qua Radius. */
async function tryShareViaRadius(
  jsonlFile: string,
  session: AgentSessionInterface,
  callbacks: { showStatus: (message: string) => void; showError: (message: string) => void; copyToClipboard?: (text: string) => Promise<void> },
): Promise<boolean> {
  // Check if radius provider is available
  const provider = (session as any).modelRuntime?.getProvider?.("radius");
  if (!provider) return false;

  // Get auth token
  const auth = await (session as any).modelRuntime?.getAuth?.("radius", { minOAuthValidityMs: 5 * 60_000 });
  const token = auth?.apiKey;
  if (!token) return false;

  callbacks.showStatus("Uploading to Radius...");

  try {
    const body = require("fs").readFileSync(jsonlFile);
    const url = new URL("/v1/artifacts", RADIUS_GATEWAY);
    url.searchParams.set("visibility", "organization");
    url.searchParams.set("title", "Pi session");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-ndjson",
        "Content-Length": String(body.byteLength),
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      callbacks.showError(`Failed to upload Radius artifact: ${text || response.statusText}`);
      return true;
    }

    const json = (await response.json().catch(() => null)) as { artifact?: { canonical_url: string } } | null;
    if (!json?.artifact) {
      callbacks.showError("Failed to upload Radius artifact: no artifact URL returned");
      return true;
    }

    const shareUrl = json.artifact.canonical_url;
    callbacks.showStatus(`Share URL: ${shareUrl}`);
    if (callbacks.copyToClipboard) await callbacks.copyToClipboard(shareUrl);
    return true;
  } catch (error: unknown) {
    callbacks.showError(`Failed to upload Radius artifact: ${error instanceof Error ? error.message : "Unknown error"}`);
    return true;
  }
}

/** Chia sẻ qua GitHub gist. */
async function shareViaGist(
  htmlFile: string,
  jsonlFile: string,
  session: AgentSessionInterface,
  callbacks: { showStatus: (message: string) => void; showError: (message: string) => void; copyToClipboard?: (text: string) => Promise<void> },
): Promise<void> {
  // Check gh CLI
  try {
    const authResult = spawnSync("gh", ["auth", "status"], { encoding: "utf-8" });
    if (authResult.status !== 0) {
      callbacks.showError("GitHub CLI is not logged in. Run 'gh auth login' first.");
      return;
    }
  } catch {
    callbacks.showError("GitHub CLI (gh) is not installed. Install it from https://cli.github.com/");
    return;
  }

  // Export HTML (simplified - just use JSONL for now)
  const htmlContent = `<!DOCTYPE html><html><body><pre>${require("fs").readFileSync(jsonlFile, "utf8")}</pre></body></html>`;
  writeFileSync(htmlFile, htmlContent, "utf8");

  callbacks.showStatus("Creating gist...");

  try {
    const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
      const proc = spawn("gh", ["gist", "create", "--public=false", htmlFile]);
      let stdout = "";
      let stderr = "";
      proc.stdout?.on("data", (data) => { stdout += data.toString(); });
      proc.stderr?.on("data", (data) => { stderr += data.toString(); });
      proc.on("error", (error) => resolve({ stdout, stderr: stderr || error.message, code: null }));
      proc.on("close", (code) => resolve({ stdout, stderr, code }));
    });

    if (result.code !== 0) {
      callbacks.showError(`Failed to create gist: ${result.stderr?.trim() || "Unknown error"}`);
      return;
    }

    const gistUrl = result.stdout?.trim();
    const gistId = gistUrl?.split("/").pop();
    if (!gistId) {
      callbacks.showError("Failed to parse gist ID from gh output");
      return;
    }

    const shareUrl = `https://pi.dev/share/${gistId}`;
    callbacks.showStatus(`Share URL: ${shareUrl}\nGist: ${gistUrl}`);
    if (callbacks.copyToClipboard) await callbacks.copyToClipboard(shareUrl);
  } catch (error: unknown) {
    callbacks.showError(`Failed to create gist: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}