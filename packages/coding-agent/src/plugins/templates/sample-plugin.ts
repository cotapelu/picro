/**
 * Sample Plugin Template
 */
import type { PiMicroPlugin, PluginMetadata, HookType, ToolProvider, HookEvent } from '../types.js';

export interface SamplePluginConfig {
  prefix?: string;
  enabled?: boolean;
}

export class SamplePlugin implements PiMicroPlugin {
  metadata: PluginMetadata = {
    name: 'sample-plugin',
    version: '1.0.0',
    description: 'A sample plugin demonstrating the plugin system',
    author: 'pi-micro Team',
  };

  private config: Required<SamplePluginConfig>;

  constructor(config: SamplePluginConfig = {}) {
    this.config = {
      prefix: config.prefix ?? '[Sample] ',
      enabled: config.enabled ?? true,
    };
  }

  async init(): Promise<void> {
    console.log(`Plugin ${this.metadata.name} initialized`);
  }

  async destroy(): Promise<void> {
    console.log(`Plugin ${this.metadata.name} destroyed`);
  }

  getHooks(): Map<HookType, ((event: HookEvent<unknown>) => Promise<unknown | void> | unknown | void)[]> {
    const hooks = new Map();
    
    hooks.set('before:message' as HookType, [
      async (event: HookEvent<unknown>) => {
        if (typeof event.payload === 'string') {
          return `${this.config.prefix}${event.payload}`;
        }
        return event.payload;
      }
    ]);

    hooks.set('on:error' as HookType, [
      async (event: HookEvent<unknown>) => {
        console.error(`Plugin captured error:`, event.payload);
      }
    ]);

    return hooks;
  }

  getTools(): ToolProvider[] {
    return [{
      name: 'sample_tool',
      description: 'A sample tool from plugin',
      tool: {
        name: 'sample_hello',
        description: 'Say hello from the sample plugin',
        parameters: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name to greet',
            },
          },
          required: ['name'],
        },
        handler: async (_args: unknown, _ctx: unknown) => {
          return `Hello from ${this.metadata.name}!`;
        },
      },
    }];
  }
}

export default SamplePlugin;
