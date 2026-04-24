import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { ConfigValidator } from './config/validation.js';

const CONFIG_PATH = process.env.PICRO_CONFIG_PATH || path.join(homedir(), '.picro', 'agent', 'config.json');

export async function pushConfig(url: string): Promise<string> {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error('Config file not found at ' + CONFIG_PATH);
  }
  const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: content,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return `Config pushed to ${url}`;
}

export async function pullConfig(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const text = await response.text();
  // Validate
  const config = JSON.parse(text);
  const result = ConfigValidator.validate(config);
  if (!result.valid) {
    const msgs = result.errors.map((e: any) => `${e.path}: ${e.message}`).join('; ');
    throw new Error(`Config validation failed: ${msgs}`);
  }
  // Save
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  return `Config pulled from ${url}. Restart to apply.`;
}
