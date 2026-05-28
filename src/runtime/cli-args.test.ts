// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for cli-args.ts.
 */

import { describe, it, expect } from 'vitest';
import { parseArgs, isValidThinkingLevel, type Args } from './cli-args.js';

describe('isValidThinkingLevel', () => {
  it('returns true for valid levels', () => {
    expect(isValidThinkingLevel('off')).toBe(true);
    expect(isValidThinkingLevel('minimal')).toBe(true);
    expect(isValidThinkingLevel('low')).toBe(true);
    expect(isValidThinkingLevel('medium')).toBe(true);
    expect(isValidThinkingLevel('high')).toBe(true);
    expect(isValidThinkingLevel('xhigh')).toBe(true);
  });

  it('returns false for invalid levels', () => {
    expect(isValidThinkingLevel('ultra')).toBe(false);
    expect(isValidThinkingLevel('')).toBe(false);
  });
});

describe('parseArgs', () => {
  it('parses basic flags', () => {
    const args = parseArgs(['--help']);
    expect(args.help).toBe(true);

    const args2 = parseArgs(['--version']);
    expect(args2.version).toBe(true);
  });

  it('parses --mode', () => {
    const args = parseArgs(['--mode', 'json']);
    expect(args.mode).toBe('json');
    // stop parsing after mode consumes next
    expect((args as any).messages).toEqual([]);
  });

  it('parses boolean flags', () => {
    const args = parseArgs(['--no-session', '--offline']);
    expect(args.noSession).toBe(true);
    expect(args.offline).toBe(true);
  });

  it('parses string flags with values', () => {
    const args = parseArgs(['--provider', 'openai', '--model', 'gpt-4']);
    expect(args.provider).toBe('openai');
    expect(args.model).toBe('gpt-4');
  });

  it('parses append-system-prompt multiple times', () => {
    const args = parseArgs(['--append-system-prompt', 'first', '--append-system-prompt', 'second']);
    expect(args.appendSystemPrompt).toEqual(['first', 'second']);
  });

  it('collects messages and fileArgs', () => {
    const args = parseArgs(['msg1', 'file1.txt', 'msg2']);
    expect(args.messages).toEqual(['msg1', 'msg2']);
    expect(args.fileArgs).toEqual(['file1.txt']);
  });

  it('tracks unknown flags', () => {
    const args = parseArgs(['--unknown', 'value']);
    expect(args.unknownFlags.has('--unknown')).toBe(true);
    expect(args.unknownFlags.get('--unknown')).toBe('value');
  });

  it('handles flag with missing value gracefully', () => {
    const args = parseArgs(['--provider']);
    expect(args.provider).toBeUndefined();
    // The parser currently will treat next token as value if exists; if not, remains undefined
    // Our implementation increments i only if value exists, so provider stays undefined.
  });

  it('parses --thinking level', () => {
    const args = parseArgs(['--thinking', 'high']);
    expect(args.thinking).toBe('high');
  });

  it('parses --resume and --continue flags', () => {
    const args = parseArgs(['--resume']);
    expect(args.resume).toBe(true);
    const args2 = parseArgs(['--continue']);
    expect(args2.continue).toBe(true);
  });

  it('parses arrays like --models', () => {
    const args = parseArgs(['--models', 'gpt-4', '--models', 'claude-3']);
    expect(args.models).toEqual(['gpt-4', 'claude-3']);
  });

  it('parses --no-skills and --skills', () => {
    const args = parseArgs(['--no-skills']);
    expect(args.noSkills).toBe(true);
    const args2 = parseArgs(['--skills', 'skill1', '--skills', 'skill2']);
    expect(args2.skills).toEqual(['skill1', 'skill2']);
  });
});