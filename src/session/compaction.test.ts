// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for compaction.ts exported utilities.
 */

import { describe, it, expect } from 'vitest';

import {
  estimateTokens,
  shouldCompact,
  DEFAULT_COMPACTION_SETTINGS,
  createFileOps,
  extractFileOpsFromMessage,
  computeFileLists,
  formatFileOperations,
} from './compaction.js';

import type { AgentMessage } from './agent-types.js';

describe('estimateTokens', () => {
  it('estimates user message tokens from text content', () => {
    const msg: AgentMessage = { role: 'user', content: [{ type: 'text', text: 'Hello world' }] };
    expect(estimateTokens(msg)).toBe(3); // 11 chars /4 => ceil 3
  });

  it('handles multi‑block user message', () => {
    const msg: AgentMessage = { role: 'user', content: [
      { type: 'text', text: 'Part1' },
      { type: 'text', text: 'Part2' },
    ]};
    expect(estimateTokens(msg)).toBe(3); // 10 chars /4 => ceil 3
  });

  it('handles assistant message with text and thinking', () => {
    const msg: AgentMessage = { role: 'assistant', content: [
      { type: 'text', text: 'Answer' },
      { type: 'thinking', thinking: 'Let me think.' },
    ]};
    // 6+12=18 chars -> ceil(18/4)=5
    expect(estimateTokens(msg)).toBe(5);
  });
});

describe('shouldCompact', () => {
  const contextWindow = 128000;
  it('returns false if compaction disabled', () => {
    const settings = { ...DEFAULT_COMPACTION_SETTINGS, enabled: false };
    expect(shouldCompact(1000, contextWindow, settings)).toBe(false);
  });

  it('returns false when contextTokens below threshold', () => {
    expect(shouldCompact(1000, contextWindow, DEFAULT_COMPACTION_SETTINGS)).toBe(false);
  });

  it('returns true when contextTokens exceeds threshold', () => {
    // reserveTokens=16384 → threshold = 128000-16384=111616
    expect(shouldCompact(120000, contextWindow, DEFAULT_COMPACTION_SETTINGS)).toBe(true);
  });
});

describe('createFileOps', () => {
  it('creates empty file ops sets', () => {
    const ops = createFileOps();
    expect(ops.read).toBeInstanceOf(Set);
    expect(ops.written).toBeInstanceOf(Set);
    expect(ops.edited).toBeInstanceOf(Set);
    expect(ops.read.size).toBe(0);
  });
});

describe('extractFileOpsFromMessage', () => {
  it('extracts read/write/edit from tool calls', () => {
    const message: AgentMessage = {
      role: 'assistant',
      content: [
        { type: 'toolCall', name: 'read', arguments: { path: '/a' } },
        { type: 'toolCall', name: 'write', arguments: { path: '/b' } },
        { type: 'toolCall', name: 'edit', arguments: { path: '/c' } },
      ] as any,
    };
    const fileOps = createFileOps();
    extractFileOpsFromMessage(message, fileOps);
    expect(fileOps.read.has('/a')).toBe(true);
    expect(fileOps.written.has('/b')).toBe(true);
    expect(fileOps.edited.has('/c')).toBe(true);
  });

  it('ignores non‑assistant messages', () => {
    const message: AgentMessage = { role: 'user', content: [] };
    const fileOps = createFileOps();
    extractFileOpsFromMessage(message, fileOps);
    expect(fileOps.read.size).toBe(0);
  });
});

describe('computeFileLists', () => {
  it('computes read‑only and modified file lists', () => {
    const fileOps = {
      read: new Set(['/a', '/b', '/c']),
      written: new Set(['/b']),
      edited: new Set(['/c', '/d']),
    } as any;
    const result = computeFileLists(fileOps);
    expect(result.readFiles.sort()).toEqual(['/a']);
    expect(result.modifiedFiles.sort()).toEqual(['/b', '/c', '/d']);
  });

  it('returns empty arrays when no file ops', () => {
    const fileOps = { read: new Set(), written: new Set(), edited: new Set() } as any;
    const result = computeFileLists(fileOps);
    expect(result.readFiles).toEqual([]);
    expect(result.modifiedFiles).toEqual([]);
  });
});

describe('formatFileOperations', () => {
  it('formats XML‑like sections', () => {
    const read = ['/a', '/b'];
    const modified = ['/c'];
    const result = formatFileOperations(read, modified);
    expect(result).toContain('<read-files>');
    expect(result).toContain('</read-files>');
    expect(result).toContain('<modified-files>');
    expect(result).toContain('</modified-files>');
    expect(result).toContain('/a');
    expect(result).toContain('/b');
    expect(result).toContain('/c');
  });

  it('returns empty string when no files', () => {
    expect(formatFileOperations([], [])).toBe('');
  });
});