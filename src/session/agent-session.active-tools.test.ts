// SPDX-License-Identifier: Apache-2.0
/**
 * Regression tests: the session tool allowlist must be able to remove tools.
 *
 * setActiveToolsByName() only ever registered tools, so activating a shorter
 * list left the previously activated ones in place: a tool the user disabled
 * stayed in the tool list advertised to the model AND stayed executable for the
 * rest of the session. The `--tools`/`disabledTools` settings therefore had no
 * effect on a running session.
 */

import { describe, it, expect, vi } from 'vitest';
import { AgentSession } from './agent-session.js';
import { Agent } from '../agent/agent.js';

function createSession(): { session: AgentSession; agent: Agent } {
  const agent = new Agent(undefined, [], { maxRounds: 5 });
  const session = new AgentSession({
    agent: agent as any,
    sessionManager: { getLeafId: vi.fn(), getBranch: vi.fn().mockReturnValue([]) },
    settingsManager: {
      getCompactionEnabled: vi.fn().mockReturnValue(true),
      setCompactionEnabled: vi.fn(),
      getPromptGuidelines: vi.fn().mockReturnValue([]),
    },
    cwd: '/test',
    resourceLoader: {},
    modelRegistry: {},
    customTools: [
      { name: 'alpha', description: 'a', parameters: {}, handler: async () => 'A' },
      { name: 'beta', description: 'b', parameters: {}, handler: async () => 'B' },
      { name: 'gamma', description: 'g', parameters: {}, handler: async () => 'G' },
    ],
  } as any);
  return { session, agent };
}

describe('AgentSession.setActiveToolsByName', () => {
  it('registers the requested tools', () => {
    const { session, agent } = createSession();
    session.setActiveTools(['alpha', 'gamma']);
    expect(agent.getToolNames().sort()).toEqual(['alpha', 'gamma']);
  });

  it('unregisters tools that drop out of the selection', () => {
    const { session, agent } = createSession();

    session.setActiveTools(['alpha', 'beta', 'gamma']);
    expect(agent.getToolNames()).toHaveLength(3);

    session.setActiveTools(['alpha']);
    expect(agent.getToolNames()).toEqual(['alpha']);
    expect(agent.hasTool('beta')).toBe(false);
    expect(agent.hasTool('gamma')).toBe(false);
  });

  it('re-activating a tool works after it was removed', () => {
    const { session, agent } = createSession();

    session.setActiveTools(['alpha', 'beta']);
    session.setActiveTools(['alpha']);
    expect(agent.hasTool('beta')).toBe(false);

    session.setActiveTools(['alpha', 'beta']);
    expect(agent.getToolNames().sort()).toEqual(['alpha', 'beta']);
  });

  it('leaves tools registered after construction alone', () => {
    const agent = new Agent(undefined, [], { maxRounds: 5 });
    const session = new AgentSession({
      agent: agent as any,
      sessionManager: { getLeafId: vi.fn(), getBranch: vi.fn().mockReturnValue([]) },
      settingsManager: {
        getCompactionEnabled: vi.fn().mockReturnValue(true),
        setCompactionEnabled: vi.fn(),
        getPromptGuidelines: vi.fn().mockReturnValue([]),
      },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
      customTools: [
        { name: 'alpha', description: 'a', parameters: {}, handler: async () => 'A' },
      ],
    } as any);

    // Registered on the Agent after the session was built (e.g. by an extension
    // runner binding late): the session never adopted it into _toolDefinitions,
    // so its allowlist must not silently drop it.
    agent.registerTool({
      name: 'foreign',
      description: 'f',
      parameters: {},
      handler: async () => 'F',
    });

    session.setActiveTools(['alpha']);
    expect(agent.getToolNames().sort()).toEqual(['alpha', 'foreign']);
  });

  it('an empty selection leaves no owned tool registered', () => {
    const { session, agent } = createSession();
    session.setActiveTools(['alpha', 'beta']);
    session.setActiveTools([]);
    expect(agent.getToolNames()).toEqual([]);
  });
});

describe('AgentSession.getSessionStats - tool result counting', () => {
  function statsSession(history: any[]): any {
    const agent = new Agent(undefined, [], { maxRounds: 5 });
    const session: any = new AgentSession({
      agent: agent as any,
      sessionManager: {
        getLeafId: vi.fn(),
        getBranch: vi.fn().mockReturnValue([]),
        getSessionFile: vi.fn().mockReturnValue('/tmp/x.jsonl'),
        getSessionId: vi.fn().mockReturnValue('sid'),
      },
      settingsManager: {
        getCompactionEnabled: vi.fn().mockReturnValue(true),
        setCompactionEnabled: vi.fn(),
        getPromptGuidelines: vi.fn().mockReturnValue([]),
      },
      cwd: '/test',
      resourceLoader: {},
      modelRegistry: {},
    } as any);
    session._agentState.history.push(...history);
    return session;
  }

  it('counts tool turns as the live loop records them (role: tool)', () => {
    const session = statsSession([
      { role: 'user', content: [{ type: 'text', text: 'hi' }], timestamp: 1 },
      {
        role: 'assistant',
        content: [{ type: 'toolCall', id: 'c1', name: 'ls', arguments: {} }],
        usage: { input: 1, output: 2 },
        timestamp: 2,
      },
      { role: 'tool', toolCallId: 'c1', toolName: 'ls', content: [{ type: 'text', text: 'ok' }], isError: false, timestamp: 3 },
    ]);

    const stats = session.getSessionStats();
    expect(stats.toolCalls).toBe(1);
    expect(stats.toolResults).toBe(1);
  });

  it('counts toolResult turns as a resumed session carries them', () => {
    const session = statsSession([
      { role: 'user', content: [{ type: 'text', text: 'hi' }], timestamp: 1 },
      {
        role: 'assistant',
        content: [{ type: 'toolCall', id: 'c1', name: 'ls', arguments: {} }],
        usage: { input: 1, output: 2 },
        timestamp: 2,
      },
      { role: 'toolResult', toolCallId: 'c1', toolName: 'ls', content: [{ type: 'text', text: 'ok' }], isError: false, timestamp: 3 },
    ]);

    expect(session.getSessionStats().toolResults).toBe(1);
  });
});
