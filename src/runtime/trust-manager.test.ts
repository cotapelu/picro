import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectTrustStore } from './trust-manager.js';
import { existsSync, readFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

function createTempAgentDir(data: Record<string, boolean | null> = {}): { agentDir: string; trustPath: string } {
  const dir = join(homedir(), '.pi-test');
  mkdirSync(dir, { recursive: true });
  const agentDir = join(dir, `agent-${Date.now()}`);
  mkdirSync(agentDir, { recursive: true });
  const trustPath = join(agentDir, 'trust.json');
  require('fs').writeFileSync(trustPath, JSON.stringify(data, null, 2));
  return { agentDir, trustPath };
}

describe('ProjectTrustStore', () => {
  let store: ProjectTrustStore;
  let trustPath: string;

  beforeEach(() => {
    const { agentDir, trustPath: tp } = createTempAgentDir({});
    trustPath = tp;
    store = new ProjectTrustStore(agentDir);
  });

  afterEach(() => {
    if (existsSync(trustPath)) unlinkSync(trustPath);
  });

  it('should return null for untrusted directory', () => {
    expect(store.get('/some/path')).toBeNull();
  });

  it('should trust a directory when written', () => {
    // Directly write trust file for setup
    const fs = require('fs');
    fs.writeFileSync(trustPath, JSON.stringify({ '/home/user/project': true }, null, 2));
    store.getEntry('/home/user/project'); // refresh via lock
    expect(store.get('/home/user/project')).toBe(true);
    expect(store.get('/home/user/project/sub')).toBe(true); // inheritance
  });

  it('should untrust a directory', () => {
    const fs = require('fs');
    fs.writeFileSync(trustPath, JSON.stringify({ '/home/user/project': false }, null, 2));
    store.getEntry('/home/user/project');
    expect(store.get('/home/user/project')).toBe(false);
  });

  it('should find nearest trust entry walking up', () => {
    const fs = require('fs');
    fs.writeFileSync(trustPath, JSON.stringify({ '/home/user/project': true }, null, 2));
    store.getEntry('/home/user/project');
    expect(store.get('/home/user/project/a/b/c')).toBe(true);
  });

  it('should handle null values (no decision)', () => {
    const fs = require('fs');
    fs.writeFileSync(trustPath, JSON.stringify({ '/home/user/project': null }, null, 2));
    store.getEntry('/home/user/project');
    expect(store.get('/home/user/project')).toBeNull();
  });
});
