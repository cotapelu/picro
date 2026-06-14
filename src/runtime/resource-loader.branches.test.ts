// SPDX-License-Identifier: Apache-2.0
/**
 * Branch coverage tests for DefaultResourceLoader.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  default: { existsSync: vi.fn(), readFileSync: vi.fn() },
}));

vi.mock('../extensions/loader.js', () => ({
  discoverAndLoadExtensions: vi.fn(),
}));

vi.mock('../extensions/runner.js', () => {
  // Define a mock class inside the factory to avoid TDZ/higher-order issues
  class MockExtensionRunner {
    loadExtensions = vi.fn();
  }
  return {
    createExtensionRuntime: vi.fn(() => ({ flagValues: new Map(), pendingProviderRegistrations: [] })),
    ExtensionRunner: MockExtensionRunner,
  };
});

vi.mock('./skills.js', () => ({
  loadSkills: vi.fn(),
}));

vi.mock('./prompt-templates.js', () => ({
  loadPromptTemplates: vi.fn(),
}));

import { DefaultResourceLoader } from './resource-loader.js';
import { discoverAndLoadExtensions } from '../extensions/loader.js';
import { loadSkills } from './skills.js';
import { loadPromptTemplates } from './prompt-templates.js';
import * as fs from 'node:fs';

describe('DefaultResourceLoader branch coverage', () => {
  let cwd: string;
  let agentDir: string;

  beforeEach(() => {
    cwd = '/cwd';
    agentDir = '/cwd/.pi';
    vi.clearAllMocks();
    (fs.existsSync as any).mockReturnValue(false);
    (fs.readFileSync as any).mockReturnValue('');
    discoverAndLoadExtensions.mockResolvedValue({ extensions: [], errors: [] });
    loadSkills.mockReturnValue([]);
    loadPromptTemplates.mockReturnValue([]);
  });

  function createLoader(overrides: any = {}) {
    return new DefaultResourceLoader({
      cwd,
      agentDir,
      ...overrides,
    });
  }

  describe('Initialization & early-return branches', () => {
    it('getExtensions returns empty result before reload', () => {
      const loader = createLoader();
      const result = loader.getExtensions();
      expect(result.extensions).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.runtime).toEqual({ flagValues: new Map(), pendingProviderRegistrations: [] });
    });

    it('getSkills returns empty before reload', () => {
      const loader = createLoader();
      const result = loader.getSkills();
      expect(result.skills).toEqual([]);
    });

    it('getPrompts returns empty before reload', () => {
      const loader = createLoader();
      const result = loader.getPrompts();
      expect(result.prompts).toEqual([]);
    });

    it('getThemes returns empty before reload', () => {
      const loader = createLoader();
      const result = loader.getThemes();
      expect(result.themes).toEqual([]);
    });

    it('getAgentsFiles returns empty before reload', () => {
      const loader = createLoader();
      const result = loader.getAgentsFiles();
      expect(result.agentsFiles).toEqual([]);
    });

    it('getSystemPrompt returns undefined before reload', () => {
      const loader = createLoader();
      expect(loader.getSystemPrompt()).toBeUndefined();
    });

    it('getAppendSystemPrompt returns empty array before reload', () => {
      const loader = createLoader();
      expect(loader.getAppendSystemPrompt()).toEqual([]);
    });
  });

  describe('reload branches', () => {
    it('handles discoverAndLoadExtensions error', async () => {
      const error = new Error('ext fail');
      discoverAndLoadExtensions.mockRejectedValue(error);
      const loader = createLoader();
      await expect(loader.reload()).resolves.toBeUndefined();
      expect(discoverAndLoadExtensions).toHaveBeenCalled();
    });

    it('applies extensionsOverride', async () => {
      discoverAndLoadExtensions.mockResolvedValue({
        extensions: [{ name: 'ext1' }],
        errors: [],
        runtime: { flagValues: new Map(), pendingProviderRegistrations: [] }
      });
      const loader = createLoader({
        extensionsOverride: (base) => ({
          ...base,
          extensions: [...base.extensions, { name: 'override' }]
        }),
      });
      await loader.reload();
      const result = loader.getExtensions();
      expect(result.extensions.some((e: any) => e.name === 'override')).toBe(true);
    });

    it('respects noExtensions flag', async () => {
      const loader = createLoader({ noExtensions: true });
      await loader.reload();
      const result = loader.getExtensions();
      expect(result.extensions).toEqual([]);
    });

    it('loads skills and applies skillsOverride', async () => {
      loadSkills.mockReturnValue([{ id: 's1' }]);
      const loader = createLoader({
        skillsOverride: (base) => ({
          skills: [...base.skills, { id: 's2' }],
          diagnostics: base.diagnostics
        }),
      });
      await loader.reload();
      const result = loader.getSkills();
      expect(result.skills.map((s: any) => s.id).sort()).toEqual(['s1', 's2']);
    });

    it('respects noSkills flag', async () => {
      const loader = createLoader({ noSkills: true });
      await loader.reload();
      const result = loader.getSkills();
      expect(result.skills).toEqual([]);
    });

    it('loads prompts and applies promptsOverride', async () => {
      loadPromptTemplates.mockReturnValue([{ name: 'p1' }]);
      const loader = createLoader({
        promptsOverride: (base) => ({
          prompts: [...base.prompts, { name: 'p2' }],
          diagnostics: base.diagnostics
        }),
      });
      await loader.reload();
      const result = loader.getPrompts();
      expect(result.prompts.map((p: any) => p.name).sort()).toEqual(['p1', 'p2']);
    });

    it('respects noPromptTemplates flag', async () => {
      const loader = createLoader({ noPromptTemplates: true });
      await loader.reload();
      const result = loader.getPrompts();
      expect(result.prompts).toEqual([]);
    });

    it('respects noThemes flag', async () => {
      const loader = createLoader({ noThemes: true });
      await loader.reload();
      const result = loader.getThemes();
      expect(result.themes).toEqual([]);
    });

    it('loads agentsFiles and applies agentsFilesOverride', async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue('content');
      const loader = createLoader({
        agentsFilesOverride: (base) => [...base, { path: '/override', content: 'override' }],
      });
      await loader.reload();
      const result = loader.getAgentsFiles();
      expect(result.agentsFiles.some((af: any) => af.path === '/override')).toBe(true);
    });

    it('respects noContextFiles flag', async () => {
      const loader = createLoader({ noContextFiles: true });
      await loader.reload();
      const result = loader.getAgentsFiles();
      expect(result.agentsFiles).toEqual([]);
    });

    it('applies systemPromptOverride', async () => {
      const loader = createLoader({
        systemPrompt: 'base',
        systemPromptOverride: (base) => base + ' overridden',
      });
      await loader.reload();
      expect(loader.getSystemPrompt()).toBe('base overridden');
    });

    it('applies appendSystemPromptOverride', async () => {
      const loader = createLoader({
        appendSystemPrompt: ['base'],
        appendSystemPromptOverride: (base) => [...base, 'overridden'],
      });
      await loader.reload();
      expect(loader.getAppendSystemPrompt()).toEqual(['base', 'overridden']);
    });
  });
});
