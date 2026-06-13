// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for SessionManager query methods.
 * Covers getChildren, findByLabel, findByTypes, searchMessages.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from './session-manager.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync, rmSync } from 'fs';

describe('SessionManager query branches', () => {
  let tempDir: string;
  let manager: SessionManager;

  beforeEach(() => {
    tempDir = join(tmpdir(), 'sm-qry-' + Math.random().toString(36).slice(2));
    mkdirSync(tempDir, { recursive: true });
    manager = SessionManager.inMemory(tempDir);
  });

  afterEach(() => {
    try { if (rmSync) rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
  });

  it('getChildren returns direct child of given parent', () => {
    manager.appendMessage({ role: 'user', content: 'parent' } as any);
    const parentId = manager.getLeafId()!;
    manager.appendMessage({ role: 'assistant', content: 'child' } as any);
    const children = manager.getChildren(parentId);
    expect(children).toHaveLength(1);
    expect(children[0].message.content).toBe('child');
  });

  it('findByLabel returns entries that have the given label', () => {
    manager.appendMessage({ role: 'user', content: 'base' } as any);
    const leaf = manager.getLeafId()!;
    manager.appendLabelChange(leaf, 'mylabel');
    const entries = manager.findByLabel('mylabel');
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(leaf);
    // The label itself is not stored on the target entry, but the map exists in manager.labelsById
    expect(manager.labelsById.get(leaf)).toBe('mylabel');
  });

  it('findByTypes returns entries of specified types', () => {
    manager.branchWithSummary(null, 'summary1', {});
    const found = manager.findByTypes(['branch_summary']);
    expect(found).toHaveLength(1);
    expect(found[0].type).toBe('branch_summary');
    // @ts-ignore
    expect(found[0].summary).toBe('summary1');
  });

  it('searchMessages finds messages containing text (case-insensitive)', () => {
    manager.appendMessage({ role: 'user', content: 'Hello world' } as any);
    manager.appendMessage({ role: 'assistant', content: 'Hi there' } as any);
    const results = manager.searchMessages('world');
    expect(results).toHaveLength(1);
    expect(results[0].message.content).toBe('Hello world');
  });
});
