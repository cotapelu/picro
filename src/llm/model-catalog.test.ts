/**
 * Model Catalog Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModelCatalog, createModelCatalog } from './model-catalog.js';
import type { Model } from './types.js';

describe('ModelCatalog', () => {
  let catalog: ReturnType<typeof createModelCatalog>;

  beforeEach(() => {
    catalog = createModelCatalog({
      refreshIntervalMs: 1000,
      concurrency: 2,
    });
  });

  afterEach(async () => {
    catalog.stop();
  });

  it('should initialize with local models', async () => {
    await catalog.initialize();
    
    const providers = catalog.getProviders();
    expect(providers.length).toBeGreaterThan(0);
    
    // Should have some models
    for (const provider of providers) {
      const models = catalog.getModels(provider);
      expect(models.length).toBeGreaterThan(0);
    }
  });

  it('should get a specific model', async () => {
    await catalog.initialize();
    
    const providers = catalog.getProviders();
    if (providers.length > 0) {
      const models = catalog.getModels(providers[0]);
      if (models.length > 0) {
        const model = catalog.getModel(providers[0], models[0].id);
        expect(model).toBeDefined();
        expect(model?.id).toBe(models[0].id);
      }
    }
  });

  it('should get all providers', async () => {
    await catalog.initialize();
    
    const providers = catalog.getProviders();
    expect(Array.isArray(providers)).toBe(true);
    expect(providers.length).toBeGreaterThan(0);
  });

  it('should get status', async () => {
    await catalog.initialize();
    
    const status = catalog.getStatus();
    expect(status).toHaveProperty('providers');
    expect(status).toHaveProperty('lastRefresh');
    expect(status).toHaveProperty('isRefreshing');
    expect(Array.isArray(status.providers)).toBe(true);
  });

  it('should stop refresh timer', async () => {
    await catalog.initialize();
    catalog.stop();
    
    const status = catalog.getStatus();
    expect(status.isRefreshing).toBe(false);
  });

  it('should handle non-existent model gracefully', async () => {
    await catalog.initialize();
    
    const model = catalog.getModel('non-existent-provider', 'non-existent-model');
    expect(model).toBeUndefined();
  });

  it('should get empty models for non-existent provider', async () => {
    await catalog.initialize();
    
    const models = catalog.getModels('non-existent-provider');
    expect(models).toEqual([]);
  });

  it('should stop timer on stop', async () => {
    await catalog.initialize();
    catalog.stop();
    
    const status = catalog.getStatus();
    expect(status.isRefreshing).toBe(false);
  });
});

describe('ModelCatalog - refreshProvider', () => {
  let catalog: ReturnType<typeof createModelCatalog>;

  beforeEach(() => {
    catalog = createModelCatalog({
      concurrency: 1,
    });
  });

  afterEach(async () => {
    catalog.stop();
  });

  it('should handle provider without catalog URL gracefully', async () => {
    await catalog.initialize();
    
    // This should not throw even if no catalog URL
    await catalog.refreshProviders(['non-existent-provider']);
    
    // Should not throw
    expect(true).toBe(true);
  });
});