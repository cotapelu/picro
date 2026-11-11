// Interactive Mode - Entry point for Ink TUI mode
// Pure TypeScript, không dùng React/Ink.
// Chỉ tạo AgentSessionRuntime và InteractiveController, rồi giao lại cho Ink UI.

import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';
import type { CreateAgentSessionRuntimeFactory } from '../../runtime/agent-session-runtime.js';
import { createAgentSessionRuntime } from '../../runtime/agent-session-runtime.js';
import { getAgentDir } from '../../config.js';
import { InteractiveController } from './interactive-controller.js';

export interface InteractiveModeOptions {
  cwd?: string;
  agentDir?: string;
  model?: any;
  thinkingLevel?: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  createRuntime?: CreateAgentSessionRuntimeFactory;
  title?: string;
  initialMessage?: string;
}

export class InteractiveMode {
  private runtime!: AgentSessionRuntimeInterface;
  private controller!: InteractiveController;
  private options: InteractiveModeOptions;

  constructor(options: InteractiveModeOptions = {}) {
    this.options = options;
  }

  async start(): Promise<void> {
    const cwd = this.options.cwd || process.cwd();
    const agentDir = this.options.agentDir || getAgentDir();

    // Tạo factory cho runtime
    const factory = this.options.createRuntime || (async (opts: any) => ({
      diagnostics: [],
      session: null as any,
      services: null as any,
    }));

    // Tạo runtime
    const runtime = await createAgentSessionRuntime(factory, {
      cwd,
      agentDir,
      model: this.options.model,
      thinkingLevel: this.options.thinkingLevel,
    });

    this.runtime = runtime;
    this.controller = new InteractiveController({ runtime });
  }

  stop(): void {
    // Ink sẽ tự dọn dẹp khi render kết thúc
  }

  getRuntime(): AgentSessionRuntimeInterface {
    return this.runtime;
  }

  getController(): InteractiveController {
    return this.controller;
  }
}

export async function runInteractiveMode(options: InteractiveModeOptions = {}): Promise<void> {
  const mode = new InteractiveMode(options);
  await mode.start();
}
