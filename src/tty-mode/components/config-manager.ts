// ConfigManager – Load and manage TTY mode configuration
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export interface TTYConfig {
  historySize: number;
  persistHistory: boolean;
  historyFile: string;
  theme: 'dark' | 'light' | 'matrix';
  showStatusBar: boolean;
  multiLine: boolean;
  keybindings: Record<string, string>; // action -> key sequence
}

const DEFAULT_CONFIG: TTYConfig = {
  historySize: 1000,
  persistHistory: true,
  historyFile: '.picro_history',
  theme: 'dark',
  showStatusBar: true,
  multiLine: true,
  keybindings: {
    send: 'Enter',
    multiLineSend: 'Ctrl+Enter',
    cancel: 'Esc',
    clear: 'Ctrl+L',
    historySearch: 'Ctrl+R',
  },
};

export class ConfigManager {
  private config: TTYConfig;
  private configPath!: string;

  constructor(customPath?: string) {
    this.config = { ...DEFAULT_CONFIG };
    this.load(customPath);
  }

  private load(customPath?: string): void {
    let configPath = customPath;
    if (!configPath) {
      const home = homedir();
      configPath = join(home, '.picro', 'tty-config.json');
    }
    this.configPath = configPath;
    if (existsSync(configPath)) {
      try {
        const raw = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.config = { ...this.config, ...parsed };
      } catch {
        // ignore, use defaults
      }
    }
  }

  get<K extends keyof TTYConfig>(key: K): TTYConfig[K] {
    return this.config[key];
  }

  getAll(): TTYConfig {
    return { ...this.config };
  }

  set<K extends keyof TTYConfig>(key: K, value: TTYConfig[K]): void {
    this.config[key] = value;
    this.save();
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    this.save();
  }

  private save(): void {
    try {
      const dir = join(this.configPath, '..');
      // Ensure dir exists
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch {
      // ignore
    }
  }
}
