// SPDX-License-Identifier: Apache-2.0
/**
 * Unit tests for DefaultModelRegistry.
 */

import { describe, it, expect } from 'vitest';
import { DefaultModelRegistry } from './model-registry.js';
import { getProviders, getModels } from '../llm/index.js';

describe('DefaultModelRegistry', () => {
  let registry: DefaultModelRegistry;

  beforeEach(() => {
    registry = new DefaultModelRegistry();
  });

  it('should list providers', () => {
    const providers = registry.getProviders();
    expect(providers).toBeInstanceOf(Array);
    expect(providers.length).toBeGreaterThan(0);
  });

  it('should list all models', () => {
    const models = registry.getAll();
    expect(models).toBeInstanceOf(Array);
    expect(models.length).toBeGreaterThan(0);
  });

  it('should find an existing model', () => {
    // Pick first available provider and its first model
    const providers = getProviders();
    if (providers.length === 0) {
      // No models in llm package? skip
      return;
    }
    const provider = providers[0];
    const models = getModels(provider);
    if (models.length === 0) {
      return;
    }
    const model = models[0];
    const found = registry.find(provider, model.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(model.id);
  });

  it('should return undefined for unknown model', () => {
    const model = registry.find('unknown', 'nonexistent');
    expect(model).toBeUndefined();
  });
});
