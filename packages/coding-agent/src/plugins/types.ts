/**
 * Plugin System Types
 * Define interfaces for extensible architecture
 */
import type { ToolDefinition } from '@picro/agent';

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  dependencies?: string[];
  compatibility?: {
    coreVersion: string;
    minVersion?: string;
    maxVersion?: string;
  };
}

/**
 * Hook types for plugin lifecycle events
 */
export enum HookType {
  BEFORE_MESSAGE = 'before:message',
  AFTER_MESSAGE = 'after:message',
  BEFORE_TOOL = 'before:tool',
  AFTER_TOOL = 'after:tool',
  BEFORE_STREAM = 'before:stream',
  AFTER_STREAM = 'after:stream',
  ON_ERROR = 'on:error',
  ON_INIT = 'on:init',
  ON_DESTROY = 'on:destroy',
}

/**
 * Hook event payload
 */
export interface HookEvent<T = unknown> {
  type: HookType;
  payload: T;
  cancel: boolean;
  metadata: {
    timestamp: number;
    plugin: string;
  };
}

/**
 * Hook handler function
 */
export type HookHandler<T = unknown> = (event: HookEvent<T>) => Promise<T | void> | T | void;

/**
 * Middleware context
 */
export interface MiddlewareContext {
  request: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
    tools?: string[];
  };
  response?: {
    content: string;
    usage?: { input: number; output: number };
  };
  metadata: {
    sessionId: string;
    requestId: string;
    startTime: number;
  };
}

/**
 * Middleware function
 */
export type Middleware = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

/**
 * Tool provider interface
 */
export interface ToolProvider {
  name: string;
  description: string;
  tool: ToolDefinition;
}

/**
 * Main plugin interface
 */
export interface PiMicroPlugin {
  metadata: PluginMetadata;

  /**
   * Initialize plugin
   */
  init?(): Promise<void> | void;

  /**
   * Cleanup plugin resources
   */
  destroy?(): Promise<void> | void;

  /**
   * Return tools provided by this plugin
   */
  getTools?(): ToolProvider[];

  /**
   * Return hooks for this plugin
   */
  getHooks?(): Map<HookType, HookHandler[]>;

  /**
   * Middleware for request/response processing
   */
  middleware?: Middleware;
}

/**
 * Plugin sandbox config for security
 */
export interface SandboxConfig {
  enableFsAccess: boolean;
  allowedPaths: string[];
  blockedCommands: string[];
  maxExecTime: number;
  maxMemory: number;
}

/**
 * Plugin constructor
 */
export type PluginConstructor = new (config: Record<string, unknown>) => PiMicroPlugin;

/**
 * Loaded plugin with runtime info
 */
export interface LoadedPlugin {
  instance: PiMicroPlugin;
  path: string;
  loaded: boolean;
  error?: string;
  hooks: Map<HookType, HookHandler[]>;
}
