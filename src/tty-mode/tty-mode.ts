// TTYMode – Orchestrator for interactive TTY experience
import { MenuSystem } from './menu-system.js';
import { CommandProcessor } from './command-processor.js';
import { InputHandler, PromptLine, OutputRenderer, ConfigManager, StatusBar } from './components/index.js';
import type { AgentSessionRuntimeInterface } from '../runtime/agent-session-interfaces.js';

export class TTYMode {
  private runtime: AgentSessionRuntimeInterface;
  private prompt = '> ';
  private welcomeMessage = '🧠 picro agent ready. Type your message (Ctrl+C to exit).';

  private config = new ConfigManager();
  private input = new InputHandler(
    this.config.get('historySize'),
    this.config.get('persistHistory'),
    this.config.get('historyFile')
  );
  private promptLine!: PromptLine;
  private output = new OutputRenderer();
  private menuRenderer = new MenuSystem(this as any, 'Commands');
  private commandProcessor = new CommandProcessor();
  private statusBar = new StatusBar();
  private inMenu = false;

  constructor(runtime: AgentSessionRuntimeInterface, options?: { prompt?: string; welcomeMessage?: string }) {
    this.runtime = runtime;
    if (options?.prompt) this.prompt = options.prompt;
    if (options?.welcomeMessage) this.welcomeMessage = options.welcomeMessage;
  }

  async start(): Promise<void> {
    this.setupPromptLine();
    this.subscribeToEvents();
    console.log(this.welcomeMessage);
    this.promptLine.show();
    await this.waitForever();
  }

  stop(): void {
    process.stdin.setRawMode(false);
    process.stdin.removeAllListeners();
    this.output.clearLine();
    this.output.showCursor();
    process.exit(0);
  }

  getRl(): null { return null; }
  getMenuRenderer<T = any>(): MenuSystem<T> { return this.menuRenderer as any; }
  getCommands() { return this.commandProcessor.getAll(); }
  getRuntime() { return this.runtime; }

  setRawMode(enabled: boolean): void { if (enabled) process.stdin.setRawMode(true); else process.stdin.setRawMode(false); }
  hideCursor(): void { this.output.hideCursor(); }
  showCursor(): void { this.output.showCursor(); }
  clearLine(): void { this.output.clearLine(); }
  moveUp(lines: number = 1): void { this.output.moveUp(lines); }
  write(text: string): void { process.stdout.write(text); }
  onKeypress(handler: (key: any, char: string | undefined) => void): () => void {
    // Not used directly; promptLine handles keys
    return () => {};
  }
  setInMenu(enabled: boolean): void { this.inMenu = enabled; }

  // Private
  private setupPromptLine(): void {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    // Apply config
    if (this.config.get('multiLine')) {
      this.input.setMultiLine(true);
    }

    this.promptLine = new PromptLine(this.input, this.prompt);
    this.promptLine.setCallbacks(
      (line) => this.handleUserMessage(line),
      () => this.showCommandsMenu()
    );
  }

  private showPrompt(): void {
    this.promptLine.show();
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
      this.output.showError((err as Error).message);
      this.showPrompt();
    }
  }

  private async handleSlashCommand(line: string): Promise<void> {
    const [cmd, ...args] = line.slice(1).split(' ');
    await this.commandProcessor.execute(this as any, cmd, args);
    // After command execution, if not in menu, show prompt (command itself may show prompt)
    if (!this.inMenu) this.showPrompt();
  }

  private showCommandsMenu(): void {
    const items = this.commandProcessor.getMenuItems();
    this.menuRenderer.show(
      items,
      async (item: any) => {
        this.inMenu = false;
        const cmd = item.value as any;
        await cmd.execute(this as any, []);
        if (!this.inMenu) this.showPrompt();
      },
      () => {
        this.inMenu = false;
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
          this.updateStatusBar();
          break;
        case 'agent_start':
          this.output.showThinking();
          break;
        case 'agent_end':
        case 'message_start':
          this.output.clearLine();
          this.updateStatusBar();
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
        this.output.showAssistantResponse(text);
      }
    }
    if (!this.inMenu) this.showPrompt();
  }

  private updateStatusBar(): void {
    // Check if status bar is enabled
    if (this.config.get('showStatusBar') === false) return;

    const model = (this.runtime as any).services?.settingsManager?.getDefaultProvider?.() || 'unknown';
    const session = (this.runtime as any).session;
    let usage: any = undefined;
    if (session?.getContextUsage) {
      usage = session.getContextUsage();
    }

    const cwd = (this.runtime as any).cwd || '';

    // Render status bar on its own line above prompt
    this.statusBar.print(model, usage || undefined, cwd);
  }

  private waitForever(): Promise<void> {
    return new Promise(() => {}); // never resolves; exit via stop()
  }
}
