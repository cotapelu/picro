// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runPrintMode } from './print-mode.js';
import type { AgentSessionRuntime } from '../runtime/agent-session-runtime.js';
import type { AssistantTurn, UserTurn } from '../agent/types.js';
import type { ImageContent } from '../llm/index.js';

// Helper to create mock session with a state getter
function createMockSession(initialState?: { history: any[] }): any {
  const session: any = {
    prompt: vi.fn(),
    state: initialState ? { ...initialState } : { history: [] },
    setModel: vi.fn(),
    subscribe: vi.fn(),
    destroy: vi.fn(),
  };
  return session;
}

function createMockRuntime(session?: any): AgentSessionRuntime {
  return {
    session: session || createMockSession(),
    stop: vi.fn(),
  };
}

function createMockAssistantTurn(text: string): AssistantTurn {
  return {
    role: 'assistant',
    content: [{ type: 'text', text }],
    timestamp: Date.now(),
  } as AssistantTurn;
}

describe('PrintMode', () => {
  let runtime: AgentSessionRuntime;
  let session: any;

  beforeEach(() => {
    vi.clearAllMocks();
    session = createMockSession();
    runtime = createMockRuntime(session);
  });

  describe('runPrintMode - text mode', () => {
    it('should print text from last assistant turn', async () => {
      const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      const state = {
        history: [
          { role: 'user', content: [{ type: 'text', text: 'Hello' }], timestamp: Date.now() } as UserTurn,
          createMockAssistantTurn('World response'),
        ],
      };
      // Override session state
      session.state = state;

      const exitCode = await runPrintMode(runtime, { mode: 'text', initialMessage: 'Hello' });

      expect(exitCode).toBe(0);
      expect(mockLog).toHaveBeenCalledWith('World response');
      // prompt called with initialMessage and options (images: undefined)
      expect(session.prompt).toHaveBeenCalledWith('Hello', { images: undefined });
      mockLog.mockRestore();
    });

    it('should return error code if no assistant turn found', async () => {
      const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const state = { history: [] };
      session.state = state;

      const exitCode = await runPrintMode(runtime, { mode: 'text', initialMessage: 'Hello' });

      expect(exitCode).toBe(1);
      expect(mockError).not.toHaveBeenCalled();
      mockError.mockRestore();
    });

    it('should handle multiple message prompts', async () => {
      await runPrintMode(runtime, {
        mode: 'text',
        initialMessage: 'First',
        messages: ['Second', 'Third'],
      });

      expect(session.prompt).toHaveBeenCalledTimes(3);
      // First call includes options, subsequent do not
      expect(session.prompt).toHaveBeenNthCalledWith(1, 'First', { images: undefined });
      expect(session.prompt).toHaveBeenNthCalledWith(2, 'Second');
      expect(session.prompt).toHaveBeenNthCalledWith(3, 'Third');
    });

    it('should handle image inputs in initial message', async () => {
      const images: ImageContent[] = [
        { type: 'image', source: { type: 'base64', mediaType: 'image/png', data: 'abc123' } },
      ];
      await runPrintMode(runtime, {
        mode: 'text',
        initialMessage: 'Describe this',
        initialImages: images,
      });

      expect(session.prompt).toHaveBeenCalledWith('Describe this', { images });
    });
  });

  describe('runPrintMode - json mode', () => {
    it('should output last turn as JSON', async () => {
      const mockLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      const state = {
        history: [
          { role: 'user', content: [{ type: 'text', text: 'Hello' }], timestamp: Date.now() } as UserTurn,
          createMockAssistantTurn('Response text'),
        ],
      };
      session.state = state;

      const exitCode = await runPrintMode(runtime, { mode: 'json', initialMessage: 'Hello' });

      expect(exitCode).toBe(0);
      expect(mockLog).toHaveBeenCalledWith(JSON.stringify(state.history[1]));
      mockLog.mockRestore();
    });

    it('should return error code if no turn found', async () => {
      const mockError = vi.spyOn(console, 'error').mockImplementation(() => {});
      session.state = { history: [] };

      const exitCode = await runPrintMode(runtime, { mode: 'json', initialMessage: 'Hello' });

      expect(exitCode).toBe(1);
      expect(mockError).not.toHaveBeenCalled();
      mockError.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should catch and return error code if session.prompt throws', async () => {
      const mockError = new Error('Session error');
      session.prompt = vi.fn().mockRejectedValueOnce(mockError);
      const mockLog = vi.spyOn(console, 'error').mockImplementation(() => {});

      const exitCode = await runPrintMode(runtime, { mode: 'text', initialMessage: 'Hello' });

      expect(exitCode).toBe(1);
      expect(mockLog).toHaveBeenCalledWith('Session error');
      mockLog.mockRestore();
    });
  });
});
