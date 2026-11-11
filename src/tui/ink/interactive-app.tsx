// Interactive App - Ink UI entry point
// Chỉ chứa React/Ink UI, không chứa backend logic.
// Nhận runtime và controller từ bên ngoài.

import React from 'react';
import { render } from 'ink';
import { App } from './App.js';
import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';
import type { InteractiveController } from '../../modes/interactive/interactive-controller.js';

export interface InteractiveAppProps {
  runtime: AgentSessionRuntimeInterface;
  controller: import('../../modes/interactive/interactive-controller.js').InteractiveController;
  initialMessage?: string;
}

export function startInteractiveApp(props: InteractiveAppProps): void {
  render(
    <App
      runtime={props.runtime}
      controller={props.controller}
      initialMessage={props.initialMessage}
    />,
    {
      exitOnCtrlC: true,
      stdout: process.stdout,
    }
  );
}
