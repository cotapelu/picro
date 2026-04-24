/**
 * Config Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../src/config/config.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let tempConfigDir: string;
  let originalConfigFile: string;

  beforeEach(() => {
    // Create temp directory for tests
    tempConfigDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));

    // Mock the config file path
    originalConfigFile = path.join(os.homedir(), '.picro', 'agent', 'config.json');

    // Create a test config file
    const testConfigPath = path.join(tempConfigDir, 'config.json');
    fs.writeFileSync(testConfigPath, JSON.stringify({
      currentProvider: 'test-provider',
      currentModel: 'test-model',
      providers: {},
      projects: {},
      settings: {
        maxRounds: 10,
        maxContextTokens: 128000,
        toolTimeout: 30000,
        enableLogging: true,
        logLevel: 'info',
        defaultStrategy: 'react',
        memoryEnabled: true,
        memoryMaxSize: 100,
      },
    }, null, 2));
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempConfigDir)) {
      fs.rmSync(tempConfigDir, { recursive: true, force: true });
    }
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('getCurrentProvider', () => {
    it('should return current provider', () => {
      const config = ConfigManager.getInstance();
      const provider = config.getCurrentProvider();

      expect(provider).toBeDefined();
      expect(typeof provider).toBe('string');
    });
  });

  describe('getCurrentModel', () => {
    it('should return current model', () => {
      const config = ConfigManager.getInstance();
      const model = config.getCurrentModel();

      expect(model).toBeDefined();
      expect(typeof model).toBe('string');
    });
  });

  describe('getSettings', () => {
    it('should return settings object', () => {
      const config = ConfigManager.getInstance();
      const settings = config.getSettings();

      expect(settings).toBeDefined();
      expect(typeof settings).toBe('object');
      expect(settings.maxRounds).toBeDefined();
      expect(settings.maxContextTokens).toBeDefined();
      expect(settings.toolTimeout).toBeDefined();
      expect(settings.enableLogging).toBeDefined();
      expect(settings.logLevel).toBeDefined();
      expect(settings.defaultStrategy).toBeDefined();
      expect(settings.memoryEnabled).toBeDefined();
      expect(settings.memoryMaxSize).toBeDefined();
    });
  });

  describe('getSetting', () => {
    it('should return specific setting value', () => {
      const config = ConfigManager.getInstance();
      const maxRounds = config.getSetting('maxRounds');

      expect(maxRounds).toBeDefined();
      expect(typeof maxRounds).toBe('number');
    });

    it('should return default strategy', () => {
      const config = ConfigManager.getInstance();
      const strategy = config.getSetting('defaultStrategy');

      expect(strategy).toBeDefined();
      expect(typeof strategy).toBe('string');
    });
  });

  describe('setSetting', () => {
    it('should update setting value', () => {
      const config = ConfigManager.getInstance();
      const originalMaxRounds = config.getSetting('maxRounds');

      config.setSetting('maxRounds', 20);
      const newMaxRounds = config.getSetting('maxRounds');

      expect(newMaxRounds).toBe(20);
      expect(newMaxRounds).not.toBe(originalMaxRounds);
    });
  });

  describe('updateSettings', () => {
    it('should update multiple settings', () => {
      const config = ConfigManager.getInstance();

      config.updateSettings({
        maxRounds: 15,
        toolTimeout: 60000,
      });

      expect(config.getSetting('maxRounds')).toBe(15);
      expect(config.getSetting('toolTimeout')).toBe(60000);
    });
  });

  describe('getProjects', () => {
    it('should return projects object', () => {
      const config = ConfigManager.getInstance();
      const projects = config.getProjects();

      expect(projects).toBeDefined();
      expect(typeof projects).toBe('object');
    });
  });

  describe('addProject', () => {
    it('should add new project', () => {
      const config = ConfigManager.getInstance();

      config.addProject({
        name: 'test-project',
        path: '/test/path',
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      });

      const projects = config.getProjects();
      expect(projects['test-project']).toBeDefined();
    });
  });

  describe('deleteProject', () => {
    it('should delete project', () => {
      const config = ConfigManager.getInstance();

      config.addProject({
        name: 'test-project',
        path: '/test/path',
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
      });

      config.deleteProject('test-project');

      const projects = config.getProjects();
      expect(projects['test-project']).toBeUndefined();
    });
  });

  describe('getConfig', () => {
    it('should return full config object', () => {
      const config = ConfigManager.getInstance();
      const fullConfig = config.getConfig();

      expect(fullConfig).toBeDefined();
      expect(fullConfig.currentProvider).toBeDefined();
      expect(fullConfig.currentModel).toBeDefined();
      expect(fullConfig.providers).toBeDefined();
      expect(fullConfig.projects).toBeDefined();
      expect(fullConfig.settings).toBeDefined();
    });
  });

  describe('validateProvider', () => {
    it('should validate existing provider', () => {
      const config = ConfigManager.getInstance();
      const isValid = config.validateProvider('nvidia-nim');

      expect(typeof isValid).toBe('boolean');
    });
  });

  describe('hasApiKey', () => {
    it('should check if API key exists', () => {
      const config = ConfigManager.getInstance();
      const hasKey = config.hasApiKey('nvidia-nim');

      expect(typeof hasKey).toBe('boolean');
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const config = ConfigManager.getInstance();
      const providers = config.getAvailableProviders();

      expect(Array.isArray(providers)).toBe(true);
    });
  });
});
