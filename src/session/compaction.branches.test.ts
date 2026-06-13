// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for compaction module utilities.
 * Covers shouldCompact, findCutPoint, prepareCompaction.
 */

import { describe, it, expect } from 'vitest';
import { shouldCompact, findCutPoint, prepareCompaction } from './compaction.js';
import type { AgentMessage, AssistantMessage } from './agent-types.js';
import type { SessionEntry } from './session-manager.js';

function mkMessage(role: 'user' | 'assistant' | 'toolResult', tokenCount: number): AgentMessage {
  const text = 'x'.repeat(tokenCount * 4); // 4 chars per token approx
  const base: AgentMessage = {
    role,
    content: [{ type: 'text', text }],
  };
  if (role === 'assistant') {
    return {
      ...base,
      usage: { total: tokenCount },
    } as AssistantMessage;
  }
  return base;
}

describe('shouldCompact', () => {
  it('returns false when compaction disabled', () => {
    expect(shouldCompact(1000, 8000, { enabled: false, reserveTokens: 1000, keepRecentTokens: 2000 })).toBe(false);
  });

  it('returns false when tokens are within reserve limit', () => {
    // contextTokens=4000, contextWindow=8000, reserveTokens=3000 -> diff=5000, 4000 <= diff -> false
    expect(shouldCompact(4000, 8000, { enabled: true, reserveTokens: 3000, keepRecentTokens: 2000 })).toBe(false);
  });

  it('returns true when tokens exceed reserve limit', () => {
    // tokens=6001, cw=8000, reserve=2000 -> diff=6000, 6001 > diff -> true
    expect(shouldCompact(6001, 8000, { enabled: true, reserveTokens: 2000, keepRecentTokens: 2000 })).toBe(true);
  });
});

describe('findCutPoint', () => {
  it('returns (0, false) when total tokens < keepRecentTokens', () => {
    const msgs = [
      mkMessage('user', 10),
      mkMessage('assistant', 10),
    ];
    const result = findCutPoint(msgs, 1000);
    expect(result.firstKeptIndex).toBe(0);
    expect(result.isSplitTurn).toBe(false);
  });

  it('finds cut point at assistant (split turn)', () => {
    const msgs = [
      mkMessage('user', 100),    // index 0
      mkMessage('assistant', 200), // index 1
      mkMessage('user', 100),    // index 2 (last)
    ];
    // Threshold 250: accumulate from last: idx2=100 (<250), idx1=200 -> total=300>=250 => cut at idx1 (assistant)
    const result = findCutPoint(msgs, 250);
    expect(result.firstKeptIndex).toBe(1);
    expect(result.isSplitTurn).toBe(true);
  });

  it('sets isSplitTurn false when first kept message is user (last)', () => {
    const msgs = [
      mkMessage('user', 50),
      mkMessage('assistant', 50),
      mkMessage('user', 300), // last
    ];
    // Threshold 250: start at last 300 >=250 => cut at idx2 (user)
    const result = findCutPoint(msgs, 250);
    expect(result.firstKeptIndex).toBe(2);
    expect(result.isSplitTurn).toBe(false);
  });
});

describe('prepareCompaction', () => {
  it('returns null when entries empty', () => {
    const result = prepareCompaction([], { enabled: true, reserveTokens: 1000, keepRecentTokens: 500 });
    expect(result).toBeNull();
  });

  it('handles single message entry (kept)', () => {
    const msg = mkMessage('user', 50);
    const entry: SessionEntry = {
      type: 'message',
      id: 'm1',
      parentId: null,
      timestamp: Date.now().toString(),
      message: msg,
    };
    const result = prepareCompaction([entry], { enabled: true, reserveTokens: 1000, keepRecentTokens: 500 });
    expect(result).not.toBeNull();
    expect(result!.messagesToSummarize).toHaveLength(0);
    expect(result!.firstKeptEntryId).toBe('m1');
  });
});
