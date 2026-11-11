// HTTP API Mode entry point
// Port ý tưởng từ pi-mono
// Viết lại bằng TypeScript, không copy code
import { HttpServer } from "./http-server.js";
import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
import type { InteractiveController } from "../interactive/interactive-controller.js";

export interface HttpServerOptions {
  port?: number;
  host?: string;
  runtime: AgentSessionRuntimeInterface;
  controller: InteractiveController;
}

export class HttpServerMode {
  private server: HttpServer | null = null;
  private options: HttpServerOptions;

  constructor(options: HttpServerOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    this.server = new HttpServer(this.options);
    await this.server.start();
  }

  stop(): void {
    this.server?.stop();
  }
}

export async function startHttpServer(options: HttpServerOptions): Promise<void> {
  const server = new HttpServer(options);
  await server.start();
}
