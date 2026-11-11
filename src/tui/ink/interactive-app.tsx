// Interactive App - Ink UI entry point
// Chỉ chứa React/Ink UI, không chứa backend logic.
// Nhận runtime và controller từ bên ngoài.
// Bắt chước nguyên tắc pi-mono InteractiveMode: chạy TUI fullscreen,
// fallback sang readline khi stdin không phải raw-mode TTY.

import React from "react";
import readline from "node:readline";
import { render } from "ink";
import { App } from "./App.js";
import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
import type { InteractiveControllerLike } from "./controller-bridge.js";

export interface InteractiveAppProps {
  runtime: AgentSessionRuntimeInterface;
  /** Cầu nối duy nhất tới logic app (xem controller-bridge.ts). */
  controller: InteractiveControllerLike;
  initialMessage?: string;
}

/**
 * Chế độ nhập liệu đơn giản (readline) khi stdin không phải raw-mode TTY.
 * Ink không khởi động được, nên dùng readline thuần để người dùng vẫn nhập liệu.
 * Gõ xong nhấn Enter để gửi tin nhắn.
 */
function startFallbackRepl(props: InteractiveAppProps): void {
  const { controller, initialMessage } = props;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  controller.onMessage((msgs) => {
    const last = msgs[msgs.length - 1];
    if (last && last.role === "assistant") {
      console.log(`\nAssistant: ${last.content}\n`);
    }
  });

  rl.prompt();

  rl.on("line", async (line: string) => {
    const text = line.trim();
    if (text === "") {
      rl.prompt();
      return;
    }
    if (text === "exit" || text === "quit") {
      rl.close();
      return;
    }
    await controller.sendMessage(text);
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nTạm biệt!");
    process.exit(0);
  });

  if (initialMessage) {
    void controller.sendMessage(initialMessage);
  }
}

export function startInteractiveApp(props: InteractiveAppProps): void {
  // Ink yêu cầu stdin là raw-mode TTY. Nếu không, fallback sang readline REPL
  // thay vì crash lặng (giống pi-mono xử lý dead terminal).
  if (!process.stdin.isTTY) {
    startFallbackRepl(props);
    return;
  }

  try {
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
  } catch (err: any) {
    console.error(`\nKhông khởi động được Ink UI: ${err?.message || err}\n`);
    console.error("Chuyển sang chế độ nhập liệu đơn giản (readline)...\n");
    startFallbackRepl(props);
  }
}
