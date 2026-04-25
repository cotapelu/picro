/**
 * Plugin Registry - Simplified
 */
import type {
  PiMicroPlugin,
  LoadedPlugin,
  HookType,
  HookHandler,
  HookEvent,
  Middleware,
  ToolProvider,
} from './types.js';

export class PluginRegistry {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private hooks: Map<HookType, Map<string, HookHandler[]>> = new Map();
  private middleware: Middleware[] = [];
  private toolProviders: Map<string, ToolProvider> = new Map();

  constructor() {
    Object.values({ 
      BEFORE_MESSAGE: 'before:message',
      AFTER_MESSAGE: 'after:message',
      BEFORE_TOOL: 'before:tool',
      AFTER_TOOL: 'after:tool',
      BEFORE_STREAM: 'before:stream',
      AFTER_STREAM: 'after:stream',
      ON_ERROR: 'on:error',
      ON_INIT: 'on:init',
      ON_DESTROY: 'on:destroy',
    } as const).forEach((type) => {
      this.hooks.set(type as HookType, new Map());
    });
  }

  async loadPlugin(name: string, factory: () => PiMicroPlugin): Promise<LoadedPlugin> {
    try {
      const instance = factory();
      const loaded: LoadedPlugin = {
        instance,
        path: name,
        loaded: true,
        hooks: instance.getHooks?.() || new Map(),
      };

      // Register hooks
      for (const [hookType, handlers] of loaded.hooks.entries()) {
        const typeHooks = this.hooks.get(hookType) || new Map();
        typeHooks.set(name, handlers);
      }

      // Register tools
      if (instance.getTools) {
        for (const tool of instance.getTools()) {
          this.toolProviders.set(tool.name, tool);
        }
      }

      // Middleware
      if (instance.middleware) {
        this.middleware.push(instance.middleware);
      }

      this.plugins.set(name, loaded);
      return loaded;
    } catch (error: any) {
      return {
        instance: null as any,
        path: name,
        loaded: false,
        error: error.message,
        hooks: new Map(),
      };
    }
  }

  async executeHooks<T>(type: HookType, payload: T): Promise<T> {
    const handlers = this.hooks.get(type);
    if (!handlers || handlers.size === 0) return payload;

    let result: T = payload;
    for (const [pluginName, pluginHandlers] of handlers.entries()) {
      for (const handler of pluginHandlers) {
        try {
          const newResult = await handler({
            type,
            payload: result,
            cancel: false,
            metadata: { timestamp: Date.now(), plugin: pluginName },
          } as HookEvent<T>);
          if (newResult !== undefined) result = newResult as T;
        } catch (e) {
          // Continue
        }
      }
    }
    return result;
  }

  getToolProviders(): ToolProvider[] {
    return Array.from(this.toolProviders.values());
  }

  getActivePlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter((p) => p.loaded);
  }
}

export default PluginRegistry;
