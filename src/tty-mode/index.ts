// TTY Mode - Self-contained interactive with slash menus

// ============== Command Handler ==============
interface Command {
  name: string;
  description: string;
  execute(api: TTYModeApi, args: string[]): Promise<void> | void;
}

class CommandHandler {
  private commands: Map<string, Command> = new Map();

  constructor() {
    this.registerBuiltinCommands();
  }

  private registerBuiltinCommands(): void {
    this.register({
      name: 'model',
      description: 'List and select a model',
      execute: async (api) => await this.handleModelCommand(api),
    });
    this.register({
      name: 'help',
      description: 'Show this help',
      execute: (api) => this.showHelp(api),
    });
    this.register({
      name: 'quit',
      description: 'Exit interactive mode',
      execute: (api) => api.stop(),
    });
    this.register({
      name: 'exit',
      description: 'Exit interactive mode (alias)',
      execute: (api) => api.stop(),
    });
  }

  private async handleModelCommand(api: TTYModeApi): Promise<void> {
    const services = (api as any).runtime?.services as any;
    if (!services?.modelRegistry) {
      console.log('Model registry not available.');
      (api.getRl() as any)?.prompt?.();
      return;
    }

    const registry = services.modelRegistry;
    const providers = registry.getProviders();
    const models: any[] = [];

    for (const provider of providers) {
      const providerModels = registry.getModels(provider);
      for (const m of providerModels) {
        models.push({
          id: `${provider}/${m.id}`,
          label: `${m.id} (${provider})`,
          value: { provider, model: m },
        });
      }
    }

    if (models.length === 0) {
      console.log('No models available.');
      (api.getRl() as any)?.prompt?.();
      return;
    }

    const menu = api.getMenuRenderer();
    menu.show(
      models,
      (item: any) => {
        const { provider } = item.value as { provider: string; model: any };
        const settings = services.settingsManager;
        if (provider) {
          settings.setDefaultProvider(provider);
        }
        console.log(`✅ Selected model: ${item.label}`);
        api.getRl()?.prompt?.();
      },
      () => {
        api.getRl()?.prompt?.();
      }
    );
  }

  private showHelp(api: TTYModeApi): void {
    console.log('\nSlash commands:');
    this.getAll().forEach((cmd: any) => {
      console.log(`  /${cmd.name} - ${cmd.description}`);
    });
    api.getRl()?.prompt?.();
  }

  register(command: Command): void {
    this.commands.set(command.name, command);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  async execute(api: TTYModeApi, commandName: string, args: string[]): Promise<void> {
    const cmd = this.commands.get(commandName);
    if (cmd) {
      await cmd.execute(api, args);
    } else {
      console.log(`Unknown command: /${commandName}. Type /help for commands.`);
      api.getRl()?.prompt?.();
    }
  }

  getCommandsMenuItems(): any[] {
    return this.getAll().map((cmd) => ({
      id: cmd.name,
      label: `/${cmd.name} - ${cmd.description}`,
      value: cmd,
    }));
  }
}

// ============== Menu Renderer ==============
interface MenuItem<T = any> {
  id: string;
  label: string;
  value?: T;
}

class MenuRenderer {
  private api: TTYModeApi;
  private title: string;
  private items: MenuItem[] = [];
  private selectedIndex = 0;
  private onSelect?: (item: MenuItem) => void;
  private onCancel?: () => void;

  constructor(api: TTYModeApi, title?: string) {
    this.api = api;
    this.title = title || 'Menu';
  }

  show(items: MenuItem[], onSelect: (item: MenuItem) => void, onCancel?: () => void): void {
    this.items = items;
    this.selectedIndex = 0;
    this.onSelect = onSelect;
    this.onCancel = onCancel;

    this.api.setRawMode?.(true);
    this.api.hideCursor?.();
    this.render();

    const unsub = this.api.onKeypress?.((key: any, char: string | undefined) => this.handleKey(key, char));
    (this as any)._unsub = unsub;
  }

  close(): void {
    if ((this as any)._unsub) {
      (this as any)._unsub();
    }
    this.api.showCursor?.();
    this.api.clearLine?.();
    this.api.setRawMode?.(false);
  }

  private handleKey(key: any, char: string | undefined): void {
    if (key.name === 'escape') {
      this.close();
      this.onCancel?.();
      return;
    }

    if (key.name === 'return') {
      const selected = this.items[this.selectedIndex];
      this.close();
      if (selected) this.onSelect?.(selected);
      return;
    }

    if (key.name === 'up' || key.sequence === '\x1b[A') {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.render();
      return;
    }

    if (key.name === 'down' || key.sequence === '\x1b[B') {
      this.selectedIndex = Math.min(this.items.length - 1, this.selectedIndex + 1);
      this.render();
      return;
    }
  }

  private render(): void {
    const lines: string[] = [];
    lines.push(`\n=== ${this.title} ===`);
    this.items.forEach((item, idx) => {
      const prefix = idx === this.selectedIndex ? '> ' : '  ';
      lines.push(`${prefix}${item.label}`);
    });
    lines.push('\n↑/↓: navigate  Enter: select  Esc: cancel');

    // Move cursor up and clear previous menu
    if (this.items.length > 0) {
      this.api.moveUp?.(this.items.length + 3);
    }
    this.api.write?.(lines.join('\n') + '\x1b[?25l');
  }
}

// ============== TTYMode API (for commands to call back) ==============
interface TTYModeApi {
  getRl?(): any;
  getMenuRenderer(): MenuRenderer;
  stop(): void;
  getRuntime?(): any;
  setRawMode?(enabled: boolean): void;
  hideCursor?(): void;
  showCursor?(): void;
  clearLine?(): void;
  moveUp?(lines: number): void;
  write?(text: string): void;
  onKeypress?:(handler: (key: any, char: string | undefined) => void) => () => void;
}

// ============== Main TTYMode ==============
export class TTYMode {
  private runtime: any;
  private prompt = '> ';
  private welcomeMessage = '🧠 picro agent ready. Type your message (Ctrl+C to exit).';

  // Input state
  private currentLine = '';
  private inMenu = false;
  private menuRenderer: MenuRenderer;
  private commandHandler = new CommandHandler();

  constructor(runtime: any, options?: { prompt?: string; welcomeMessage?: string }) {
    this.runtime = runtime;
    if (options?.prompt) this.prompt = options.prompt;
    if (options?.welcomeMessage) this.welcomeMessage = options.welcomeMessage;
    this.menuRenderer = new MenuRenderer(this as TTYModeApi, 'Commands');
  }

  async start(): Promise<void> {
    this.setupRawMode();
    this.subscribeToEvents();
    console.log(this.welcomeMessage);
    this.showPrompt();
    await this.waitForExit();
  }

  stop(): void {
    process.stdin.setRawMode(false);
    process.stdin.removeAllListeners();
    process.stdout.write('\n\x1b[0m\x1b[?25h');
    process.exit(0);
  }

  getRl(): any {
    return null;
  }

  getMenuRenderer(): MenuRenderer {
    return this.menuRenderer;
  }

  getCommands(): any[] {
    return this.commandHandler.getAll();
  }

  // API for MenuRenderer callbacks
  setRawMode(enabled: boolean): void {
    if (enabled) process.stdin.setRawMode(true);
    else process.stdin.setRawMode(false);
  }

  hideCursor(): void {
    process.stdout.write('\x1b[?25l');
  }

  showCursor(): void {
    process.stdout.write('\x1b[?25h');
  }

  clearLine(): void {
    process.stdout.write('\x1b[2K\r');
  }

  moveUp(lines: number = 1): void {
    process.stdout.write(`\x1b[${lines}A`);
  }

  write(text: string): void {
    process.stdout.write(text);
  }

  onKeypress(handler: (key: any, char: string | undefined) => void): () => void {
    const wrapped = (key: any, char: string | undefined) => {
      if (this.inMenu) handler(key, char);
    };
    process.stdin.on('keypress', wrapped);
    return () => {
      process.stdin.off('keypress', wrapped);
    };
  }

  // Private helpers
  private setupRawMode(): void {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('keypress', (key: any, char: string | undefined) => {
      this.handleKeypress(key, char);
    });
  }

  private handleKeypress(key: any, char: string | undefined): void {
    if (this.inMenu) {
      return; // menu-handled via onKeypress above
    }

    if (char === '\x03') {
      this.stop();
      return;
    }

    if (key.name === 'return') {
      const trimmed = this.currentLine.trim();
      this.currentLine = '';
      process.stdout.write('\n');
      if (!trimmed) {
        this.showPrompt();
        return;
      }

      if (trimmed.startsWith('/')) {
        this.handleSlashCommand(trimmed);
      } else {
        this.sendMessage(trimmed);
      }
      return;
    }

    if (key.name === 'backspace') {
      if (this.currentLine.length > 0) {
        this.currentLine = this.currentLine.slice(0, -1);
        process.stdout.write('\b \b');
      }
      return;
    }

    if (char === '/' && this.currentLine === '') {
      this.showCommandsMenu();
      return;
    }

    if (char && char >= ' ' && char <= '~') {
      this.currentLine += char;
      process.stdout.write(char);
    }
  }

  private showPrompt(): void {
    process.stdin.setRawMode(true);
    process.stdout.write(this.prompt);
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
    await this.commandHandler.execute(this as TTYModeApi, cmd, args);
  }

  private showCommandsMenu(): void {
    const commands = this.commandHandler.getAll();
    const items = commands.map((cmd) => ({
      id: cmd.name,
      label: `/${cmd.name} - ${cmd.description}`,
      value: cmd,
    }));

    this.menuRenderer.show(
      items,
      async (item: any) => {
        const cmd = item.value;
        await cmd.execute(this as TTYModeApi, []);
      },
      () => {
        this.showPrompt();
      }
    );
  }

  private subscribeToEvents(): void {
    const session = this.runtime.session as any;
    if (!session || typeof session.subscribe !== 'function') {
      return;
    }

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

  private waitForExit(): Promise<void> {
    return new Promise((resolve) => {});
  }
}
