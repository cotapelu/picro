// Interactive Mode - Entry point for Ink TUI mode
// Port ý tưởng từ pi-mono packages/coding-agent/src/modes/interactive/interactive-mode.ts
// Viết lại bằng Ink TSX, không copy code

import React from 'react';
import { render } from 'ink';
import { App } from '../tui/ink/App.js';
import type { AgentSessionRuntimeInterface } from '../runtime/index.js';
import type { CreateAgentSessionRuntimeFactory } from '../runtime/agent-session-runtime.js';
import { createAgentSessionRuntime } from '../runtime/agent-session-runtime.js';
import { getAgentDir } from '../config.js';
import { InteractiveController } from './interactive/interactive-controller.js';

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

    // Render Ink TUI
    render(
      <App
        runtime={runtime}
        controller={this.controller}
        initialMessage={this.options.initialMessage}
      />,
      {
        exitOnCtrlC: true,
        stdout: process.stdout,
      }
    );
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
