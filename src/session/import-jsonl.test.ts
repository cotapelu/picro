import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SessionManager } from './session-manager.js';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'sm-imp-')); });
afterEach(() => { rmSync(dir, { recursive: true, force: true }); });

describe('importFromJsonl', () => {
  it('imports a real JSONL session file', () => {
    // Tạo một phiên thật rồi export JSONL của nó
    const source = SessionManager.create('/project', join(dir, 'src'));
    source.appendMessage({ role: 'user', content: 'hello', timestamp: Date.now() });
    source.appendMessage({ role: 'assistant', content: [{ type: 'text', text: 'hi' }], timestamp: Date.now() });
    const file = source.getSessionFile()!;
    const jsonl = require('node:fs').readFileSync(file, 'utf8');

    const imported = SessionManager.importSession('/project', join(dir, 'dst'), jsonl);
    expect(imported.getSessionId()).toBe(source.getSessionId());
    expect(imported.getEntries()).toHaveLength(2);
    // Đã được ghi ra file để trở thành phiên lưu được.
    expect(require('node:fs').existsSync(imported.getSessionFile()!)).toBe(true);
  });
});
