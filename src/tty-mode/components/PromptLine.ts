// PromptLine – Manages the input prompt and line editing
import type { InputHandler } from './index.js';

export class PromptLine {
  private input: InputHandler;
  private prompt: string;

  constructor(input: InputHandler, prompt: string) {
    this.input = input;
    this.prompt = prompt;
  }

  setCallbacks(onEnter: (line: string) => void, onSlash: () => void): void {
    this.input.setCallbacks(onEnter, onSlash);
  }

  start(): void {
    process.stdin.on('keypress', (key: any, char: string | undefined) => {
      this.input.handleKey(key, char);
    });
    this.show();
  }

  stop(): void {
    process.stdin.removeAllListeners('keypress');
  }

  show(): void {
    this.input.clear();
    process.stdout.write(this.prompt);
  }

  clear(): void {
    this.input.clear();
  }
}
