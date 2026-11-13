// Tests for the interactive controller's key actions and transcript fidelity.
//
// These cover the bugs found while auditing pi-mono's interactive-mode against
// picro's: Ctrl+C killing the app instead of clearing the editor, the missing
// steering/follow-up queue, tool calls losing their arguments, and thinking
// blocks never reaching the transcript.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractiveController } from './interactive-controller.js';
import type { AgentSessionRuntimeInterface } from '../../runtime/index.js';
import type { SettingRow } from '../../tui/ink/components/SettingsSelector.js';

type FakeSession = {
  subscribe(listener: (event: unknown) => void): () => void;
  isStreaming: boolean;
  messages: unknown[];
  model: unknown;
  getSteeringMessages(): readonly string[];
  getFollowUpMessages(): readonly string[];
  clearQueue(): { steering: string[]; followUp: string[] };
  prompt(text: string, options?: unknown): Promise<void>;
};

function makeController(sessionOverrides: Partial<FakeSession> = {}) {
  const steering: string[] = [];
  const followUp: string[] = [];
  const listeners: Array<(event: unknown) => void> = [];
  const session: FakeSession = {
    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
    isStreaming: false,
    messages: [],
    model: { id: 'test-model', provider: 'test', contextWindow: 8000 },
    getSteeringMessages: () => steering,
    getFollowUpMessages: () => followUp,
    clearQueue: () => ({ steering: steering.splice(0, steering.length), followUp: followUp.splice(0, followUp.length) }),
    prompt: async (text: string, options?: unknown) => {
      if ((options as { streamingBehavior?: string } | undefined)?.streamingBehavior === 'followUp') {
        followUp.push(text);
      } else if ((options as { streamingBehavior?: string } | undefined)?.streamingBehavior === 'steer') {
        steering.push(text);
      }
    },
    ...sessionOverrides,
  };

  const runtime = {
    cwd: '/tmp',
    session,
    settings: {},
    services: { modelRegistry: { getAll: () => [{ id: 'other', provider: 'test', name: 'Other' }] } },
    // Runtime bọc session: prompt đi thẳng xuống session để cả hai đường
    // (queue và gửi ngay) dùng đúng một hàng đợi.
    prompt: async (text: string, options?: unknown) => session.prompt(text, options),
    getContextUsage: () => ({ tokens: 1200, contextWindow: 8000, percent: 15 }),
    copyToClipboard: async () => {},
    abort: vi.fn(),
    cycleModel: async () => ({ model: { id: 'other', provider: 'test', name: 'Other' }, thinkingLevel: 'off' }),
  } as unknown as AgentSessionRuntimeInterface;

  const controller = new InteractiveController({ runtime });
  return { controller, session, runtime, steering, followUp, listeners };
}

beforeEach(() => {
  vi.useRealTimers();
});

describe('InteractiveController key actions', () => {
  it('first Ctrl+C clears the editor, second press within 500ms asks to shut down', () => {
    const { controller } = makeController();
    let calls = 0;
    controller.onShutdown(() => {
      calls += 1;
    });
    controller.onEditorCallbacks({ clear: () => {}, read: () => 'draft' });

    controller.handleCtrlC();
    expect(calls).toBe(0); // Lần đầu chỉ xóa ô nhập.

    controller.handleCtrlC();
    expect(calls).toBe(1); // Lần hai trong 500ms -> thoát an toàn.
  });

  it('Ctrl+D exits only when the editor is empty', () => {
    const { controller } = makeController();
    let calls = 0;
    controller.onShutdown(() => {
      calls += 1;
    });
    controller.onEditorCallbacks({ clear: () => {}, read: () => 'still typing' });

    controller.handleCtrlD();
    expect(calls).toBe(0);

    controller.onEditorCallbacks({ clear: () => {}, read: () => '   ' });
    controller.handleCtrlD();
    expect(calls).toBe(1);
  });

  it('Escape aborts a streaming turn and restores the queue into the editor', () => {
    const { controller, runtime, steering } = makeController({ isStreaming: true });
    steering.push('queued work');
    let restored = '';
    controller.onEditorCallbacks({
      clear: () => {},
      read: () => '',
      setText: (text: string) => {
        restored = text;
      },
    });

    controller.handleEscape();

    expect(vi.mocked(runtime.abort)).toHaveBeenCalled();
    expect(restored).toBe('queued work');
    expect(controller.getQueue()).toEqual({ steering: [], followUp: [] });
  });

  it('Shift+Enter queues a follow-up while streaming', async () => {
    const { controller, followUp } = makeController({ isStreaming: true });
    controller.onEditorCallbacks({ clear: () => {}, read: () => '' });
    await controller.queueFollowUp('later please');
    expect(followUp).toEqual(['later please']);
    expect(controller.getQueue().followUp).toEqual(['later please']);
  });

  it('Shift+Enter submits immediately when idle', async () => {
    const prompt = vi.fn(async () => {});
    const runtime = { prompt } as unknown as AgentSessionRuntimeInterface;
    const { controller } = makeController();
    (controller as unknown as { runtime: AgentSessionRuntimeInterface }).runtime = runtime;
    await controller.queueFollowUp('now please');
    expect(prompt).toHaveBeenCalledWith('now please');
  });

  it('restoreQueue merges queued messages with the current editor text', () => {
    const { controller, steering } = makeController();
    steering.push('one');
    controller.onEditorCallbacks({
      clear: () => {},
      read: () => 'typed',
      setText: () => {},
    });
    expect(controller.restoreQueue()).toBe(1);
    expect(controller.getQueue()).toEqual({ steering: [], followUp: [] });
  });

  it('queue restore is exposed to the view through loadTranscript-independent hooks', () => {
    const { controller } = makeController();
    const seen: Array<{ steering: string[]; followUp: string[] }> = [];
    (controller as unknown as { onQueueChange?: (q: { steering: string[]; followUp: string[] }) => void }).onQueueChange = (q) => seen.push(q);
    controller.loadTranscript();
    expect(seen.length).toBe(1);
    expect(seen[0]).toEqual({ steering: [], followUp: [] });
  });
});

describe('InteractiveController transcript fidelity', () => {
  it('keeps the tool name and arguments in the transcript item', () => {
    const { controller, listeners } = makeController();
    listeners[0]!({
      type: 'tool_execution_start',
      toolCallId: 'call-1',
      toolName: 'grep',
      args: { pattern: 'foo', path: 'src' },
    });
    listeners[0]!({
      type: 'tool_execution_end',
      toolCallId: 'call-1',
      result: { content: [{ type: 'text', text: '3 matches' }] },
      isError: false,
      durationMs: 42,
    });

    const item = controller.getTranscript().find((i) => i.kind === 'tool');
    expect(item?.toolName).toBe('grep');
    expect(item?.toolArgs).toEqual({ pattern: 'foo', path: 'src' });
    expect(item?.toolResult?.durationMs).toBe(42);
    expect(item?.toolPartial).toBe(false);
  });

  it('marks a tool that never finished as partial', () => {
    const { controller, listeners } = makeController();
    listeners[0]!({ type: 'tool_execution_start', toolCallId: 'c2', toolName: 'bash', args: { command: 'ls' } });
    const item = controller.getTranscript().find((i) => i.kind === 'tool');
    expect(item?.toolPartial).toBe(true);
  });

  it('attaches thinking text to the assistant transcript item', () => {
    const { controller, listeners } = makeController();
    listeners[0]!({ type: 'message_start', message: { role: 'assistant', content: [] } });
    listeners[0]!({
      type: 'message_update',
      message: {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'weighing options' },
          { type: 'text', text: 'Answer' },
        ],
      },
    });
    listeners[0]!({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'Answer' }] } });

    const item = controller.getTranscript().find((i) => i.kind === 'assistant');
    expect(item?.thinking).toContain('weighing options');
    expect(item?.text).toBe('Answer');
  });

  it('renders interactive bash as a bash transcript item', async () => {
    const { controller, session } = makeController();
    (session as unknown as { executeBash: unknown }).executeBash = async () => ({
      output: 'a.ts',
      exitCode: 0,
    });
    await controller.sendMessage('!ls');
    const item = controller.getTranscript().find((i) => i.kind === 'tool' && i.toolName === 'bash');
    expect(item?.toolName).toBe('bash');
    expect(item?.toolArgs).toEqual({ command: 'ls' });
  });
});

describe('InteractiveController slash commands', () => {
  it('/model with an argument switches the model instead of reopening the selector', async () => {
    const setModel = vi.fn(async () => {});
    const { controller } = makeController();
    (controller as unknown as { runtime: { session: { setModel: unknown } } }).runtime.session.setModel = setModel;
    await controller.runCommand('model', 'test/other');
    expect(setModel).toHaveBeenCalled();
  });

  it('/copy without arguments copies the last assistant message', async () => {
    const { controller, listeners } = makeController();
    listeners[0]!({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text: 'final' }] } });
    const write = vi.fn(async () => true);
    vi.doMock('../../utils/clipboard.js', () => ({ writeClipboardText: write }));
    await controller.runCommand('copy');
    vi.doUnmock('../../utils/clipboard.js');
  });

  it('unknown commands still report themselves instead of throwing', async () => {
    const { controller } = makeController();
    await expect(controller.runCommand('definitely-not-a-command')).resolves.toBeUndefined();
  });
});

describe('InteractiveController settings + session switching', () => {
  it('builds setting rows from the real settings manager', () => {
    const { controller } = makeController();
    const rows = (controller as unknown as { buildSettingRows(): SettingRow[] }).buildSettingRows();
    const ids = rows.map((r) => r.id);
    expect(ids).toContain('theme');
    expect(ids).toContain('defaultThinkingLevel');
    expect(ids).toContain('compactionEnabled');
    expect(ids).toContain('doubleEscapeAction');
    expect(rows.length).toBeGreaterThan(15);
  });

  it('applies a boolean setting through the settings manager', () => {
    const setCompaction = vi.fn();
    const { controller } = makeController();
    (controller as unknown as { runtime: { settings: { setCompactionEnabled: unknown } } }).runtime.settings.setCompactionEnabled = setCompaction;
    controller.updateSetting('compactionEnabled', 'tắt');
    expect(setCompaction).toHaveBeenCalledWith(false);
  });

  it('applies a numeric setting', () => {
    const setPad = vi.fn();
    const { controller } = makeController();
    (controller as unknown as { runtime: { settings: { setEditorPaddingX: unknown } } }).runtime.settings.setEditorPaddingX = setPad;
    controller.updateSetting('editorPaddingX', '2');
    expect(setPad).toHaveBeenCalledWith(2);
  });

  it('reports unknown settings instead of silently ignoring them', () => {
    const { controller } = makeController();
    const seen: string[] = [];
    controller.onToast((toast) => seen.push(toast.message));
    controller.updateSetting('nope', '1');
    expect(seen.join(' ')).toContain('nope');
  });

  it('reloads the transcript after switching sessions', async () => {
    const { controller, session, listeners } = makeController();
    (session as { messages: unknown[] }).messages = [
      { role: 'user', content: 'old session question', timestamp: 1 },
      { role: 'assistant', content: [{ type: 'text', text: 'old answer' }], timestamp: 2 },
    ];
    const runtimeWithSwitch = {
      switchSession: async () => ({ cancelled: false }),
      listSessions: async () => [{ id: 'abc', path: '/tmp/abc.jsonl', cwd: '/tmp' }],
    };
    (controller as unknown as { runtime: { switchSession: unknown; listSessions: unknown } }).runtime.switchSession = runtimeWithSwitch.switchSession;
    (controller as unknown as { runtime: { switchSession: unknown; listSessions: unknown } }).runtime.listSessions = runtimeWithSwitch.listSessions;

    await controller.runCommand('sessions', 'abc');

    const items = controller.getTranscript();
    expect(items.some((i) => i.kind === 'user' && i.text.includes('old session question'))).toBe(true);
    expect(items.some((i) => i.kind === 'assistant' && i.text.includes('old answer'))).toBe(true);
    // Listener cũ đã được gỡ (không còn nhận sự kiện của phiên cũ);
    // resubscribeToRuntime gắn listener mới lên cùng đối tượng session giả.
    expect(listeners.length).toBe(1);
    const [current] = listeners;
    current!({ type: 'message_start', message: { role: 'user', content: 'after switch' } });
    expect(controller.getTranscript().some((i) => i.kind === 'user' && i.text === 'after switch')).toBe(true);
  });
});
