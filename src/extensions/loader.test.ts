// SPDX-License-Identifier: Apache-2.0
// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join, resolve } from 'path';
import { tmpdir } from 'os';
import { existsSync, mkdirSync, rmdirSync, unlinkSync, readdirSync, writeFileSync } from 'node:fs';

// Import functions to test
import { loadExtensions, loadExtensionFromFactory, discoverAndLoadExtensions } from './loader.js';
import type { Extension, ExtensionFactory, ExtensionContext, ExtensionRuntime } from './types.js';
import { createExtensionRuntime } from './runner.js';

// Helper to create a minimal extension object
function createMockExtension(name: string, tools?: Map<string, any>, commands?: Map<string, any>): Extension {
  return {
    name,
    path: '/mock/path',
    tools: tools ?? new Map(),
    commands: commands ?? new Map(),
  };
}

// Helper to create a mock factory
function createMockFactory(extension: Partial<Extension> = {}): ExtensionFactory {
  return async (context: ExtensionContext) => ({
    name: 'test-extension',
    path: context.extensionDir,
    tools: new Map(),
    commands: new Map(),
    ...extension,
  });
}

// Temporary directory helpers
function createTempDir(): string {
  const base = join(tmpdir(), `picro-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  mkdirSync(base, { recursive: true });
  return base;
}

function cleanupDir(dir: string) {
  if (existsSync(dir)) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          cleanupDir(fullPath);
        } else {
          unlinkSync(fullPath);
        }
      }
      rmdirSync(dir);
    } catch {
      // ignore
    }
  }
}

// Create an ES module .mjs file that can be dynamically imported
function createMjsExtensionFile(baseDir: string, name: string, tools: string[] = [], commands: string[] = []): string {
  const filePath = join(baseDir, `${name}.mjs`);
  const toolsMap = tools.map(t => `['${t}', {}]`).join(', ');
  const commandsMap = commands.map(c => `['${c}', {}]`).join(', ');
  const code = `// ES module
export default async (context) => ({
  name: '${name}',
  path: context.extensionDir,
  tools: new Map([${toolsMap}]),
  commands: new Map([${commandsMap}]),
});`;
  writeFileSync(filePath, code);
  return filePath;
}

// Create an extension **directory** with package.json type:module and index.js
function createEsModuleExtensionDir(baseDir: string, name: string, tools: string[] = [], commands: string[] = []): string {
  const extDir = join(baseDir, name);
  mkdirSync(extDir, { recursive: true });
  // package.json to mark as ES module
  writeFileSync(join(extDir, 'package.json'), JSON.stringify({ type: 'module' }));
  const indexJs = join(extDir, 'index.js');
  const toolsMap = tools.map(t => `['${t}', {}]`).join(', ');
  const commandsMap = commands.map(c => `['${c}', {}]`).join(', ');
  const code = `// ES module
export default async (context) => ({
  name: '${name}',
  path: context.extensionDir,
  tools: new Map([${toolsMap}]),
  commands: new Map([${commandsMap}]),
});`;
  writeFileSync(indexJs, code);
  return extDir;
}

describe('Extension Loader - loadExtensionFromFactory', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    cleanupDir(cwd);
  });

  it('should load extension from factory', async () => {
    const factory: ExtensionFactory = async (context) => ({
      name: 'factory-ext',
      path: context.extensionDir,
      tools: new Map([['factoryTool', {}]]),
      commands: new Map(),
    });

    const runtime = createExtensionRuntime();
    const extension = await loadExtensionFromFactory(factory, cwd, null, runtime, '/virtual/path');

    expect(extension).not.toBeNull();
    expect(extension.name).toBe('factory-ext');
    expect(extension.path).toBe('/virtual/path');
    expect(extension.tools.has('factoryTool')).toBe(true);
  });

  it('should pass context with correct properties', async () => {
    const factory: ExtensionFactory = async (context) => ({
      name: 'context-test',
      path: context.extensionDir,
      tools: new Map(),
      commands: new Map(),
      captured: { extensionDir: context.extensionDir, cwd: context.cwd },
    });

    const runtime = createExtensionRuntime();
    const extension = await loadExtensionFromFactory(factory, cwd, null, runtime, '/my/ext');

    expect((extension as any).captured.extensionDir).toBe('/my/ext');
    expect((extension as any).captured.cwd).toBe(cwd);
  });

  it('should provide api and log in context', async () => {
    const factory: ExtensionFactory = async (context) => {
      expect(context.api).toBeDefined();
      expect(context.log).toBeDefined();
      expect(typeof context.log.info).toBe('function');
      expect(typeof context.log.warn).toBe('function');
      expect(typeof context.log.error).toBe('function');
      return {
        name: 'log-test',
        path: context.extensionDir,
        tools: new Map(),
        commands: new Map(),
      };
    };

    const runtime = createExtensionRuntime();
    await loadExtensionFromFactory(factory, cwd, null, runtime, '/path');
  });

  it('should handle factory returning null', async () => {
    const factory: ExtensionFactory = async () => null as any;
    const runtime = createExtensionRuntime();
    const extension = await loadExtensionFromFactory(factory, cwd, null, runtime, '/path');
    expect(extension).toBeNull();
  });
});

describe('Extension Loader - loadExtensions', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    cleanupDir(cwd);
  });

  it('should return empty results for empty paths', async () => {
    const result = await loadExtensions([], cwd);
    expect(result.extensions).toEqual([]);
    expect(result.errors).toEqual([]);
    expect(result.runtime).toBeDefined();
  });

  it('should load multiple extensions from .mjs files', async () => {
    const ext1 = createMjsExtensionFile(cwd, 'ext1', ['tool1'], ['cmd1']);
    const ext2 = createMjsExtensionFile(cwd, 'ext2', ['tool2'], ['cmd2']);

    const result = await loadExtensions([ext1, ext2], cwd);

    expect(result.extensions).toHaveLength(2);
    expect(result.extensions[0].name).toBe('ext1');
    expect(result.extensions[1].name).toBe('ext2');
    expect(result.errors).toEqual([]);
  });

  it('should load extension from directory with index.js (ES module)', async () => {
    const extDir = createEsModuleExtensionDir(cwd, 'my-ext', ['tool1'], ['cmd1']);

    const result = await loadExtensions([extDir], cwd);

    expect(result.extensions).toHaveLength(1);
    expect(result.extensions[0].name).toBe('my-ext');
    expect(result.errors).toEqual([]);
  });

  it('should capture errors for non-existent paths', async () => {
    const result = await loadExtensions([join(cwd, 'nonexistent.mjs')], cwd);
    expect(result.extensions).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].path).toContain('nonexistent.mjs');
    expect(result.errors[0].error).toMatch(/does not exist|Extension path/);
  });

  it('should detect extension name collisions', async () => {
    const ext1 = createMjsExtensionFile(cwd, 'duplicate');
    const ext2 = createMjsExtensionFile(cwd, 'duplicate');

    const result = await loadExtensions([ext1, ext2], cwd);

    expect(result.extensions).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('Duplicate extension name: duplicate');
  });

  it('should detect tool name collisions', async () => {
    const ext1 = createMjsExtensionFile(cwd, 'ext1', ['commonTool']);
    const ext2 = createMjsExtensionFile(cwd, 'ext2', ['commonTool']);

    const result = await loadExtensions([ext1, ext2], cwd);

    expect(result.extensions).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('Duplicate tool name: commonTool');
  });

  it('should detect command name collisions', async () => {
    const ext1 = createMjsExtensionFile(cwd, 'ext1', [], ['commonCmd']);
    const ext2 = createMjsExtensionFile(cwd, 'ext2', [], ['commonCmd']);

    const result = await loadExtensions([ext1, ext2], cwd);

    expect(result.extensions).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error).toContain('Duplicate command name: commonCmd');
  });

  it('should accumulate multiple collision errors', async () => {
    createMjsExtensionFile(cwd, 'ext1', ['toolA', 'common']);
    createMjsExtensionFile(cwd, 'ext2', ['toolB', 'common'], ['cmdX']);
    createMjsExtensionFile(cwd, 'ext3', [], ['cmdX']);

    const result = await loadExtensions([
      join(cwd, 'ext1.mjs'),
      join(cwd, 'ext2.mjs'),
      join(cwd, 'ext3.mjs')
    ], cwd);

    expect(result.extensions).toHaveLength(3);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.errors.some(e => e.error.includes('common'))).toBe(true);
    expect(result.errors.some(e => e.error.includes('cmdX'))).toBe(true);
  });

  it('should share runtime across all loads', async () => {
    createMjsExtensionFile(cwd, 'ext1');
    createMjsExtensionFile(cwd, 'ext2');

    const result = await loadExtensions([
      join(cwd, 'ext1.mjs'),
      join(cwd, 'ext2.mjs')
    ], cwd);

    expect(result.extensions).toHaveLength(2);
    expect(result.runtime).toBeDefined();
    expect(result.runtime.flagValues).toBeInstanceOf(Map);
    expect(result.runtime.pendingProviderRegistrations).toBeInstanceOf(Array);
  });

  it('should handle errors and successes mixed', async () => {
    // Create two valid extensions; simulate one error by passing non-existent path in between
    const ext1 = createMjsExtensionFile(cwd, 'good1');
    const ext2 = createMjsExtensionFile(cwd, 'good2');

    const result = await loadExtensions([
      join(cwd, 'bad1.mjs'), // non-existent
      ext1,
      join(cwd, 'bad2.mjs'), // non-existent
      ext2
    ], cwd);

    expect(result.extensions).toHaveLength(2);
    expect(result.errors).toHaveLength(2);
    const names = result.extensions.map(e => e.name).sort();
    expect(names).toEqual(['good1', 'good2']);
  });
});

describe('Extension Loader - discoverAndLoadExtensions', () => {
  let cwd: string;
  let agentDir: string;

  beforeEach(() => {
    cwd = createTempDir();
    agentDir = createTempDir();
  });

  afterEach(() => {
    cleanupDir(cwd);
    cleanupDir(agentDir);
  });

  it('should discover extensions from agentDir/extensions', async () => {
    const agentExtensionsDir = join(agentDir, 'extensions');
    mkdirSync(agentExtensionsDir, { recursive: true });
    // Create an extension **subdirectory** with index.js inside the extensions folder
    createEsModuleExtensionDir(agentExtensionsDir, 'agent-ext');

    const result = await discoverAndLoadExtensions({ cwd, agentDir });

    expect(result.extensions).toHaveLength(1);
    expect(result.extensions[0].name).toBe('agent-ext');
    expect(result.errors).toEqual([]);
  });

  it('should discover extensions from .pi/extensions', async () => {
    const piExtDir = join(cwd, '.pi', 'extensions');
    mkdirSync(piExtDir, { recursive: true });
    createEsModuleExtensionDir(piExtDir, 'pi-ext');

    const result = await discoverAndLoadExtensions({ cwd, agentDir });

    expect(result.extensions).toHaveLength(1);
    expect(result.extensions[0].name).toBe('pi-ext');
    expect(result.errors).toEqual([]);
  });

  it('should handle additionalPaths', async () => {
    // Create the extension directly at cwd/custom-ext and pass it as the additional path
    createEsModuleExtensionDir(cwd, 'custom-ext');

    const result = await discoverAndLoadExtensions({
      cwd,
      agentDir,
      additionalPaths: ['./custom-ext']
    });

    expect(result.extensions).toHaveLength(1);
    expect(result.extensions[0].name).toBe('custom-ext');
    expect(result.errors).toEqual([]);
  });

  it('should return empty when no extension directories exist', async () => {
    const result = await discoverAndLoadExtensions({ cwd, agentDir });
    expect(result.extensions).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('should load extensions declared in package.json pi.extensions', async () => {
    // Create an extension **subdirectory** with package.json pi.extensions pointing to a .js file
    const agentExtensionsDir = join(agentDir, 'extensions');
    mkdirSync(agentExtensionsDir, { recursive: true });
    const extName = 'pkg-ext';
    const extDir = join(agentExtensionsDir, extName);
    mkdirSync(extDir, { recursive: true });
    // Create a sub JS file inside the extension directory referenced by pi.extensions
    const subJsPath = join(extDir, 'sub.js');
    const subContent = `module.exports = async (ctx) => ({
  name: 'pi-sub',
  path: ctx.extensionDir,
  tools: new Map([['subTool', {}]]),
  commands: new Map(),
});`;
    writeFileSync(subJsPath, subContent, 'utf-8');
    // Create package.json with pi.extensions pointing to ./sub.js
    writeFileSync(join(extDir, 'package.json'), JSON.stringify({ pi: { extensions: ['./sub.js'] } }));

    const result = await discoverAndLoadExtensions({ cwd, agentDir });
    expect(result.extensions.some(e => e.name === 'pi-sub')).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should combine multiple sources', async () => {
    const agentExtDir = join(agentDir, 'extensions');
    const piExtDir = join(cwd, '.pi', 'extensions');
    mkdirSync(agentExtDir);
    mkdirSync(piExtDir, { recursive: true });

    // Create extensions in standard locations (as subdirectories)
    createEsModuleExtensionDir(agentExtDir, 'agent-ext');
    createEsModuleExtensionDir(piExtDir, 'pi-ext');
    // For additionalPaths, create extension directly in cwd
    createEsModuleExtensionDir(cwd, 'custom');

    const result = await discoverAndLoadExtensions({
      cwd,
      agentDir,
      additionalPaths: ['./custom']
    });

    expect(result.extensions).toHaveLength(3);
    const names = result.extensions.map(e => e.name).sort();
    expect(names).toEqual(['agent-ext', 'custom', 'pi-ext']);
  });

  it('should pass through loadExtensions return value directly', async () => {
    const agentExtDir = join(agentDir, 'extensions');
    mkdirSync(agentExtDir);
    // Since we now create at least one extension, result will have data
    createEsModuleExtensionDir(agentExtDir, 'ext');
    const result = await discoverAndLoadExtensions({ cwd, agentDir });
    expect(result.extensions).toHaveLength(1);
    expect(result.extensions[0].name).toBe('ext');
  });
});

describe('Extension Loader - createExtensionAPI (indirect)', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
  });

  afterEach(() => {
    cleanupDir(cwd);
  });

  it('should return an extensible plain object', async () => {
    let capturedApi: any;
    const factory: ExtensionFactory = async (context) => {
      capturedApi = context.api;
      return {
        name: 'api-test',
        path: context.extensionDir,
        tools: new Map(),
        commands: new Map(),
      };
    };

    const runtime = createExtensionRuntime();
    await loadExtensionFromFactory(factory, cwd, null, runtime, '/path');

    expect(capturedApi).toBeDefined();
    expect(typeof capturedApi).toBe('object');
    capturedApi.testProp = 'value';
    expect(capturedApi.testProp).toBe('value');
  });
});
