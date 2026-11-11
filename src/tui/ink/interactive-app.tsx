// Interactive App - Ink UI entry point
// Chỉ chứa React/Ink UI, không chứa backend logic.
// Nhận runtime và controller từ bên ngoài.

import React from "react";
import readline from "node:readline";
import { render } from "ink";
import { App } from "./App.js";
import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
import type { InteractiveController } from "../../modes/interactive/interactive-controller.js";

export interface InteractiveAppProps {
  runtime: AgentSessionRuntimeInterface;
  controller: InteractiveController;
  initialMessage?: string;
}

/**
 * Chế độ nhập liệu đơn giản (readline) dùng khi Ink không khởi động được
 * vì stdin không phải raw-mode TTY. Ứng dụng vẫn chạy được, chỉ không có
 * giao diện Ink full-screen nữa.
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
  // Ink yêu cầu stdin là raw-mode TTY. Nếu môi trường không hỗ trợ,
  // fallback sang readline REPL để ứng dụng vẫn chạy được thay vì crash.
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
    // Nếu Ink vẫn crash (raw mode bị từ chối dù isTTY = true),
    // fallback sang readline REPL.
    console.error(`\nKhông khởi động được Ink UI: ${err?.message || err}\n`);
    console.error("Chuyển sang chế độ nhập liệu đơn giản (readline)...\n");
    startFallbackRepl(props);
  }
}
