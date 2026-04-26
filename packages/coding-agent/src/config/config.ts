/**
 * Configuration Manager
 * Manages application configuration, providers, and settings
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigValidator } from './validation.js';
// Auth handled elsewhere

export interface AppConfig {
  configVersion?: number;
  currentProvider: string;
  currentModel: string;
  providers: Record<string, ProviderInfo>;
  projects: Record<string, ProjectConfig>;
  settings: AppSettings;
}

export interface ProviderInfo {
  baseUrl: string;
  api: string;
  apiKey: string;
  authHeader: boolean;
  models: string[];
}

export interface ProjectConfig {
  name: string;
  path: string;
  createdAt: string;
  lastUsed: string;
  settings?: Record<string, any>;
}

export interface AppSettings {
  maxRounds: number;
  maxContextTokens: number;
  toolTimeout: number;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  defaultStrategy: 'react' | 'plan-and-solve' | 'reflection' | 'simple' | 'self-refine';
  memoryEnabled: boolean;
  memoryMaxSize: number;
  debugMode: boolean;
  theme: 'dark' | 'light';
}

/** Perform migrations on a config object */
export function migrateConfig(config: AppConfig): void {
  const version = config.configVersion ?? 0;
  if (version < 1) {
    config.configVersion = 1;
  }
  // Add future migrations here (e.g., if version < 2)
}

const DEFAULT_SETTINGS: AppSettings = {
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

const DEFAULT_CONFIG: AppConfig = {
  configVersion: 1,
  currentProvider: 'nvidia-nim',
  currentModel: 'mistralai/mistral-small-4-119b-2603',
  providers: {},
  projects: {},
  settings: { ...DEFAULT_SETTINGS },
};

const CONFIG_DIR = path.join(os.homedir(), '.picro', 'agent');
const CONFIG_FILE = process.env.PICRO_CONFIG_PATH || path.join(CONFIG_DIR, 'config.json');

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig = DEFAULT_CONFIG;
  private providerConfigs: Record<string, ProviderInfo> = {}; // Full provider configs từ models.json

  private constructor() {
    this.ensureConfigDir();
    this.loadConfig();
    this.loadProviderConfigs(); // Load models.json
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private ensureConfigDir(): void {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadConfig(): void {
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
        this.config = JSON.parse(content);
        // Migrate from older version
        migrateConfig(this.config);
        // Validate and fix config
        const result = ConfigValidator.validate(this.config);
        if (!result.valid) {
          for (const err of result.errors) {
            if (err.severity === 'error') {
              console.warn(`Config validation error at ${err.path}: ${err.message}`);
            } else {
              console.info(`Config warning at ${err.path}: ${err.message}`);
            }
          }
        }
        // Ensure settings completeness (fill missing defaults)
        this.config.settings = { ...DEFAULT_SETTINGS, ...this.config.settings };
        this.config.configVersion = DEFAULT_CONFIG.configVersion!;
        // Save corrected config if any changes
        this.saveConfig();
      } catch (error) {
        console.warn('Failed to load config, using defaults');
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } else {
      this.config = this.getDefaultConfig();
      this.saveConfig();
    }
  }

  private getDefaultConfig(): AppConfig {
    return {
      currentProvider: 'nvidia-nim',
      currentModel: 'mistralai/mistral-small-4-119b-2603',
      providers: {},
      projects: {},
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  /** Migrate config from older versions to current */
  private migrateConfig(config: AppConfig): void {
    const version = config.configVersion ?? 0;
    if (version < 1) {
      // No special migration needed; defaults will be merged later
      config.configVersion = 1;
    }
    // Add future migrations here (e.g., if version < 2)
  }

  private saveConfig(): void {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
  }

  // ============ PROVIDER CONFIGS (from models.json) ============
  private loadProviderConfigs(): void {
    // 1. Try ~/.picro/agent/models.json first
    try {
      const modelsPath = path.join(CONFIG_DIR, 'models.json');
      if (fs.existsSync(modelsPath)) {
        const data = JSON.parse(fs.readFileSync(modelsPath, 'utf-8'));
        if (data.providers) {
          for (const [provider, info] of Object.entries(data.providers)) {
            const p = info as any;
            this.providerConfigs[provider] = {
              baseUrl: p.baseUrl || '',
              api: p.api || 'openai-completions',
              apiKey: p.apiKey || '',
              authHeader: p.authHeader !== false, // default true
              models: Array.isArray(p.models) ? p.models : [],
            };
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load ~/.picro/agent/models.json:', e);
    }

    // 2. Fallback to process.cwd()/models.json
    try {
      const cwdModelsPath = path.join(process.cwd(), 'models.json');
      if (fs.existsSync(cwdModelsPath)) {
        const data = JSON.parse(fs.readFileSync(cwdModelsPath, 'utf-8'));
        if (data.providers) {
          for (const [provider, info] of Object.entries(data.providers)) {
            // Don't override if already have from home
            if (!this.providerConfigs[provider]) {
              const p = info as any;
              this.providerConfigs[provider] = {
                baseUrl: p.baseUrl || '',
                api: p.api || 'openai-completions',
                apiKey: p.apiKey || '',
                authHeader: p.authHeader !== false,
                models: Array.isArray(p.models) ? p.models : [],
              };
            }
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // Provider management (from config.json only)
  getCurrentProvider(): string {
    return this.config.currentProvider;
  }

  getCurrentModel(): string {
    return this.config.currentModel;
  }

  /**
   * Get all providers: merge providerConfigs (models.json) + config.providers
   */
  getProviders(): Record<string, ProviderInfo> {
    const all: Record<string, ProviderInfo> = { ...this.providerConfigs };
    // Override with config.providers if any (for flexibility)
    for (const [p, info] of Object.entries(this.config.providers)) {
      all[p] = info;
    }
    return all;
  }

  /**
   * Get provider metadata. Priority: providerConfigs > config.providers
   */
  getProviderInfo(provider: string): ProviderInfo | undefined {
    return this.providerConfigs[provider] || this.config.providers[provider];
  }

  /**
   * Get API key for provider.
   * Priority: 1) env var, 2) auth.json (unified & legacy),
   * 3) models.json (cwd), 4) providerConfigs (from home models.json),
   * 5) config.providers (legacy in config.json)
   */
  getApiKey(provider: string): string | undefined {
    // 1. env var
    const envVar = `${provider.toUpperCase()}_API_KEY`;
    const envKey = process.env[envVar];
    if (envKey) return envKey;

    // 2. From ~/.picro/agent/auth.json
    try {
      const authPath = path.join(CONFIG_DIR, 'auth.json');
      if (fs.existsSync(authPath)) {
        const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
        if (auth[provider]?.key) return auth[provider].key;
      }
    } catch (e) {}

    // 3. From process.cwd()/auth.json
    try {
      const authCwdPath = path.join(process.cwd(), 'auth.json');
      if (fs.existsSync(authCwdPath)) {
        const auth = JSON.parse(fs.readFileSync(authCwdPath, 'utf-8'));
        if (auth[provider]?.key) return auth[provider].key;
      }
    } catch (e) {}

    // 4. From process.cwd()/models.json
    try {
      const modelsPath = path.join(process.cwd(), 'models.json');
      if (fs.existsSync(modelsPath)) {
        const data = JSON.parse(fs.readFileSync(modelsPath, 'utf-8'));
        if (data.providers?.[provider]?.apiKey) {
          return data.providers[provider].apiKey;
        }
      }
    } catch (e) {}

    // 5. From providerConfigs (loaded from ~/.picro/agent/models.json)
    const providerConfigKey = this.providerConfigs[provider]?.apiKey;
    if (providerConfigKey) return providerConfigKey;

    // 6. From config.providers (config.json)
    const configKey = this.config.providers[provider]?.apiKey;
    if (configKey) return configKey;

    return undefined;
  }

  setProvider(provider: string, model?: string): void {
    this.config.currentProvider = provider;
    this.config.currentModel = model || 'default';
    this.saveConfig();
  }

  // Settings management
  getSettings(): AppSettings {
    return { ...this.config.settings };
  }

  getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.config.settings[key];
  }

  setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.config.settings[key] = value;
    this.saveConfig();
  }

  updateSettings(settings: Partial<AppSettings>): void {
    this.config.settings = { ...this.config.settings, ...settings };
    this.saveConfig();
  }

  // Project management
  getProjects(): Record<string, ProjectConfig> {
    return { ...this.config.projects };
  }

  getProject(name: string): ProjectConfig | undefined {
    return this.config.projects[name];
  }

  addProject(project: ProjectConfig): void {
    this.config.projects[project.name] = project;
    this.saveConfig();
  }

  updateProject(name: string, updates: Partial<ProjectConfig>): void {
    if (this.config.projects[name]) {
      this.config.projects[name] = {
        ...this.config.projects[name],
        ...updates,
      };
      this.saveConfig();
    }
  }

  deleteProject(name: string): void {
    delete this.config.projects[name];
    this.saveConfig();
  }

  // Full config access
  getConfig(): AppConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  resetConfig(): void {
    this.config = this.getDefaultConfig();
    this.saveConfig();
  }

  // Validation
  validateProvider(provider: string): boolean {
    const providers = this.getProviders();
    return !!providers[provider];
  }

  validateModel(provider: string, model: string): boolean {
    const providerInfo = this.getProviderInfo(provider);
    return providerInfo ? providerInfo.models.includes(model) : false;
  }

  hasApiKey(provider: string): boolean {
    const key = this.getApiKey(provider);
    return !!key && !key.startsWith('YOUR_');
  }

  getAvailableProviders(): string[] {
    const providers = this.getProviders();
    return Object.keys(providers).filter(p => this.hasApiKey(p));
  }
}
