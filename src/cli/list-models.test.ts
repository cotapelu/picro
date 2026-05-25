// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for list-models.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { listModels } from "./list-models.js";
import type { ModelRegistry } from "../session/model-registry.js";
import type { Model } from "../llm/index.js";

function createModel(overrides: Partial<Model> = {}): Model {
  return {
    id: "gpt-4",
    name: "GPT-4",
    api: "openai",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    reasoning: false,
    input: ["text"],
    cost: { input: 0.01, output: 0.03, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 8192,
    maxTokens: 4096,
    ...overrides,
  };
}

function createModelRegistry(models: Model[]): ModelRegistry {
  return {
    getAll: () => models,
    find: (provider: string, modelId: string) => models.find(m => m.provider === provider && m.id === modelId),
    getAvailable: async () => models,
    hasConfiguredAuth: () => true,
    isUsingOAuth: () => false,
    getApiKeyAndHeaders: async () => ({ ok: true }),
    registerProvider: () => {},
    getProviders: () => [...new Set(models.map(m => m.provider))],
  } as any;
}

describe("listModels", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should print 'No models available.' when registry empty", async () => {
    const registry = createModelRegistry([]);
    await listModels(registry);
    expect(consoleLogSpy).toHaveBeenCalledWith("No models available.");
  });

  it("should list models in a table with headers", async () => {
    const models = [
      createModel({ id: "gpt-4", provider: "openai", contextWindow: 8192, maxTokens: 4096, reasoning: false, input: ["text"] }),
      createModel({ id: "claude-3-opus", provider: "anthropic", contextWindow: 200000, maxTokens: 4096, reasoning: true, input: ["text", "image"] }),
    ];
    const registry = createModelRegistry(models);
    await listModels(registry);

    const output = consoleLogSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    expect(output).toContain('provider');
    expect(output).toContain('model');
    expect(output).toContain('context');
    expect(output).toContain('max-out');
    expect(output).toContain('thinking');
    expect(output).toContain('images');
    expect(output).toContain('openai');
    expect(output).toContain('anthropic');
    expect(output).toContain('gpt-4');
    expect(output).toContain('claude-3-opus');
    expect(output).toContain('8.2K');
    expect(output).toContain('200K');
    expect(output).toContain('no');
    expect(output).toContain('yes');
  });

  it("should filter models by search pattern (case-insensitive)", async () => {
    const models = [
      createModel({ id: "gpt-4", provider: "openai" }),
      createModel({ id: "claude-3", provider: "anthropic" }),
    ];
    const registry = createModelRegistry(models);
    await listModels(registry, "gpt");
    const output = consoleLogSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    expect(output).toContain('gpt-4');
    expect(output).not.toContain('claude-3');
  });

  it("should sort models by provider then id", async () => {
    const models = [
      createModel({ id: "z-ultra", provider: "zai" }),
      createModel({ id: "a-basic", provider: "anthropic" }),
      createModel({ id: "m-gpt", provider: "meta" }),
    ];
    const registry = createModelRegistry(models);
    await listModels(registry);
    const calls = consoleLogSpy.mock.calls.map((c: any[]) => c[0]).join('\n');
    // Check order: anthropic, meta, zai (alphabetical)
    const lines = calls.split('\n');
    const modelLines = lines.filter((l: string) => l.trim() && !l.includes('provider') && !l.includes('---'));
    // Each line has provider as first word
    expect(modelLines[0].trimStart()).toMatch(/^anthropic/);
    expect(modelLines[1].trimStart()).toMatch(/^meta/);
    expect(modelLines[2].trimStart()).toMatch(/^zai/);
  });

  it("should show 'no models matching' when filter yields none", async () => {
    const models = [createModel({ id: "gpt-4", provider: "openai" })];
    const registry = createModelRegistry(models);
    await listModels(registry, "nonexistent");
    expect(consoleLogSpy).toHaveBeenCalledWith('No models matching "nonexistent"');
  });
});
