// ConfigManager – Load and manage TTY mode configuration
import { existsSync, readFileSync } from 'node:fs';
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
    if (existsSync(configPath)) {
      try {
        const raw = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        this.config = { ...this.config, ...parsed };
      } catch (err) {
        // ignore, use defaults
      }
    }
  }

  get(key: keyof TTYConfig): any {
    return this.config[key];
  }

  getAll(): TTYConfig {
    return { ...this.config };
  }
}
