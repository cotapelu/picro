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

  // Chỉ in tin nhắn TRỢ LÝ MỚI: bản cũ đọc msgs[msgs.length - 1] mỗi lần callback,
  // nên một lần re-render có thể in lại chính tin nhắn đó và output bị lặp.
  let printedCount = 0;
  controller.onMessage((msgs) => {
    const fresh = msgs.slice(printedCount);
    printedCount = msgs.length;
    for (const message of fresh) {
      if (message.role === "assistant" && message.content.trim()) {
        console.log(`\nAssistant: ${message.content}\n`);
      }
    }
  });

  rl.prompt();

  rl.on("line", (line: string) => {
    const text = line.trim();
    if (text === "") {
      rl.prompt();
      return;
    }
    if (text === "exit" || text === "quit") {
      rl.close();
      return;
    }
    // await+try: lỗi từ sendMessage (mạng, hủy) trước đây trở thành unhandled
    // rejection không ai thấy.
    void controller.sendMessage(text).catch((error: unknown) => {
      console.error(`\nLỗi: ${error instanceof Error ? error.message : String(error)}\n`);
    });
    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nTạm biệt!");
    void controller.dispose?.();
    process.exit(0);
  });

  if (initialMessage) {
    void controller.sendMessage(initialMessage).catch(() => {
      // Lỗi đã hiển thị qua toast/callback.
    });
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
    const instance = render(
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

    // /quit (và mọi đường thoát nội bộ) đi qua hook này: controller gọi nó
    // thay vì process.exit trần, để terminal được khôi phục trước khi kết thúc.
    props.controller.onShutdown?.(() => {
      try {
        instance.unmount();
      } catch {
        // unmount có thể throw nếu render đã hỏng.
      }
      try {
        props.controller.dispose?.();
      } catch {
        // dispose là best-effort.
      }
      process.exit(0);
    });

    // Bản cũ không bao giờ dọn dẹp: Ink unmount không stop terminal nên raw mode,
    // bracketed paste và con trỏ ẩn còn nguyên khi tiến trình kết thúc.
    const stop = () => {
      try {
        instance.unmount();
      } catch {
        // unmount có thể throw nếu render đã hỏng.
      }
      try {
        props.controller.dispose?.();
      } catch {
        // dispose là best-effort.
      }
    };
    process.once("exit", stop);
    for (const signal of ["SIGTERM", "SIGHUP"] as const) {
      process.once(signal, () => {
        stop();
        process.exit(0);
      });
    }
  } catch (err: any) {
    console.error(`\nKhông khởi động được Ink UI: ${err?.message || err}\n`);
    console.error("Chuyển sang chế độ nhập liệu đơn giản (readline)...\n");
    startFallbackRepl(props);
  }
}
