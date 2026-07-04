// CommandProcessor – Slash commands registry and execution
import type { MenuItem } from './menu-system.js';

interface TTYModeApi {
  getRl?(): any;
  getMenuRenderer<T = any>(): any;
  stop(): void;
  getRuntime(): any;
  setRawMode?(enabled: boolean): void;
  hideCursor?(): void;
  showCursor?(): void;
  clearLine?(): void;
  moveUp?(lines: number): void;
  write?(text: string): void;
  onKeypress?:(handler: (key: any, char: string | undefined) => void) => () => void;
  setInMenu?(enabled: boolean): void;
}

export interface Command {
  name: string;
  description: string;
  execute(api: TTYModeApi, args: string[]): Promise<void> | void;
}

export class CommandProcessor {
  private commands: Map<string, Command> = new Map();

  constructor() {
    this.registerBuiltin();
  }

  private registerBuiltin(): void {
    this.register({
      name: 'model',
      description: 'List and select a model',
      execute: async (api) => await this.handleModel(api),
    });
    this.register({
      name: 'help',
      description: 'Show this help',
      execute: (api) => this.showHelp(api),
    });
    this.register({
      name: 'clear',
      description: 'Clear the screen',
      execute: () => this.handleClear(),
    });
    this.register({
      name: 'history',
      description: 'Show command history',
      execute: (api) => this.handleHistory(api),
    });
    this.register({
      name: 'login',
      description: 'Set API key for provider (/login <provider> <api-key>)',
      execute: async (api, args) => await this.handleLogin(api, args),
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

  register(cmd: Command): void {
    this.commands.set(cmd.name, cmd);
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
      (api.getRl as any)?.prompt?.();
    }
  }

  getMenuItems(): MenuItem[] {
    return this.getAll().map(cmd => ({
      id: cmd.name,
      label: `/${cmd.name} - ${cmd.description}`,
      value: cmd,
    }));
  }

  private async handleModel(api: TTYModeApi): Promise<void> {
    const services = api.getRuntime()?.services as any;
    if (!services?.modelRegistry) {
      console.log('Model registry not available.');
      (api.getRl as any)?.prompt?.();
      return;
    }

    const registry = services.modelRegistry;
    const providers = registry.getProviders();
    const models: MenuItem[] = [];

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
      (api.getRl as any)?.prompt?.();
      return;
    }

    const menu = api.getMenuRenderer<MenuItem>();
    api.setInMenu?.(true);
    menu.show(
      models,
      (item: any) => {
        api.setInMenu?.(false);
        const { provider } = item.value as { provider: string; model: any };
        const settings = services.settingsManager;
        if (provider) settings.setDefaultProvider(provider);
        console.log(`✅ Selected model: ${item.label}`);
        (api.getRl as any)?.prompt?.();
      },
      () => {
        api.setInMenu?.(false);
        (api.getRl as any)?.prompt?.();
      }
    );
  }

  private showHelp(api: TTYModeApi): void {
    console.log('\nSlash commands:');
    this.getAll().forEach(cmd => {
      console.log(`  /${cmd.name} - ${cmd.description}`);
    });
    (api.getRl as any)?.prompt?.();
  }

  private async handleLogin(api: TTYModeApi, args: string[]): Promise<void> {
    if (args.length < 2) {
      console.log('Usage: /login <provider> <api-key>');
      (api.getRl as any)?.prompt?.();
      return;
    }
    const provider = args[0];
    const apiKey = args.slice(1).join(' ');
    const services = api.getRuntime()?.services as any;
    if (!services?.authStorage) {
      console.log('Auth storage not available.');
      (api.getRl as any)?.prompt?.();
      return;
    }
    try {
      await services.authStorage.setApiKey(provider, apiKey);
      console.log(`✅ API key set for ${provider}`);
    } catch (err: any) {
      console.log(`❌ Failed: ${err?.message || err}`);
    }
    (api.getRl as any)?.prompt?.();
  }

  private handleClear(): void {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  private handleHistory(api: TTYModeApi): void {
    // Get history from InputHandler via TTYMode (api)
    const history = (api as any).getHistory?.();
    if (history && history.length > 0) {
      console.log('\nCommand history:');
      history.forEach((line: string, idx: number) => {
        console.log(`  ${idx + 1}  ${line}`);
      });
    } else {
      console.log('No history yet.');
    }
    (api.getRl as any)?.prompt?.();
  }
}
