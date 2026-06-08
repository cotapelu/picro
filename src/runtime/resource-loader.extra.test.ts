// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DefaultResourceLoader } from './resource-loader.js';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock external dependencies only
vi.mock('./skills.js', () => ({ loadSkills: vi.fn() }));
vi.mock('./prompt-templates.js', () => ({ loadPromptTemplates: vi.fn() }));
vi.mock('../extensions/loader.js', () => ({
  discoverAndLoadExtensions: vi.fn(),
}));
vi.mock('../extensions/runner.js', () => ({
  createExtensionRuntime: vi.fn(() => ({ flagValues: new Map(), pendingProviderRegistrations: [] })),
  ExtensionRunner: class { loadExtensions = vi.fn(); },
}));

import { loadSkills } from './skills.js';
import { loadPromptTemplates } from './prompt-templates.js';
import { discoverAndLoadExtensions } from '../extensions/loader.js';

describe('DefaultResourceLoader (extra)', () => {
  const cwd = join(tmpdir(), 'cwd');
  const agentDir = join(tmpdir(), 'agent');

  beforeEach(() => {
    vi.clearAllMocks();
    (loadSkills as any).mockReturnValue({ skills: [], diagnostics: [] });
    (loadPromptTemplates as any).mockReturnValue({ prompts: [], diagnostics: [] });
    (discoverAndLoadExtensions as any).mockResolvedValue({
      extensions: [],
      errors: [],
      runtime: { flagValues: new Map(), pendingProviderRegistrations: [] },
    });
  });

  describe('override functions', () => {
    it('skillsOverride replaces skills result', async () => {
      const override = vi.fn().mockReturnValue({ skills: [{ name: 'ov' } as any], diagnostics: [] });
      const loader = new DefaultResourceLoader({ cwd, agentDir, skillsOverride: override });
      await loader.reload();
      expect(override).toHaveBeenCalled();
      expect(loader.getSkills().skills[0].name).toBe('ov');
    });

    it('promptsOverride replaces prompts result', async () => {
      const override = vi.fn().mockReturnValue({ prompts: [{ name: 'op' } as any], diagnostics: [] });
      const loader = new DefaultResourceLoader({ cwd, agentDir, promptsOverride: override });
      await loader.reload();
      expect(override).toHaveBeenCalled();
      expect(loader.getPrompts().prompts[0].name).toBe('op');
    });

    it('systemPromptOverride modifies system prompt', async () => {
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        systemPrompt: 'base',
        systemPromptOverride: (p) => p + ' overridden',
      });
      expect(loader.getSystemPrompt()).toBeUndefined();
      await loader.reload();
      expect(loader.getSystemPrompt()).toBe('base overridden');
    });

    it('appendSystemPromptOverride appends to array', async () => {
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        appendSystemPrompt: ['a'],
        appendSystemPromptOverride: (arr) => [...arr, 'b'],
      });
      expect(loader.getAppendSystemPrompt()).toEqual([]);
      await loader.reload();
      expect(loader.getAppendSystemPrompt()).toEqual(['a', 'b']);
    });
  });

  describe('systemPrompt and appendSystemPrompt exposure', () => {
    it('exposes systemPrompt after reload when set', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir, systemPrompt: 'my system' });
      expect(loader.getSystemPrompt()).toBeUndefined();
      await loader.reload();
      expect(loader.getSystemPrompt()).toBe('my system');
    });

    it('exposes appendSystemPrompt after reload when set', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir, appendSystemPrompt: ['x', 'y'] });
      expect(loader.getAppendSystemPrompt()).toEqual([]);
      await loader.reload();
      expect(loader.getAppendSystemPrompt()).toEqual(['x', 'y']);
    });

    it('returns undefined systemPrompt when not set', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir });
      await loader.reload();
      expect(loader.getSystemPrompt()).toBeUndefined();
    });
  });

  describe('no* flags', () => {
    it('noExtensions results in empty extensions', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir, noExtensions: true });
      await loader.reload();
      expect(loader.getExtensions().extensions).toEqual([]);
    });

    it('noSkills results in empty skills', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir, noSkills: true });
      await loader.reload();
      expect(loader.getSkills().skills).toEqual([]);
    });

    it('noPromptTemplates results in empty prompts', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir, noPromptTemplates: true });
      await loader.reload();
      expect(loader.getPrompts().prompts).toEqual([]);
    });
  });

  describe('extension discovery errors', () => {
    it('captures extension discovery errors without throwing', async () => {
      const err = new Error('discovery failed');
      (discoverAndLoadExtensions as any).mockRejectedValueOnce(err);
      const loader = new DefaultResourceLoader({ cwd, agentDir });
      await expect(loader.reload()).resolves.not.toThrow();
      const ext = loader.getExtensions();
      expect(ext.errors).toHaveLength(1);
      expect(ext.errors[0].error).toContain('discovery failed');
    });
  });

  describe('flags propagation', () => {
    it('processes extensionFlagValues without error', async () => {
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        extensionFlagValues: new Map([['myflag', true]]),
      });
      await loader.reload();
      // Should succeed without error
      expect(loader.getExtensions().errors).toEqual([]);
    });
  });
});
