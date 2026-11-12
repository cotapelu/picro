// HTTP API Mode - port ý tưởng từ pi-mono
// Chạy như server REST/WebSocket, cho phép gọi agent từ bên ngoài
// Viết lại bằng TypeScript, không copy code
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { AgentSessionRuntimeInterface } from "../../runtime/index.js";
import type { InteractiveController } from "../interactive/interactive-controller.js";

interface HttpServerOptions {
  port?: number;
  host?: string;
  runtime: AgentSessionRuntimeInterface;
  controller: InteractiveController;
}

/** Hard cap on request bodies: unbounded accumulation let any client OOM the agent process. */
const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB

function isLoopbackHost(host: string | undefined): boolean {
  if (!host) return true;
  const h = host.replace(/^[\["']+|["'\]]+$/g, "");
  return h === "localhost" || h === "::1" || h.startsWith("127.");
}

export class HttpServer {
  private server: http.Server | null = null;
  private wss: WebSocketServer | null = null;
  private options: HttpServerOptions;
  private clients: Set<WebSocket> = new Set();

  constructor(options: HttpServerOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleHttpRequest(req, res);
      });

      this.wss = new WebSocketServer({ server: this.server });

      this.wss.on("connection", (ws: WebSocket) => {
        this.clients.add(ws);
        ws.on("close", () => {
          this.clients.delete(ws);
        });
        ws.on("message", (data: string) => {
          this.handleWebSocketMessage(ws, data);
        });
        ws.send(JSON.stringify({ type: "connected", message: "Connected to picro API" }));
      });

      this.server.listen(this.options.port, this.options.host, () => {
        const addr = this.server?.address();
        const port = typeof addr === "object" && addr ? addr.port : this.options.port;
        console.log(`Picro HTTP API server listening on ${this.options.host || "0.0.0.0"}:${port}`);
        // The API exposes /prompt, which can drive tools (including bash) on this
        // machine, and it has no authentication. Binding to a non-loopback
        // interface therefore exposes remote code execution to the network.
        if (!isLoopbackHost(this.options.host)) {
          console.warn(
            `[security] HTTP API is bound to ${this.options.host} without authentication. ` +
            `Anyone able to reach this port can run commands on this machine. ` +
            `Bind to 127.0.0.1 or put it behind an authenticating reverse proxy.`
          );
        }
        resolve(undefined);
      });

      this.server.on("error", (err: Error) => {
        reject(err);
      });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
    }
    if (this.wss) {
      this.wss.close();
    }
    this.clients.forEach((client) => client.close());
    this.clients.clear();
  }

  private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = req.url || "/";
    const method = req.method || "GET";

    // Health check
    if (url === "/health" && method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", timestamp: Date.now() }));
      return;
    }

    // List sessions
    if (url === "/sessions" && method === "GET") {
      try {
        const sessionMgr = this.options.runtime.sessionManager as any;
        const entries = sessionMgr.getEntries?.() || [];
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ sessions: entries }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to list sessions" }));
      }
      return;
    }

    // Send message
    if (url === "/prompt" && method === "POST") {
      try {
        const body = await this.readBody(req);
        const data = JSON.parse(body);
        const text = data.text || data.message || "";

        if (!text) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing text/message field" }));
          return;
        }

        await this.options.controller.sendMessage(text);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", message: "Message sent" }));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message || "Failed to send message" }));
      }
      return;
    }

    // Get messages
    if (url === "/messages" && method === "GET") {
      try {
        const messages = this.options.controller.getMessages();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ messages }));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message || "Failed to get messages" }));
      }
      return;
    }

    // Get status
    if (url === "/status" && method === "GET") {
      try {
        const status = this.options.controller.getStatus();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status }));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message || "Failed to get status" }));
      }
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }

  private async handleWebSocketMessage(ws: WebSocket, data: string): Promise<void> {
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case "prompt": {
          await this.options.controller.sendMessage(msg.text || msg.message || "");
          const messages = this.options.controller.getMessages();
          ws.send(JSON.stringify({ type: "messages", messages }));
          break;
        }

        case "get_messages": {
          const messages = this.options.controller.getMessages();
          ws.send(JSON.stringify({ type: "messages", messages }));
          break;
        }

        case "get_status": {
          const status = this.options.controller.getStatus();
          ws.send(JSON.stringify({ type: "status", status }));
          break;
        }

        case "command": {
          await this.options.controller.runCommand(msg.command, msg.args);
          const messages = this.options.controller.getMessages();
          ws.send(JSON.stringify({ type: "messages", messages }));
          break;
        }

        default:
          ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
      }
    } catch (err: any) {
      ws.send(JSON.stringify({ type: "error", message: err.message || "Unknown error" }));
    }
  }

  private async readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = "";
      let bytes = 0;
      let aborted = false;
      req.on("data", (chunk: string) => {
        if (aborted) return;
        bytes += Buffer.byteLength(chunk);
        if (bytes > MAX_BODY_BYTES) {
          aborted = true;
          reject(new Error(`Request body too large (limit ${MAX_BODY_BYTES} bytes)`));
          req.destroy();
          return;
        }
        body += chunk;
      });
      req.on("end", () => {
        if (!aborted) resolve(body);
      });
      req.on("error", (err: Error) => {
        if (!aborted) reject(err);
      });
    });
  }

  // Broadcast message to all WebSocket clients
  broadcast(message: any): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }
}
