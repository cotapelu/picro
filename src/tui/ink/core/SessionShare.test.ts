// SPDX-License-Identifier: Apache-2.0
/**
 * Session share serialisation + the external editor + wheel acceleration.
 *
 * serializeSessionBranch() used to rewrite every entry's id with a fresh random
 * value while leaving parentId pointing at the ORIGINAL id, so every link in the
 * exported file dangled and a share viewer could not rebuild the branch.
 */

import { describe, it, expect } from 'vitest';
import { createShareTrailingEntries, serializeSessionBranch, type ShareableSession } from './SessionShare.js';
import { WheelScrollAccelerator } from './WheelScroll.js';

function session(entries: unknown[], leafId: string | null = 'leaf-9'): ShareableSession {
  return {
    sessionManager: { getLeafId: () => leafId, getEntries: () => entries },
    state: { systemPrompt: 'sys', tools: [{ name: 'read', description: 'd', parameters: { a: 1 } }] },
    settingsManager: { getSessionShareDestination: () => 'gist' },
  } as ShareableSession;
}

const ENTRIES = [
  { type: 'message', id: 'e1', parentId: null, timestamp: '1' },
  { type: 'message', id: 'e2', parentId: 'e1', timestamp: '2' },
  { type: 'message', id: 'e3', parentId: 'e2', timestamp: '3' },
];

function parseLines(jsonl: string): any[] {
  return jsonl.split('\n').map((l) => JSON.parse(l));
}

describe('serializeSessionBranch', () => {
  it('emits one JSON object per entry', () => {
    expect(parseLines(serializeSessionBranch(session(ENTRIES)))).toHaveLength(ENTRIES.length + 1);
  });

  it('preserves the original ids', () => {
    const ids = parseLines(serializeSessionBranch(session(ENTRIES))).map((e) => e.id);
    expect(ids.slice(0, 3)).toEqual(['e1', 'e2', 'e3']);
  });

  it('emits a self-consistent parent chain (no dangling parentId)', () => {
    const lines = parseLines(serializeSessionBranch(session(ENTRIES)));
    const ids = new Set(lines.map((l) => l.id));
    const dangling = lines.filter((l) => l.parentId !== null && !ids.has(l.parentId));
    expect(dangling).toEqual([]);
  });

  it('hangs the trailing share entry off the last serialised entry', () => {
    const lines = parseLines(serializeSessionBranch(session(ENTRIES)));
    expect(lines[lines.length - 1].parentId).toBe('e3');
  });

  it('falls back to the leaf id when there are no entries', () => {
    const lines = parseLines(serializeSessionBranch(session([], 'leaf-9')));
    expect(lines).toHaveLength(1);
    expect(lines[0].parentId).toBe('leaf-9');
  });

  it('keeps the entries branch structure of a resumed session intact', () => {
    const lines = parseLines(serializeSessionBranch(session(ENTRIES)));
    expect(lines[1].parentId).toBe(lines[0].id);
    expect(lines[2].parentId).toBe(lines[1].id);
  });
});

describe('createShareTrailingEntries', () => {
  it('carries the system prompt and tool schemas', () => {
    const [entry] = createShareTrailingEntries(session(ENTRIES), 'e3', '2024-01-01T00:00:00Z') as any[];
    expect(entry.type).toBe('custom');
    expect(entry.customType).toBe('share');
    expect(entry.data.systemPrompt).toBe('sys');
    expect(entry.data.tools).toEqual([{ name: 'read', description: 'd', parameters: { a: 1 } }]);
  });

  it('uses the parent id it is given', () => {
    const [entry] = createShareTrailingEntries(session(ENTRIES), 'parent-1', 'ts') as any[];
    expect(entry.parentId).toBe('parent-1');
    expect(typeof entry.id).toBe('string');
    expect(entry.id.length).toBeGreaterThan(0);
  });

  it('produces distinct ids for successive calls', () => {
    const a = createShareTrailingEntries(session(ENTRIES), 'p', 'ts') as any[];
    const b = createShareTrailingEntries(session(ENTRIES), 'p', 'ts') as any[];
    expect(a[0].id).not.toBe(b[0].id);
  });
});

describe('WheelScrollAccelerator', () => {
  it('honours a fixed line count', () => {
    const accel = new WheelScrollAccelerator(3);
    expect([accel.next(-1, 0), accel.next(-1, 50), accel.next(-1, 100)]).toEqual([3, 3, 3]);
  });

  it('treats a fractional fixed count as at least one line', () => {
    const accel = new WheelScrollAccelerator(2.7);
    expect(accel.next(1, 0)).toBe(2);
  });

  it('accelerates on a steady gesture', () => {
    const accel = new WheelScrollAccelerator('auto');
    const out: number[] = [];
    let t = 0;
    for (let i = 0; i < 6; i++) { t += 20; out.push(accel.next(-1, t)); }
    // 100ms/20ms = 5 lines per notch once the gesture is established.
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(5);
    expect(out.slice(2).every((v) => v === 5)).toBe(true);
  });

  it('resets after a pause longer than the gesture window', () => {
    const accel = new WheelScrollAccelerator('auto');
    let t = 0;
    for (let i = 0; i < 4; i++) { t += 20; accel.next(-1, t); }
    t += 1000;
    expect(accel.next(-1, t)).toBe(1);
  });

  it('resets when the direction flips', () => {
    const accel = new WheelScrollAccelerator('auto');
    let t = 0;
    for (let i = 0; i < 4; i++) { t += 20; accel.next(-1, t); }
    t += 20;
    expect(accel.next(1, t)).toBe(1);
  });

  it('does not accelerate burst events (<5ms)', () => {
    const accel = new WheelScrollAccelerator('auto');
    const out: number[] = [];
    let t = 0;
    for (let i = 0; i < 5; i++) { t += 1; out.push(accel.next(-1, t)); }
    expect(out).toEqual([1, 1, 1, 1, 1]);
  });

  it('caps the accelerated speed', () => {
    const accel = new WheelScrollAccelerator('auto');
    const out: number[] = [];
    let t = 0;
    for (let i = 0; i < 30; i++) { t += 10; out.push(accel.next(-1, t)); }
    expect(Math.max(...out)).toBe(6);
  });

  it('setLines() resets the gesture state', () => {
    const accel = new WheelScrollAccelerator('auto');
    let t = 0;
    for (let i = 0; i < 4; i++) { t += 20; accel.next(-1, t); }
    accel.setLines(2);
    expect(accel.next(-1, t += 20)).toBe(2);
  });
});
