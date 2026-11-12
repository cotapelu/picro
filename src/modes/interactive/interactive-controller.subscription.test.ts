// Regression tests: the controller must follow the session it is driving.
//
// AgentSessionRuntime.newSession()/switchSession() replace the AgentSession
// object inside the runtime. The controller subscribed exactly once, in its
// constructor, so after any session switch it kept listening to the discarded
// session: message/agent events stopped arriving (streaming froze and
// isProcessing stayed stuck) while /new and /sessions reported success.
//
// Also covers the two commands that could never work:
//   - /model read ModelRegistry.getModels(provider), which does not exist, so the
//     model selector was always given an empty list.
//   - /sessions <id> read `entry.path` from a SessionEntry, which has no such
//     field, so switching always reported "not supported".

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractiveController } from './interactive-controller.js';
import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';

type Listener = (event: any) => void;

function createMockRuntime(overrides: Record<string, any> = {}) {
  const listenersBySession = new Map<any, Set<Listener>>();
  const sessions: any[] = [];
  let currentSession: any;

  const makeSession = (id: string) => {
    const listeners = new Set<Listener>();
    const session = {
      id,
      subscribe: (listener: Listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      emit: (event: any) => {
        for (const listener of [...listeners]) listener(event);
      },
      messages: [],
      isStreaming: false,
      model: { id: 'gemini-pro' },
    };
    listenersBySession.set(session, listeners);
    return session;
  };

  const first = makeSession('session-1');
  const second = makeSession('session-2');
  currentSession = first;

  const runtime: any = {
    get session() {
      return currentSession;
    },
    cwd: '/test/cwd',
    services: {
      modelRegistry: {
        getAll: () => [
          { id: 'gemini-pro', provider: 'google' },
          { id: 'gpt-4', provider: 'openai' },
        ],
      },
    },
    sessionManager: {
      getEntries: () => [],
      getSessionId: () => 'test-session-123',
      getCwd: () => '/test/cwd',
    },
    settings: {
      getDefaultProvider: () => 'google',
      getDefaultModel: () => 'gemini-pro',
      getDefaultThinkingLevel: () => 'off',
      getTheme: () => 'dark',
      getDisabledTools: () => [],
      setTheme: async () => {},
      setToolDisabled: async () => {},
    },
    setThinkingLevel: async () => {},
    listSessions: async () => [
      { id: 'aaaa1111', path: '/tmp/aaaa1111.jsonl', cwd: '/test/cwd' },
      { id: 'bbbb2222', path: '/tmp/bbbb2222.jsonl', cwd: '/test/cwd' },
    ],
    switchSession: async (path: string) => {
      currentSession = path.endsWith('aaaa1111.jsonl') ? first : second;
      return { cancelled: false };
    },
    newSession: async () => {
      currentSession = second;
      return { cancelled: false };
    },
    ...overrides,
  };

  return { runtime, sessions, first, second };
}

describe('InteractiveController - session subscription', () => {
  let controller: InteractiveController;

  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    controller?.dispose();
  });

  it('receives events from the session it starts with', () => {
    const { runtime, first } = createMockRuntime();
    controller = new InteractiveController({ runtime });

    first.emit({ type: 'agent_start' });
    expect(controller.getStatus().isProcessing).toBe(true);

    first.emit({ type: 'agent_end' });
    expect(controller.getStatus().isProcessing).toBe(false);
  });

  it('re-subscribes after /new swaps the session', async () => {
    const { runtime, first, second } = createMockRuntime();
    controller = new InteractiveController({ runtime });

    await controller.runCommand('new');
    expect(runtime.session).toBe(second);

    // Events from the discarded session must no longer drive the controller.
    first.emit({ type: 'agent_start' });
    expect(controller.getStatus().isProcessing).toBe(false);

    // Events from the new session must.
    second.emit({ type: 'agent_start' });
    expect(controller.getStatus().isProcessing).toBe(true);
  });

  it('re-subscribes after switching sessions', async () => {
    const { runtime, first, second } = createMockRuntime();
    controller = new InteractiveController({ runtime });

    await controller.runCommand('sessions', 'bbbb2222');
    expect(runtime.session).not.toBe(first);

    // Events from the discarded session must no longer arrive.
    first.emit({ type: 'agent_start' });
    expect(controller.getStatus().isProcessing).toBe(false);

    // Events from the newly attached session must.
    second.emit({ type: 'message_end', message: { content: [{ type: 'text', text: 'hello' }] } });
    expect(controller.getMessages().some((m) => m.role === 'assistant' && m.content === 'hello')).toBe(true);
  });

  it('dispose() detaches from the session', () => {
    const { runtime, first } = createMockRuntime();
    controller = new InteractiveController({ runtime });

    controller.dispose();
    first.emit({ type: 'agent_start' });
    expect(controller.getStatus().isProcessing).toBe(false);
  });
});

describe('InteractiveController - command data', () => {
  it('/model lists every model from the registry', async () => {
    const { runtime } = createMockRuntime();
    const controller = new InteractiveController({ runtime });

    await controller.runCommand('model');
    expect(controller.getModal().type).toBe('model-selector');
    const models = (controller.getModal().props as any).models;
    expect(models).toEqual([
      { id: 'gemini-pro', provider: 'google' },
      { id: 'gpt-4', provider: 'openai' },
    ]);

    controller.dispose();
  });

  it('/sessions <id> switches using the session file path', async () => {
    const { runtime } = createMockRuntime();
    const controller = new InteractiveController({ runtime });

    const switchSession = vi.spyOn(runtime, 'switchSession');

    await controller.runCommand('sessions', 'bbbb2222');
    expect(switchSession).toHaveBeenCalledWith('/tmp/bbbb2222.jsonl');

    controller.dispose();
  });

  it('/sessions reports an unknown id', async () => {
    const { runtime } = createMockRuntime();
    const controller = new InteractiveController({ runtime });

    await controller.runCommand('sessions', 'nope1234');
    expect(controller.getToasts().some((t) => t.type === 'error' && t.message.includes('not found'))).toBe(true);

    controller.dispose();
  });
});
