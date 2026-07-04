// CommandProcessor – Slash commands registry and execution
import type { MenuItem } from './menu-system.js';
import { DARK_THEME, LIGHT_THEME, MATRIX_THEME } from './components/OutputRenderer.js';

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
      name: 'sessions',
      description: 'Session management: list, switch',
      execute: async (api, args) => await this.handleSessions(api, args),
    });
    this.register({
      name: 'settings',
      description: 'View or edit settings: list, set <key> <value>, reset',
      execute: async (api, args) => await this.handleSettings(api, args),
    });
    this.register({
      name: 'tools',
      description: 'List, enable, disable built-in tools',
      execute: async (api, args) => await this.handleTools(api, args),
    });
    this.register({
      name: 'theme',
      description: 'Set color theme: list, set <dark|light|matrix>',
      execute: async (api, args) => await this.handleTheme(api, args),
    });
    this.register({
      name: 'compact',
      description: 'Force compaction to summarize context',
      execute: async (api) => await this.handleCompact(api),
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

  private async handleSessions(api: TTYModeApi, args: string[]): Promise<void> {
    const runtime = api.getRuntime();
    if (!runtime) {
      console.log('Runtime not available.');
      (api.getRl as any)?.prompt?.();
      return;
    }

    if (args.length === 0 || args[0] === 'list') {
      try {
        const sessions = await runtime.listSessions();
        if (sessions.length === 0) {
          console.log('No sessions.');
        } else {
          console.log('\nSessions:');
          const rows = sessions.map((s: any) => [
            s.id,
            s.name || '-',
            s.cwd,
            (s.firstMessage || '-').substring(0, 30)
          ]);
          console.table(rows as any); // suppress type issues
        }
      } catch (err: any) {
        console.log(`List failed: ${err.message}`);
      }
      (api.getRl as any)?.prompt?.();
      return;
    }

    if (args[0] === 'switch' && args[1]) {
      const id = args[1];
      try {
        const result = await runtime.switchSession(id);
        if (result.cancelled) {
          console.log('Switch cancelled.');
        } else {
          console.log(`Switched to session ${id}`);
        }
      } catch (err: any) {
        console.log(`Switch failed: ${err.message}`);
      }
      (api.getRl as any)?.prompt?.();
      return;
    }

    console.log('Usage: /sessions [list|switch <id>]');
    (api.getRl as any)?.prompt?.();
  }

  private handleSettings(api: TTYModeApi, args: string[]): void {
    const ttyMode = api as any; // TTYMode instance
    const configManager = (ttyMode as any).config as any; // access config
    if (!configManager) {
      console.log('Config manager not available.');
      (api.getRl as any)?.prompt?.();
      return;
    }

    if (args.length === 0 || args[0] === 'list') {
      const config = configManager.getAll();
      console.log('\nSettings:');
      Object.entries(config).forEach(([key, value]) => {
        console.log(`  ${key}: ${JSON.stringify(value)}`);
      });
      (api.getRl as any)?.prompt?.();
      return;
    }

    if (args[0] === 'set' && args.length >= 3) {
      const key = args[1];
      const rawValue = args.slice(2).join(' ');
      try {
        // Parse simple types
        let parsed: any = rawValue;
        if (rawValue === 'true') parsed = true;
        else if (rawValue === 'false') parsed = false;
        else if (!isNaN(Number(rawValue))) parsed = Number(rawValue);
        configManager.set(key, parsed);
        console.log(`✅ Set ${key} = ${JSON.stringify(parsed)}`);
      } catch (err: any) {
        console.log(`❌ Failed: ${err.message}`);
      }
      (api.getRl as any)?.prompt?.();
      return;
    }

    if (args[0] === 'reset') {
      configManager.reset();
      console.log('✅ Settings reset to defaults');
      (api.getRl as any)?.prompt?.();
      return;
    }

    console.log('Usage: /settings [list|set <key> <value>|reset]');
    (api.getRl as any)?.prompt?.();
  }

  private handleTheme(api: TTYModeApi, args: string[]): void {
    const tty = api as any;
    const configManager = (tty as any).config as any;
    if (!configManager) {
      console.log('Config manager not available.');
      (api.getRl as any)?.prompt?.();
      return;
    }

    if (args.length === 0 || args[0] === 'list') {
      console.log('\nAvailable themes:');
      console.log('  dark   - Dark background (default)');
      console.log('  light  - Light background');
      console.log('  matrix - Green matrix style');
      (api.getRl as any)?.prompt?.();
      return;
    }

    if (args[0] === 'set' && args[1]) {
      const allowed = ['dark', 'light', 'matrix'];
      const theme = args[1];
      if (!allowed.includes(theme)) {
        console.log(`Invalid theme. Choose from: ${allowed.join(', ')}`);
        (api.getRl as any)?.prompt?.();
        return;
      }
      configManager.set('theme', theme);
      console.log(`✅ Theme set to ${theme}. Restart TTY to apply full effect.`);
      // Also try to update output renderer immediately if possible
      const output = (tty as any).output as any;
      if (output?.setTheme) {
        const themeMap: Record<string, any> = { dark: DARK_THEME, light: LIGHT_THEME, matrix: MATRIX_THEME };
        output.setTheme(themeMap[theme]);
      }
      (api.getRl as any)?.prompt?.();
      return;
    }

    console.log('Usage: /theme [list|set <dark|light|matrix>]');
    (api.getRl as any)?.prompt?.();
  }

  private async handleCompact(api: TTYModeApi): Promise<void> {
    const runtime = api.getRuntime();
    if (!runtime?.session) {
      console.log('Session not available.');
      (api.getRl as any)?.prompt?.();
      return;
    }
    const session = runtime.session as any;
    if (typeof session.compact !== 'function') {
      console.log('Compaction not supported.');
      (api.getRl as any)?.prompt?.();
      return;
    }
    try {
      console.log('⏳ Compacting...');
      await session.compact();
      console.log('✅ Compaction complete');
    } catch (err: any) {
      console.log(`❌ Compaction failed: ${err.message}`);
    }
    (api.getRl as any)?.prompt?.();
  }

  private async handleTools(api: TTYModeApi, args: string[]): Promise<void> {
    const runtime = api.getRuntime();
    if (!runtime?.session) {
      console.log('Session not available.');
      (api.getRl as any)?.prompt?.();
      return;
    }
    const session = runtime.session as any;

    if (args.length === 0 || args[0] === 'list') {
      const allTools = session.getTools?.() || [];
      const activeTools = session.getActiveTools?.() || [];
      if (allTools.length === 0) {
        console.log('No tools available.');
      } else {
        console.log('\nTools:');
        const rows = allTools.map((t: any) => [
          t.name,
          activeTools.includes(t.name) ? '✅' : '❌',
          t.description || '-',
        ]);
        console.table(rows as any);
      }
      (api.getRl as any)?.prompt?.();
      return;
    }

    if (args[0] === 'enable' && args[1]) {
      const name = args[1];
      const current = session.getActiveTools?.() || [];
      if (!current.includes(name)) {
        await session.setActiveTools?.([...current, name]);
        console.log(`✅ Enabled tool: ${name}`);
      } else {
        console.log(`Tool ${name} already enabled.`);
      }
      (api.getRl as any)?.prompt?.();
      return;
    }

    if (args[0] === 'disable' && args[1]) {
      const name = args[1];
      const current = session.getActiveTools?.() || [];
      if (current.includes(name)) {
        await session.setActiveTools?.(current.filter((t: string) => t !== name));
        console.log(`✅ Disabled tool: ${name}`);
      } else {
        console.log(`Tool ${name} not active.`);
      }
      (api.getRl as any)?.prompt?.();
      return;
    }

    console.log('Usage: /tools [list|enable <name>|disable <name>]');
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
