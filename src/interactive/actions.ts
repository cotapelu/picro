// Backend actions - pure functions for interactive mode
// No React dependencies

import type { AgentSessionRuntimeInterface } from '../runtime/index.js';

export interface ActionResult {
  type: 'paste' | 'text' | 'error';
  text?: string;
  filepath?: string;
  error?: string;
}

/**
 * Paste image from clipboard and save to file
 */
export async function pasteImageFromClipboard(cwd: string): Promise<ActionResult> {
  try {
    let pngBuffer: Buffer;
    try {
      const { execFileSync } = await import('node:child_process');
      pngBuffer = execFileSync('wl-paste', ['--no-size', '--type', 'image/png']);
    } catch (e1) {
      try {
        const { execFileSync } = await import('node:child_process');
        pngBuffer = execFileSync('xclip', ['-selection', 'clipboard', '-t', 'image/png', '-o']);
      } catch (e2) {
        return { type: 'error', error: 'No image in clipboard or missing wl-paste/xclip' };
      }
    }
    const fs = await import('node:fs');
    const path = await import('node:path');
    const timestamp = Date.now();
    const filename = `pasted-${timestamp}.png`;
    const filepath = path.join(cwd, filename);
    fs.writeFileSync(filepath, pngBuffer);
    return { type: 'paste', filepath };
  } catch (err: any) {
    return { type: 'error', error: `Paste failed: ${err.message}` };
  }
}

/**
 * Read text from clipboard (fallback to clipboardy package)
 */
export async function readTextFromClipboard(): Promise<ActionResult> {
  try {
    const clipboardy = await import('clipboardy');
    const text = await clipboardy.default.read();
    return { type: 'text', text };
  } catch (err: any) {
    return { type: 'error', error: `Clipboard read failed: ${err.message}` };
  }
}

/**
 * Open external editor and return edited text
 */
export async function editWithExternalEditor(initialText: string, cwd: string): Promise<ActionResult> {
  try {
    const editor = process.env.EDITOR || process.env.VISUAL || 'vim';
    const fs = await import('node:fs');
    const path = await import('node:path');
    const os = await import('node:os');
    const { spawnSync } = await import('node:child_process');
    const tmpdir = os.tmpdir();
    const dir = fs.mkdtempSync(path.join(tmpdir, 'picro-'));
    const filepath = path.join(dir, 'edit.txt');
    try {
      fs.writeFileSync(filepath, initialText || '', 'utf-8');
      spawnSync(editor, [filepath], { stdio: 'inherit', cwd });
      const newText = fs.readFileSync(filepath, 'utf-8');
      return { type: 'text', text: newText };
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (err: any) {
    return { type: 'error', error: `External edit failed: ${(err as Error).message}` };
  }
}

/**
 * Generate debug log and write to temp file
 */
export async function generateDebugLog(runtime: AgentSessionRuntimeInterface): Promise<ActionResult> {
  try {
    const rt = runtime as any;
    const session = rt.session;
    const { messages } = session;
    const stats = session.getSessionStats?.();
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const debugLogPath = join(tmpdir(), `picro-debug-${Date.now()}.log`);
    const lines: string[] = [
      `Picro Debug Log`,
      `Generated: ${new Date().toISOString()}`,
      `CWD: ${rt.cwd}`,
      `Session: ${stats?.sessionFile || 'in-memory'}`,
      `Model: ${session.model?.provider}/${session.model?.id}`,
      `Thinking level: ${session.thinkingLevel}`,
      `Messages: ${messages.length} total`,
      `  User: ${stats?.userMessages || 0}`,
      `  Assistant: ${stats?.assistantMessages || 0}`,
      `  ToolCalls: ${stats?.toolCalls || 0}`,
      `  ToolResults: ${stats?.toolResults || 0}`,
      `Tokens: in=${stats?.tokens?.input || 0}, out=${stats?.tokens?.output || 0}, total=${stats?.tokens?.total || 0}`,
      `Cost: $${stats?.cost?.toFixed(4) || 0}`,
      '',
      '=== Full Message History (JSONL) ===',
    ];
    for (const msg of messages) {
      lines.push(JSON.stringify(msg));
    }
    const { writeFileSync } = await import('node:fs');
    writeFileSync(debugLogPath, lines.join('\n'), 'utf-8');
    return { type: 'text', text: debugLogPath };
  } catch (err: any) {
    return { type: 'error', error: `Debug failed: ${(err as Error).message}` };
  }
}

/**
 * Get file path autocomplete suggestions using fd
 */
export async function getPathSuggestions(cwd: string, partial: string): Promise<string[]> {
  try {
    const { execFile } = await import('node:child_process');
    return new Promise<string[]>((resolve) => {
      execFile('fd', ['--color', 'never', '--base-path', '.', '--', partial + '*'], { cwd }, (err, stdout) => {
        if (err) resolve([]);
        else {
          const files = stdout.trim().split('\n').filter(Boolean);
          resolve(files);
        }
      });
    });
  } catch (e) {
    console.error('fd autocomplete error:', e);
    return [];
  }
}

/**
 * Execute bash command (for !cmd syntax)
 */
export async function executeBashCommand(cmd: string, cwd: string): Promise<{ output: string; error?: boolean; errorMessage?: string }> {
  try {
    const { execSync } = await import('node:child_process');
    const output = execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe' });
    return { output };
  } catch (err: any) {
    return { output: err.message || 'Error', error: true, errorMessage: err.message };
  }
}
