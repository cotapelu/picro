import { describe, it, expect } from 'vitest';
import { migrateConfig } from '../src/config/config.js';
import type { AppConfig } from '../src/config/config.js';

describe('Config Migration', () => {
  it('should upgrade config lacking version to version 1', () => {
    const config: AppConfig = {
      currentProvider: 'openai',
      currentModel: 'gpt-4',
      providers: {},
      projects: {},
      settings: { maxRounds: 5 },
    };
    migrateConfig(config);
    expect(config.configVersion).toBe(1);
  });

  it('should not alter config with version >= 1', () => {
    const config: AppConfig = {
      configVersion: 1,
      currentProvider: 'openai',
      currentModel: 'gpt-4',
      providers: {},
      projects: {},
      settings: { maxRounds: 5 },
    };
    migrateConfig(config);
    expect(config.configVersion).toBe(1);
  });
});
