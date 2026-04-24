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

  private constructor() {
    this.ensureConfigDir();
    this.loadConfig();
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

  // Provider management
  getCurrentProvider(): string {
    return this.config.currentProvider;
  }

  getCurrentModel(): string {
    return this.config.currentModel;
  }

  getProviders(): Record<string, ProviderInfo> {
    return { ...this.config.providers };
  }

  getProviderInfo(provider: string): ProviderInfo | undefined {
    return this.getProviders()[provider];
  }

  /**
   * Get API key for provider.
   * Checks environment variable first (PROVIDER_API_KEY), then config.
   */
  getApiKey(provider: string): string | undefined {
    // env var: e.g., NVIDIA_NIM_API_KEY, OPENAI_API_KEY
    const envVar = `${provider.toUpperCase()}_API_KEY`;
    const envKey = process.env[envVar];
    if (envKey) return envKey;
    // Fallback to stored key (if any)
    return this.config.providers[provider]?.apiKey;
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
