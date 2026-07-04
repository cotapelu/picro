// CommandProcessor – Slash commands registry and execution
import type { MenuItem } from './menu-system.js';

interface TTYModeApi {
  getRl?(): any;
  getMenuRenderer<T = any>(): any;
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
    const services = (api as any).runtime?.services as any;
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
    menu.show(
      models,
      (item: any) => {
        const { provider } = item.value as { provider: string; model: any };
        const settings = services.settingsManager;
        if (provider) settings.setDefaultProvider(provider);
        console.log(`✅ Selected model: ${item.label}`);
        (api.getRl as any)?.prompt?.();
      },
      () => {
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
}
