// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external deps first
vi.mock('../extensions/loader.js', () => ({
  discoverAndLoadExtensions: vi.fn(),
}));

vi.mock('../extensions/runner.js', () => ({
  createExtensionRuntime: vi.fn(() => ({ flagValues: new Map(), pendingProviderRegistrations: [] })),
  ExtensionRunner: class { loadExtensions = vi.fn(); },
}));

vi.mock('./skills.js', () => ({ loadSkills: vi.fn() }));
vi.mock('./prompt-templates.js', () => ({ loadPromptTemplates: vi.fn() }));

import { discoverAndLoadExtensions } from '../extensions/loader.js';
import { loadSkills } from './skills.js';
import { loadPromptTemplates } from './prompt-templates.js';
import { DefaultResourceLoader } from './resource-loader.js';
import { join } from 'path';
import { tmpdir } from 'os';

beforeEach(() => {
  (discoverAndLoadExtensions as any).mockResolvedValue({
    extensions: [],
    errors: [],
    runtime: { flagValues: new Map(), pendingProviderRegistrations: [] },
  });
  (loadSkills as any).mockReturnValue([]);
  (loadPromptTemplates as any).mockReturnValue([]);
});

describe('DefaultResourceLoader', () => {
  const cwd = join(tmpdir(), 'cwd');
  const agentDir = join(tmpdir(), 'agent');

  describe('initial state', () => {
    it('returns empty resources before reload', () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir });
      expect(loader.getSkills().skills).toEqual([]);
      expect(loader.getPrompts().prompts).toEqual([]);
      expect(loader.getThemes().themes).toEqual([]);
      expect(loader.getAgentsFiles().agentsFiles).toEqual([]);
      expect(loader.getSystemPrompt()).toBeUndefined();
      expect(loader.getAppendSystemPrompt()).toEqual([]);
    });
  });

  describe('reload()', () => {
    it('resolves and populates arrays', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir });
      await expect(loader.reload()).resolves.not.toThrow();
      expect(loader.getSkills().skills).toBeInstanceOf(Array);
      expect(loader.getPrompts().prompts).toBeInstanceOf(Array);
      expect(loader.getThemes().themes).toBeInstanceOf(Array);
      expect(loader.getAgentsFiles().agentsFiles).toBeInstanceOf(Array);
    });

    it('applies noExtensions flag', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir, noExtensions: true });
      await loader.reload();
      expect(loader.getExtensions().extensions).toEqual([]);
    });

    it('applies noSkills flag', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir, noSkills: true });
      await loader.reload();
      expect(loader.getSkills().skills).toEqual([]);
    });

    it('applies noPromptTemplates flag', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir, noPromptTemplates: true });
      await loader.reload();
      expect(loader.getPrompts().prompts).toEqual([]);
    });

    it('applies noThemes flag', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir, noThemes: true });
      await loader.reload();
      expect(loader.getThemes().themes).toEqual([]);
    });

    it('applies noContextFiles flag', async () => {
      const loader = new DefaultResourceLoader({ cwd, agentDir, noContextFiles: true });
      await loader.reload();
      expect(loader.getAgentsFiles().agentsFiles).toEqual([]);
    });

    it('captures extension discovery errors', async () => {
      const err = new Error('discovery failed');
      (discoverAndLoadExtensions as any).mockRejectedValueOnce(err);
      const loader = new DefaultResourceLoader({ cwd, agentDir });
      await loader.reload();
      const ext = loader.getExtensions();
      expect(ext.errors).toHaveLength(1);
      expect(ext.errors[0].error).toContain('discovery failed');
    });

    it('applies skillsOverride', async () => {
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        skillsOverride: () => ({ skills: [{ name: 'ov' } as any], diagnostics: [] }),
      });
      await loader.reload();
      expect(loader.getSkills().skills[0].name).toBe('ov');
    });

    it('applies promptsOverride', async () => {
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        promptsOverride: () => ({ prompts: [{ name: 'op' } as any], diagnostics: [] }),
      });
      await loader.reload();
      expect(loader.getPrompts().prompts[0].name).toBe('op');
    });

    it('applies themesOverride', async () => {
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        themesOverride: () => ({ themes: [{ name: 'ot' } as any], diagnostics: [] }),
      });
      await loader.reload();
      expect(loader.getThemes().themes[0].name).toBe('ot');
    });

    it('applies agentsFilesOverride', async () => {
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        agentsFilesOverride: () => [{ path: '/custom', content: 'custom' }],
      });
      await loader.reload();
      expect(loader.getAgentsFiles().agentsFiles).toEqual([{ path: '/custom', content: 'custom' }]);
    });

    it('applies systemPrompt and appendSystemPrompt options after reload', async () => {
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        systemPrompt: 'sys',
        appendSystemPrompt: ['a', 'b'],
      });
      expect(loader.getSystemPrompt()).toBeUndefined();
      await loader.reload();
      expect(loader.getSystemPrompt()).toBe('sys');
      expect(loader.getAppendSystemPrompt()).toEqual(['a', 'b']);
    });

    it('applies systemPromptOverride', async () => {
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        systemPrompt: 'base',
        systemPromptOverride: (s) => s + ' overridden',
      });
      await loader.reload();
      expect(loader.getSystemPrompt()).toBe('base overridden');
    });

    it('applies appendSystemPromptOverride', async () => {
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        appendSystemPrompt: ['x'],
        appendSystemPromptOverride: (arr) => [...arr, 'y'],
      });
      await loader.reload();
      expect(loader.getAppendSystemPrompt()).toEqual(['x', 'y']);
    });
  });
});