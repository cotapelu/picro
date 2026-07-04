// TTYMode – Orchestrator for interactive TTY experience
import { InputHandler } from './input-handler.js';
import { MenuSystem } from './menu-system.js';
import { CommandProcessor } from './command-processor.js';

export interface TTYModeOptions {
  prompt?: string;
  welcomeMessage?: string;
}

export class TTYMode {
  private runtime: any;
  private prompt = '> ';
  private welcomeMessage = '🧠 picro agent ready. Type your message (Ctrl+C to exit).';

  private input = new InputHandler();
  private menuRenderer = new MenuSystem(this as any, 'Commands');
  private commandProcessor = new CommandProcessor();
  private inMenu = false;

  constructor(runtime: any, options?: TTYModeOptions) {
    this.runtime = runtime;
    if (options?.prompt) this.prompt = options.prompt;
    if (options?.welcomeMessage) this.welcomeMessage = options.welcomeMessage;
  }

  async start(): Promise<void> {
    this.setupRawMode();
    this.subscribeToEvents();
    console.log(this.welcomeMessage);
    this.showPrompt();
    await this.waitForever();
  }

  stop(): void {
    process.stdin.setRawMode(false);
    process.stdin.removeAllListeners();
    process.stdout.write('\n\x1b[0m\x1b[?25h');
    process.exit(0);
  }

  getRl(): null { return null; }
  getMenuRenderer<T = any>(): MenuSystem<T> { return this.menuRenderer as any; }
  getCommands() { return this.commandProcessor.getAll(); }
  setRawMode(enabled: boolean): void { if (enabled) process.stdin.setRawMode(true); else process.stdin.setRawMode(false); }
  hideCursor(): void { process.stdout.write('\x1b[?25l'); }
  showCursor(): void { process.stdout.write('\x1b[?25h'); }
  clearLine(): void { process.stdout.write('\x1b[2K\r'); }
  moveUp(lines: number = 1): void { process.stdout.write(`\x1b[${lines}A`); }
  write(text: string): void { process.stdout.write(text); }
  onKeypress(handler: (key: any, char: string | undefined) => void): () => void {
    return this.input.onKeypress(handler);
  }

  // Private
  private setupRawMode(): void {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    this.input.setCallbacks(
      (line) => this.handleUserMessage(line),
      () => this.showCommandsMenu()
    );

    process.stdin.on('keypress', (key: any, char: string | undefined) => {
      this.input.handleKey(key, char);
    });
  }

  private showPrompt(): void {
    this.input.clear();
    process.stdout.write(this.prompt);
  }

  private async handleUserMessage(text: string): Promise<void> {
    if (text.startsWith('/')) {
      await this.handleSlashCommand(text);
    } else {
      await this.sendMessage(text);
    }
  }

  private async sendMessage(text: string): Promise<void> {
    try {
      await this.runtime.prompt(text);
    } catch (err) {
      console.error(`❌ Error: ${(err as Error).message}`);
      this.showPrompt();
    }
  }

  private async handleSlashCommand(line: string): Promise<void> {
    const [cmd, ...args] = line.slice(1).split(' ');
    await this.commandProcessor.execute(this as any, cmd, args);
  }

  private showCommandsMenu(): void {
    const items = this.commandProcessor.getMenuItems();
    this.menuRenderer.show(
      items,
      async (item: any) => {
        const cmd = item.value as any;
        await cmd.execute(this as any, []);
      },
      () => {
        this.showPrompt();
      }
    );
  }

  private subscribeToEvents(): void {
    const session = this.runtime.session as any;
    if (!session || typeof session.subscribe !== 'function') return;

    session.subscribe((event: any) => {
      switch (event.type) {
        case 'message_end':
          this.printAssistantResponse();
          break;
        case 'agent_start':
          process.stdout.write('\r\x1b[2K⏳ Thinking...');
          break;
        case 'agent_end':
        case 'message_start':
          process.stdout.write('\r\x1b[2K');
          if (!this.inMenu) this.showPrompt();
          break;
      }
    });
  }

  private printAssistantResponse(): void {
    const session = this.runtime.session as any;
    if (!session || !Array.isArray(session.messages)) return;

    const lastAssistant = [...session.messages].reverse().find((m: any) => m.role === 'assistant');
    if (lastAssistant) {
      const content = lastAssistant.content as any[] || [];
      const text = content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
      if (text) {
        process.stdout.write('\n');
        process.stdout.write(text + '\n');
      }
    }
    if (!this.inMenu) this.showPrompt();
  }

  private waitForever(): Promise<void> {
    return new Promise(() => {}); // never resolves; exit via stop()
  }
}
