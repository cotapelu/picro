/**
 * Configuration Validation
 * Validates the app config structure and types
 */

import type { AppConfig, AppSettings, ProviderInfo } from './config.js';

export interface ConfigValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warn';
}

export class ConfigValidator {
  private static readonly DEFAULT_PROVIDER = 'nvidia-nim';
  private static readonly DEFAULT_MODEL = 'mistralai/mistral-small-4-119b-2603';

  static validate(config: AppConfig): { valid: boolean; errors: ConfigValidationError[] } {
    const errors: ConfigValidationError[] = [];

    // Validate currentProvider
    if (!config.currentProvider || typeof config.currentProvider !== 'string') {
      errors.push({
        path: 'currentProvider',
        message: 'currentProvider must be a non-empty string',
        severity: 'error',
      });
      // Set default
      config.currentProvider = this.DEFAULT_PROVIDER;
    }

    // Validate currentModel
    if (!config.currentModel || typeof config.currentModel !== 'string') {
      errors.push({
        path: 'currentModel',
        message: 'currentModel must be a non-empty string',
        severity: 'error',
      });
      config.currentModel = this.DEFAULT_MODEL;
    }

    // Validate providers
    if (typeof config.providers !== 'object' || config.providers === null) {
      errors.push({
        path: 'providers',
        message: 'providers must be an object',
        severity: 'error',
      });
      config.providers = {};
    } else {
      for (const [name, provider] of Object.entries(config.providers)) {
        const result = this.validateProviderInfo(name, provider);
        if (!result.valid) {
          errors.push(...result.errors.map(err => ({ ...err, path: `providers.${name}.${err.path}` })));
        }
      }
    }

    // Validate projects
    if (typeof config.projects !== 'object' || config.projects === null) {
      errors.push({
        path: 'projects',
        message: 'projects must be an object',
        severity: 'error',
      });
      config.projects = {};
    } else {
      for (const [name, project] of Object.entries(config.projects)) {
        const result = this.validateProject(name, project);
        if (!result.valid) {
          errors.push(...result.errors.map(err => ({ ...err, path: `projects.${name}.${err.path}` })));
        }
      }
    }

    // Validate settings
    if (!config.settings || typeof config.settings !== 'object') {
      errors.push({
        path: 'settings',
        message: 'settings must be an object',
        severity: 'error',
      });
      config.settings = this.getDefaultSettings();
    } else {
      const settingsResult = this.validateSettings(config.settings);
      if (!settingsResult.valid) {
        errors.push(...settingsResult.errors.map(err => ({ ...err, path: `settings.${err.path}` })));
      }
    }

    return {
      valid: errors.every(e => e.severity === 'warn'),
      errors,
    };
  }

  private static validateProviderInfo(name: string, provider: any): { valid: boolean; errors: ConfigValidationError[] } {
    const errors: ConfigValidationError[] = [];

    if (!provider) {
      errors.push({ path: '', message: `Provider '${name}' is null/undefined`, severity: 'error' });
      return { valid: false, errors };
    }

    if (typeof provider !== 'object') {
      errors.push({ path: '', message: `Provider '${name}' must be an object`, severity: 'error' });
      return { valid: false, errors };
    }

    // baseUrl
    if (typeof provider.baseUrl !== 'string' || !provider.baseUrl.startsWith('http')) {
      errors.push({
        path: 'baseUrl',
        message: `Provider '${name}' baseUrl must be a valid URL`,
        severity: 'error',
      });
    }

    // api (optional, can be empty string)
    if (provider.api !== undefined && typeof provider.api !== 'string') {
      errors.push({
        path: 'api',
        message: `Provider '${name}' api must be a string`,
        severity: 'error',
      });
    }

    // apiKey (optional)
    if (provider.apiKey !== undefined && typeof provider.apiKey !== 'string') {
      errors.push({
        path: 'apiKey',
        message: `Provider '${name}' apiKey must be a string`,
        severity: 'error',
      });
    }

    // authHeader (optional)
    if (provider.authHeader !== undefined && typeof provider.authHeader !== 'boolean') {
      errors.push({
        path: 'authHeader',
        message: `Provider '${name}' authHeader must be boolean`,
        severity: 'error',
      });
    }

    // models (optional)
    if (provider.models !== undefined) {
      if (!Array.isArray(provider.models)) {
        errors.push({
          path: 'models',
          message: `Provider '${name}' models must be an array`,
          severity: 'error',
        });
      } else {
        for (let i = 0; i < provider.models.length; i++) {
          if (typeof provider.models[i] !== 'string') {
            errors.push({
              path: `models[${i}]`,
              message: `Provider '${name}' model at index ${i} must be a string`,
              severity: 'error',
            });
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static validateProject(name: string, project: any): { valid: boolean; errors: ConfigValidationError[] } {
    const errors: ConfigValidationError[] = [];

    if (!project) {
      errors.push({ path: '', message: `Project '${name}' is null/undefined`, severity: 'error' });
      return { valid: false, errors };
    }

    if (typeof project !== 'object') {
      errors.push({ path: '', message: `Project '${name}' must be an object`, severity: 'error' });
      return { valid: false, errors };
    }

    // name (optional, but should match key)
    if (project.name !== undefined && typeof project.name !== 'string') {
      errors.push({
        path: 'name',
        message: `Project '${name}' name must be a string`,
        severity: 'warn',
      });
    }

    // path (optional)
    if (project.path !== undefined && typeof project.path !== 'string') {
      errors.push({
        path: 'path',
        message: `Project '${name}' path must be a string`,
        severity: 'warn',
      });
    }

    // createdAt
    if (typeof project.createdAt !== 'string' || isNaN(Date.parse(project.createdAt))) {
      errors.push({
        path: 'createdAt',
        message: `Project '${name}' createdAt must be a valid ISO date string`,
        severity: 'error',
      });
    }

    // lastUsed (optional)
    if (project.lastUsed !== undefined) {
      if (typeof project.lastUsed !== 'string' || isNaN(Date.parse(project.lastUsed))) {
        errors.push({
          path: 'lastUsed',
          message: `Project '${name}' lastUsed must be a valid ISO date string`,
          severity: 'warn',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static validateSettings(settings: AppSettings): { valid: boolean; errors: ConfigValidationError[] } {
    const errors: ConfigValidationError[] = [];

    // maxRounds
    if (typeof settings.maxRounds !== 'number' || settings.maxRounds < 1 || settings.maxRounds > 100) {
      errors.push({
        path: 'maxRounds',
        message: 'maxRounds must be a number between 1 and 100',
        severity: 'error',
      });
      // Set default
      settings.maxRounds = 10;
    }

    // maxContextTokens
    if (typeof settings.maxContextTokens !== 'number' || settings.maxContextTokens < 1024) {
      errors.push({
        path: 'maxContextTokens',
        message: 'maxContextTokens must be a number >= 1024',
        severity: 'error',
      });
      settings.maxContextTokens = 128000;
    }

    // toolTimeout
    if (typeof settings.toolTimeout !== 'number' || settings.toolTimeout < 1000) {
      errors.push({
        path: 'toolTimeout',
        message: 'toolTimeout must be a number >= 1000 (ms)',
        severity: 'error',
      });
      settings.toolTimeout = 30000;
    }

    // enableLogging
    if (typeof settings.enableLogging !== 'boolean') {
      errors.push({
        path: 'enableLogging',
        message: 'enableLogging must be a boolean',
        severity: 'warn',
      });
      settings.enableLogging = true;
    }

    // logLevel
    const validLogLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLogLevels.includes(settings.logLevel as string)) {
      errors.push({
        path: 'logLevel',
        message: `logLevel must be one of: ${validLogLevels.join(', ')}`,
        severity: 'warn',
      });
      settings.logLevel = 'info';
    }

    // defaultStrategy
    const validStrategies = ['react', 'plan-and-solve', 'reflection', 'simple', 'self-refine'];
    if (!validStrategies.includes(settings.defaultStrategy as string)) {
      errors.push({
        path: 'defaultStrategy',
        message: `defaultStrategy must be one of: ${validStrategies.join(', ')}`,
        severity: 'error',
      });
      settings.defaultStrategy = 'react';
    }

    // memoryEnabled
    if (typeof settings.memoryEnabled !== 'boolean') {
      errors.push({
        path: 'memoryEnabled',
        message: 'memoryEnabled must be a boolean',
        severity: 'warn',
      });
      settings.memoryEnabled = true;
    }

    // memoryMaxSize
    if (typeof settings.memoryMaxSize !== 'number' || settings.memoryMaxSize < 10) {
      errors.push({
        path: 'memoryMaxSize',
        message: 'memoryMaxSize must be a number >= 10',
        severity: 'warn',
      });
      settings.memoryMaxSize = 100;
    }

    // debugMode (new)
    if (typeof settings.debugMode !== 'boolean') {
      errors.push({
        path: 'debugMode',
        message: 'debugMode must be a boolean',
        severity: 'warn',
      });
      settings.debugMode = false;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static getDefaultSettings(): AppSettings {
    return {
      maxRounds: 10,
      maxContextTokens: 128000,
      toolTimeout: 30000,
      enableLogging: true,
      logLevel: 'info',
      defaultStrategy: 'react',
      memoryEnabled: true,
      memoryMaxSize: 100,
      debugMode: false,
      theme: 'dark',
    };
  }
}
