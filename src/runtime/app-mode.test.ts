import { describe, it, expect } from 'vitest';
import { resolveAppMode } from './app-mode.js';
import type { Args } from './cli-args.js';

function makeArgs(overrides: Partial<Args> = {}): Args {
  return {
    provider: undefined,
    model: undefined,
    apiKey: undefined,
    systemPrompt: undefined,
    appendSystemPrompt: undefined,
    mode: undefined,
    print: false,
    continue: false,
    resume: false,
    session: undefined,
    fork: undefined,
    sessionDir: undefined,
    noSession: false,
    models: undefined,
    noTools: false,
    noBuiltinTools: false,
    tools: undefined,
    thinking: undefined,
    extension: undefined,
    noExtensions: false,
    skill: undefined,
    noSkills: false,
    promptTemplate: undefined,
    noPromptTemplates: false,
    theme: undefined,
    noThemes: false,
    noContextFiles: false,
    export: undefined,
    listModels: undefined,
    verbose: false,
    offline: false,
    help: false,
    version: false,
    ...overrides,
  };
}

describe('resolveAppMode', () => {
  it('returns print when --print flag', () => {
    const args = makeArgs({ print: true });
    expect(resolveAppMode(args, true)).toBe('print');
  });

  it('returns print when stdin is not TTY', () => {
    const args = makeArgs();
    expect(resolveAppMode(args, false)).toBe('print');
  });

  it('returns tui when TTY and no --print and no explicit mode', () => {
    const args = makeArgs();
    expect(resolveAppMode(args, true)).toBe('tui');
  });

  it('returns rpc when --mode rpc', () => {
    const args = makeArgs({ mode: 'rpc' });
    expect(resolveAppMode(args, true)).toBe('rpc');
  });

  it('returns json when --mode json', () => {
    const args = makeArgs({ mode: 'json' });
    expect(resolveAppMode(args, true)).toBe('json');
  });

  it('returns tui when --mode tui', () => {
    const args = makeArgs({ mode: 'tui' });
    expect(resolveAppMode(args, true)).toBe('tui');
  });

  it('returns tui when --mode interactive (alias)', () => {
    const args = makeArgs({ mode: 'interactive' });
    expect(resolveAppMode(args, true)).toBe('tui');
  });
});
