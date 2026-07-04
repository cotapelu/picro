// PromptLine – Manages the input prompt and line editing
import { InputHandler } from './index.js';

export class PromptLine {
  private input: InputHandler;
  private prompt: string;
  private onEnter: (line: string) => void;
  private onSlash: () => void;

  constructor(prompt: string, onEnter: (line: string) => void, onSlash: () => void) {
    this.prompt = prompt;
    this.onEnter = onEnter;
    this.onSlash = onSlash;
    this.input = new InputHandler();
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
