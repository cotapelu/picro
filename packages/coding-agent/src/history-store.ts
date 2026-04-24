import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

const DEFAULT_PATH = path.join(homedir(), '.picro', 'agent', 'history.json');

export class HistoryStore {
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || DEFAULT_PATH;
  }

  async load(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.warn('Failed to load command history:', e);
      return [];
    }
  }

  async save(history: string[]): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const trimmed = history.slice(-1000);
      fs.writeFileSync(this.filePath, JSON.stringify(trimmed, null, 2));
    } catch (e) {
      console.warn('Failed to save command history:', e);
    }
  }
}
