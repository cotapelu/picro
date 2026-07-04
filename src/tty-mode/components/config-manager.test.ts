import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigManager } from './config-manager.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

describe('ConfigManager', () => {
  let configPath: string;
  let homeDir: string;

  beforeEach(() => {
    homeDir = join(homedir(), '.picro-test');
    mkdirSync(homeDir, { recursive: true });
    configPath = join(homeDir, 'tty-config.json');
    // Remove if exists
    if (existsSync(configPath)) unlinkSync(configPath);
  });

  afterEach(() => {
    if (existsSync(configPath)) unlinkSync(configPath);
  });

  it('should load default config if no file', () => {
    const cfg = new ConfigManager(configPath);
    expect(cfg.get('historySize')).toBe(1000);
    expect(cfg.get('persistHistory')).toBe(true);
    expect(cfg.get('theme')).toBe('dark');
  });

  it('should load from existing file', () => {
    const custom = { historySize: 2000, theme: 'light' };
    const fs = require('fs');
    fs.writeFileSync(configPath, JSON.stringify(custom));
    const cfg = new ConfigManager(configPath);
    expect(cfg.get('historySize')).toBe(2000);
    expect(cfg.get('theme')).toBe('light');
    // defaults not overridden
    expect(cfg.get('persistHistory')).toBe(true);
  });

  it('should set and persist config', () => {
    const cfg = new ConfigManager(configPath);
    cfg.set('historySize', 3000);
    expect(cfg.get('historySize')).toBe(3000);
    // Verify persisted
    const raw = require('fs').readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.historySize).toBe(3000);
  });

  it('should reset to defaults', () => {
    const cfg = new ConfigManager(configPath);
    cfg.set('historySize', 5000);
    cfg.reset();
    expect(cfg.get('historySize')).toBe(1000);
  });

  it('getAll returns copy', () => {
    const cfg = new ConfigManager(configPath);
    const all = cfg.getAll();
    expect(all).toHaveProperty('historySize');
    expect(all).toHaveProperty('theme');
    // Modify returned object should not affect internal
    all.historySize = 1234;
    expect(cfg.get('historySize')).toBe(1000);
  });
});
