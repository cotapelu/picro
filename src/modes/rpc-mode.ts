// RPC mode - JSON-RPC 2.0 over stdin/stdout
import { createInterface } from 'node:readline';
import type { AgentSessionRuntime } from '../runtime/agent-session-runtime.js';
import type { AgentSessionRuntimeInterface } from '../runtime/agent-session-interfaces.js';

/**
 * JSON-RPC 2.0 error codes
 */
const RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

/**
 * Handle a single JSON-RPC request against the runtime.
 */
async function handleRpcRequest(
  runtime: AgentSessionRuntimeInterface,
  req: any
): Promise<any> {
  const { method, params, id } = req;

  // Validate JSON-RPC 2.0 structure
  if (typeof method !== 'string') {
    throw { code: RPC_ERRORS.INVALID_REQUEST, message: 'Method must be a string' };
  }

  // Dispatch methods
  try {
    switch (method) {
      // Agent core
      case 'agent.prompt':
        return await handlePrompt(runtime, params);
      case 'agent.cycleModel':
        return await runtime.session.cycleModel(params?.direction ?? 'forward');
      case 'agent.setThinkingLevel':
        return await handleSetThinkingLevel(runtime, params);
      case 'agent.getMessages':
        return runtime.session.messages as any[];
      case 'agent.getLastAssistantText':
        return runtime.session.getLastAssistantText();
      case 'agent.abort':
        runtime.session.abort();
        return null;

      // Session management
      case 'session.new':
        return await runtime.newSession();
      case 'session.switch':
        if (!params?.path) throw { code: RPC_ERRORS.INVALID_PARAMS, message: 'path required' };
        return await runtime.switchSession(params.path);
      case 'session.fork':
        if (!params?.entryId) throw { code: RPC_ERRORS.INVALID_PARAMS, message: 'entryId required' };
        return await runtime.fork(params.entryId, params?.position ? { position: params.position } : undefined);
      case 'session.list':
        return await runtime.listSessions();

      // Settings & Auth
      case 'settings.getDefaultProvider':
        return runtime.settings.getDefaultProvider() ?? null;
      case 'settings.setDefaultProvider':
        if (!params?.provider) throw { code: RPC_ERRORS.INVALID_PARAMS, message: 'provider required' };
        runtime.settings.setDefaultProvider(params.provider);
        return null;
      case 'settings.getDefaultModel':
        return runtime.settings.getDefaultModel() ?? null;
      case 'settings.setDefaultModel':
        if (!params?.modelId) throw { code: RPC_ERRORS.INVALID_PARAMS, message: 'modelId required' };
        runtime.settings.setDefaultModel(params.modelId);
        return null;

      // Auth
      case 'auth.setApiKey':
        if (!params?.provider || !params?.apiKey) throw { code: RPC_ERRORS.INVALID_PARAMS, message: 'provider and apiKey required' };
        await runtime.authStorage.setApiKey(params.provider, params.apiKey);
        return null;
      case 'auth.removeApiKey':
        if (!params?.provider) throw { code: RPC_ERRORS.INVALID_PARAMS, message: 'provider required' };
        await runtime.authStorage.removeApiKey(params.provider);
        return null;
      case 'auth.getProviders':
        return runtime.authStorage.getProviders?.() ?? [];

      // Clipboard
      case 'copyToClipboard':
        if (!params?.text) throw { code: RPC_ERRORS.INVALID_PARAMS, message: 'text required' };
        await runtime.copyToClipboard(params.text);
        return null;

      // Query session info
      case 'session.getStats':
        return runtime.session.getSessionStats();
      case 'session.getTree':
        return runtime.session.getTree();
      case 'session.getLeafId':
        return runtime.session.getLeafId();
      case 'session.getContextUsage':
        return runtime.session.getContextUsage();

      // Unknown method
      default:
        throw { code: RPC_ERRORS.METHOD_NOT_FOUND, message: `Method not found: ${method}` };
    }
  } catch (err: any) {
    if (err?.code && err?.message) {
      throw err; // Already an RPC error object
    }
    throw { code: RPC_ERRORS.INTERNAL_ERROR, message: err?.message ?? String(err) };
  }
}

/**
 * Handle 'agent.prompt' method.
 */
async function handlePrompt(runtime: AgentSessionRuntimeInterface, params: any): Promise<any> {
  const { text, images } = params;
  if (typeof text !== 'string') {
    throw { code: RPC_ERRORS.INVALID_PARAMS, message: 'text (string) required' };
  }
  await runtime.prompt(text, images ? { images } : undefined);
  return { success: true };
}

/**
 * Handle 'agent.setThinkingLevel' method.
 */
async function handleSetThinkingLevel(runtime: AgentSessionRuntimeInterface, params: any): Promise<any> {
  const { level } = params;
  if (typeof level !== 'string') {
    throw { code: RPC_ERRORS.INVALID_PARAMS, message: 'level (string) required' };
  }
  runtime.setThinkingLevel(level as any);
  return null;
}

/**
 * Run the agent in RPC mode.
 * Reads line-delimited JSON-RPC 2.0 requests from stdin and writes responses to stdout.
 *
 * @param runtime - The agent session runtime
 */
export async function runRpcMode(runtime: AgentSessionRuntime): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
    crlfDelay: Infinity,
  });

  // Handle SIGINT/SIGTERM gracefully
  const shutdown = () => {
    rl.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let req: any;
    try {
      req = JSON.parse(trimmed);
    } catch (err) {
      // Parse error response
      const response = {
        jsonrpc: '2.0',
        error: { code: RPC_ERRORS.PARSE_ERROR, message: 'Parse error: invalid JSON' },
        id: null,
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      continue;
    }

    // Basic validation
    if (!req.jsonrpc || req.jsonrpc !== '2.0') {
      const response = {
        jsonrpc: '2.0',
        error: { code: RPC_ERRORS.INVALID_REQUEST, message: 'Invalid Request' },
        id: req.id ?? null,
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      continue;
    }

    if (typeof req.method !== 'string') {
      const response = {
        jsonrpc: '2.0',
        error: { code: RPC_ERRORS.INVALID_REQUEST, message: 'Method must be a string' },
        id: req.id ?? null,
      };
      process.stdout.write(JSON.stringify(response) + '\n');
      continue;
    }

    // Process request
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      result: await handleRpcRequest(runtime, req).catch((err: any) => {
        return { error: err };
      }),
      id: req.id,
    }) + '\n');
  }
}
