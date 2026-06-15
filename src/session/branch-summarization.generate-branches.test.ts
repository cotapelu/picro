// SPDX-License-Identifier: Apache-2.0
/**
 * Branch tests for generateBranchSummary in branch-summarization.
 * Covers aborted signal, custom instructions, file ops merging, and result structure.
 */

import { describe, it, expect, vi } from 'vitest';
import { generateBranchSummary, SessionEntry } from './branch-summarization.js';

function makeMessageEntry(
  id: string,
  parentId: string | null,
  blocks: any[]
): SessionEntry {
  return {
    id,
    parentId,
    type: 'message',
    message: { role: 'assistant', content: blocks },
  };
}

function makeBranchSummaryEntry(
  id: string,
  parentId: string | null,
  details: { readFiles: string[]; modifiedFiles: string[] }
): SessionEntry {
  return {
    id,
    parentId,
    type: 'branch_summary',
    details,
  };
}

describe('generateBranchSummary branches', () => {
  describe('aborted signal', () => {
    it('returns aborted true when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const result = await generateBranchSummary([], {
        model: {},
        apiKey: 'key',
        signal: controller.signal,
      });
      expect(result.aborted).toBe(true);
      expect(result.summary).toBeUndefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('customInstructions handling', () => {
    const baseEntries: SessionEntry[] = [
      makeMessageEntry('m1', null, [{ type: 'text', text: 'hello' }]),
      makeMessageEntry('m2', 'm1', [{ type: 'text', text: 'world' }]),
    ];

    it('appends customInstructions when provided and replaceInstructions=false', async () => {
      const result = await generateBranchSummary(baseEntries, {
        model: {},
        apiKey: 'key',
        signal: new AbortController().signal,
        customInstructions: 'Focus on testing',
        replaceInstructions: false,
      });
      expect(result.summary).toContain('Additional focus: Focus on testing');
    });

    it('does not append customInstructions when replaceInstructions=true', async () => {
      const result = await generateBranchSummary(baseEntries, {
        model: {},
        apiKey: 'key',
        signal: new AbortController().signal,
        customInstructions: 'Focus on testing',
        replaceInstructions: true,
      });
      expect(result.summary).not.toContain('Additional focus: Focus on testing');
    });

    it('omits additional focus when customInstructions not provided', async () => {
      const result = await generateBranchSummary(baseEntries, {
        model: {},
        apiKey: 'key',
        signal: new AbortController().signal,
      });
      expect(result.summary).not.toContain('Additional focus');
    });
  });

  describe('file operations aggregation', () => {
    it('aggregates fileOps from messages and previous branch summaries', async () => {
      const entries: SessionEntry[] = [
        // previous branch summary contributed read files
        makeBranchSummaryEntry('b1', null, { readFiles: ['/old-read'], modifiedFiles: ['/old-mod'] }),
        // normal message with tool calls
        makeMessageEntry('m1', 'b1', [
          { type: 'toolCall', name: 'read', arguments: { path: '/new-read' } },
          { type: 'toolCall', name: 'write', arguments: { path: '/new-write' } },
          { type: 'toolCall', name: 'edit', arguments: { path: '/new-edit' } },
        ]),
      ];
      const result = await generateBranchSummary(entries, {
        model: {},
        apiKey: 'key',
        signal: new AbortController().signal,
      });
      expect(result.details).toBeDefined();
      expect(result.details!.readFiles.sort()).toEqual(['/new-read', '/old-read']);
      expect(result.details!.modifiedFiles.sort()).toEqual(['/new-edit', '/new-write', '/old-mod']);
    });

    it('includes file lists in summary body when present', async () => {
      const entries: SessionEntry[] = [
        makeMessageEntry('m1', null, [{ type: 'toolCall', name: 'read', arguments: { path: '/a' } }]),
      ];
      const result = await generateBranchSummary(entries, {
        model: {},
        apiKey: 'key',
        signal: new AbortController().signal,
      });
      expect(result.summary).toContain('<read-files>');
      expect(result.summary).toContain('/a');
      expect(result.summary).toContain('</read-files>');
    });

    it('omits file sections when no files', async () => {
      const entries: SessionEntry[] = [
        makeMessageEntry('m1', null, [{ type: 'text', text: 'no files' }]),
      ];
      const result = await generateBranchSummary(entries, {
        model: {},
        apiKey: 'key',
        signal: new AbortController().signal,
      });
      expect(result.summary).not.toContain('<read-files>');
      expect(result.summary).not.toContain('<modified-files>');
    });
  });

  describe('summary structure', () => {
    it('includes preamble and goal sections', async () => {
      const entries: SessionEntry[] = [
        makeMessageEntry('m1', null, [{ type: 'text', text: 'hi' }]),
      ];
      const result = await generateBranchSummary(entries, {
        model: {},
        apiKey: 'key',
        signal: new AbortController().signal,
      });
      expect(result.summary).toContain('The user explored a different conversation branch');
      expect(result.summary).toContain('## Goal');
    });

    it('counts message entries in goal', async () => {
      const entries: SessionEntry[] = [
        makeMessageEntry('m1', null, [{ type: 'text', text: 'a' }]),
        makeMessageEntry('m2', 'm1', [{ type: 'text', text: 'b' }]),
        makeMessageEntry('m3', 'm2', [{ type: 'text', text: 'c' }]),
      ];
      const result = await generateBranchSummary(entries, {
        model: {},
        apiKey: 'key',
        signal: new AbortController().signal,
      });
      expect(result.summary).toContain('User explored 3 messages in this branch');
    });
  });
});
