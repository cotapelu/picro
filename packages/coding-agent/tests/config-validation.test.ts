import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigValidator } from '../src/config/validation.js';
import type { AppConfig, ProviderInfo } from '../src/config/config.js';

function createValidConfig(overrides?: Partial<AppConfig>): AppConfig {
  return {
    currentProvider: 'nvidia-nim',
    currentModel: 'mistralai/mistral-small-4-119b-2603',
    providers: {
      'nvidia-nim': {
        baseUrl: 'https://api.nvidia.com/v1',
        api: 'nvidia-nim',
        apiKey: 'dummy',
        authHeader: true,
        models: ['model1'],
      } as ProviderInfo,
    },
    projects: {
      'test-project': {
        name: 'Test Project',
        path: '/tmp/test',
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      },
    },
    settings: {
      maxRounds: 10,
      maxContextTokens: 128000,
      toolTimeout: 30000,
      enableLogging: true,
      logLevel: 'info',
      defaultStrategy: 'react',
      memoryEnabled: true,
      memoryMaxSize: 100,
      debugMode: false,
    },
    ...overrides,
  };
}

describe('ConfigValidator', () => {
  it('should accept valid config', () => {
    const config = createValidConfig();
    const result = ConfigValidator.validate(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fix invalid currentProvider (number) and set default', () => {
    const config = createValidConfig({ currentProvider: 123 as any });
    const result = ConfigValidator.validate(config);
    expect(result.valid).toBe(false); // at least one error
    expect(config.currentProvider).toBe('nvidia-nim'); // fixed to default
  });

  it('should fix missing currentModel', () => {
    const config = createValidConfig({ currentModel: '' as any });
    const result = ConfigValidator.validate(config);
    expect(result.valid).toBe(false);
    expect(config.currentModel).toBe('mistralai/mistral-small-4-119b-2603');
  });

  it('should validate provider baseUrl', () => {
    const config = createValidConfig({
      providers: {
        bad: {
          baseUrl: 'not-a-url',
          api: 'test',
          apiKey: 'key',
          authHeader: true,
          models: [],
        } as ProviderInfo,
      },
    });
    const result = ConfigValidator.validate(config);
    expect(result.errors.some(e => e.path.includes('baseUrl'))).toBe(true);
  });

  it('should validate settings.maxRounds range', () => {
    const config = createValidConfig({
      settings: { ...createValidConfig().settings, maxRounds: 200 },
    });
    const result = ConfigValidator.validate(config);
    expect(result.errors.some(e => e.path === 'settings.maxRounds')).toBe(true);
    expect(config.settings.maxRounds).toBe(10); // reset to default
  });

  it('should validate settings.logLevel', () => {
    const config = createValidConfig({
      settings: { ...createValidConfig().settings, logLevel: 'invalid' as any },
    });
    const result = ConfigValidator.validate(config);
    expect(result.errors.some(e => e.path === 'settings.logLevel')).toBe(true);
    expect(config.settings.logLevel).toBe('info');
  });

  it('should validate settings.defaultStrategy', () => {
    const config = createValidConfig({
      settings: { ...createValidConfig().settings, defaultStrategy: 'invalid' as any },
    });
    const result = ConfigValidator.validate(config);
    expect(result.errors.some(e => e.path === 'settings.defaultStrategy')).toBe(true);
    expect(config.settings.defaultStrategy).toBe('react');
  });

  it('should add debugMode if missing', () => {
    const config = createValidConfig({
      settings: {
        ...createValidConfig().settings,
        // @ts-ignore - omit debugMode
      } as any,
    });
    const result = ConfigValidator.validate(config);
    expect(config.settings.debugMode).toBe(false); // added with default
  });
});
