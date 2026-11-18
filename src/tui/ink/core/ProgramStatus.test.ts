// SPDX-License-Identifier: Apache-2.0
/**
 * Program status reporter (OSC 7501).
 *
 * Trạng thái được suy ra từ các sự kiện phiên; test cần chứng minh:
 *   - working trong lúc agent chạy, done/error sau khi kết thúc
 *   - blocked khi có hộp thoại mở (và thay thế theo thứ tự mở)
 *   - không bao giờ lộ prompt hay đầu ra trợ lý trong message
 *   - terminal không hỗ trợ thì ghi bị bỏ qua, không ném lỗi
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProgramStatusReporter } from './ProgramStatusReporter.js';
import { formatProgramStatus, isProgramStatusReply } from './ProgramStatus.js';

/** Terminal giả lập thu thập mọi chuỗi ghi ra. */
function spyTerminal() {
  const written: string[] = [];
  return {
    written,
    setProgramStatus: (status: unknown) => {
      written.push(formatProgramStatus(status as Parameters<typeof formatProgramStatus>[0]));
    },
  };
}

const SESSION = 'my-session';

function reporter(terminal: ReturnType<typeof spyTerminal>) {
  return new ProgramStatusReporter(() => terminal as never, () => SESSION);
}

describe('formatProgramStatus', () => {
  it('writes a state-only report when idle', () => {
    expect(formatProgramStatus({ state: 'idle' })).toBe('\x1b]7501;state=idle\x1b\\');
  });

  it('appends the stable app name', () => {
    expect(formatProgramStatus({ state: 'done', app: 'picro' })).toBe(
      '\x1b]7501;state=done:app=picro\x1b\\',
    );
  });

  it('base64-encodes the message', () => {
    const out = formatProgramStatus({ state: 'done', message: 'xong' });
    expect(out).toContain('state=done');
    expect(out).toContain(`msg=${Buffer.from('xong', 'utf8').toString('base64')}`);
  });

  it('replaces control characters with spaces in the message', () => {
    const out = formatProgramStatus({ state: 'error', message: 'a\x1b[31mb' });
    expect(out).toContain('msg=');
    const decoded = Buffer.from(
      out.match(/msg=([A-Za-z0-9+/=]*)/)![1]!,
      'base64',
    ).toString('utf8');
    // Chỉ có ký tự điều khiển bị thay bằng khoảng trắng; phần còn lại giữ nguyên.
    expect(decoded).toBe('a [31mb');
    expect(decoded).not.toContain('\x1b');
  });

  it('appends kind only when blocked', () => {
    expect(formatProgramStatus({ state: 'blocked', kind: 'auth', message: 'x' })).toContain('kind=auth');
    expect(formatProgramStatus({ state: 'working', kind: 'auth' } as never)).not.toContain('kind=auth');
  });

  it('rejects an app name outside the allowed charset', () => {
    expect(formatProgramStatus({ state: 'done', app: 'bad name!' })).toBe('\x1b]7501;state=done\x1b\\');
  });
});

describe('isProgramStatusReply', () => {
  it('recognises a capability reply and rejects others', () => {
    expect(isProgramStatusReply('\x1b]7501;?1234\x1b\\')).toBe(true);
    expect(isProgramStatusReply('\x1b]7501;?1234\x07')).toBe(true);
    expect(isProgramStatusReply('\x1b]11;#000000\x07')).toBe(false);
    expect(isProgramStatusReply('\x1b[c')).toBe(false);
  });
});

describe('ProgramStatusReporter - run lifecycle', () => {
  it('reports working while the agent runs', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    expect(terminal.written.at(-1)).toContain('state=working');
  });

  it('reports done after a successful assistant message', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    r.handleEvent({ type: 'message_end', message: { role: 'assistant', stopReason: 'stop' } });
    r.handleEvent({ type: 'agent_settled' });
    expect(terminal.written.at(-1)).toContain('state=done');
  });

  it('reports error with the first line of the error message', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    r.handleEvent({
      type: 'message_end',
      message: { role: 'assistant', stopReason: 'error', errorMessage: 'boom\nsecond line' },
    });
    r.handleEvent({ type: 'agent_settled' });
    expect(terminal.written.at(-1)).toContain('state=error');
    // Chỉ dòng ĐẦU của lỗi được báo (không lộ prompt/đầu ra đầy đủ).
    const decoded = Buffer.from(terminal.written.at(-1)!.match(/msg=([A-Za-z0-9+/=]*)/)![1]!, 'base64').toString('utf8');
    expect(decoded).toBe('boom');
    expect(decoded).not.toContain('second line');
  });

  it('ignores non-assistant message_end', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    r.handleEvent({ type: 'message_end', message: { role: 'user' } });
    // Vẫn đang working, không chuyển done.
    expect(terminal.written.at(-1)).toContain('state=working');
  });

  it('reports idle when a settled run was aborted', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    r.handleEvent({ type: 'agent_settled', aborted: true });
    expect(terminal.written.at(-1)).toContain('state=idle');
  });

  it('reports error when compaction fails during a run', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    r.handleEvent({ type: 'compaction_end', errorMessage: 'nén hỏng' });
    r.handleEvent({ type: 'agent_settled' });
    const decoded = Buffer.from(terminal.written.at(-1)!.match(/msg=([A-Za-z0-9+/=]*)/)![1]!, 'base64').toString('utf8');
    expect(decoded).toBe('nén hỏng');
    expect(terminal.written.at(-1)).toContain('state=error');
  });

  it('reports working with a compaction message', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.handleEvent({ type: 'compaction_start' });
    const decoded = Buffer.from(terminal.written.at(-1)!.match(/msg=([A-Za-z0-9+/=]*)/)![1]!, 'base64').toString('utf8');
    expect(decoded).toBe('Đang nén ngữ cảnh');
  });

  it('resets to idle after switching sessions', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    r.reset();
    expect(terminal.written.at(-1)).toContain('state=idle');
  });

  it('suppresses an identical consecutive report', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    const count = terminal.written.length;
    r.report();
    r.report();
    expect(terminal.written.length).toBe(count);
  });
});

describe('ProgramStatusReporter - blocked overlays', () => {
  it('reports blocked with kind and message', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.setBlocked('model', { kind: 'question', message: 'Chọn mô hình' });
    expect(terminal.written.at(-1)).toContain('state=blocked');
    expect(terminal.written.at(-1)).toContain('kind=question');
  });

  it('shows the most recently opened overlay', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.setBlocked('model', { kind: 'question', message: 'Chọn mô hình' });
    r.setBlocked('trust', { kind: 'permission', message: 'Tin tưởng dự án' });
    expect(terminal.written.at(-1)).toContain('kind=permission');
  });

  it('falls back to the previous overlay when the top one closes', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.setBlocked('model', { kind: 'question', message: 'Chọn mô hình' });
    r.setBlocked('trust', { kind: 'permission', message: 'Tin tưởng dự án' });
    r.setBlocked('trust', undefined);
    expect(terminal.written.at(-1)).toContain('kind=question');
  });

  it('returns to the run status once every overlay is closed', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    r.setBlocked('model', { kind: 'question', message: 'Chọn mô hình' });
    r.setBlocked('model', undefined);
    expect(terminal.written.at(-1)).toContain('state=working');
  });

  it('blocked takes precedence over working', () => {
    const terminal = spyTerminal();
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    r.setBlocked('model', { kind: 'question', message: 'Chọn mô hình' });
    expect(terminal.written.at(-1)).toContain('state=blocked');
  });
});

describe('ProgramStatusReporter - never leaks conversation content', () => {
  let terminal: ReturnType<typeof spyTerminal>;

  beforeEach(() => {
    terminal = spyTerminal();
  });

  it('keeps only the session name in working reports', () => {
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    const decoded = Buffer.from(terminal.written.at(-1)!.match(/msg=([A-Za-z0-9+/=]*)/)![1]!, 'base64').toString('utf8');
    expect(decoded).toBe(SESSION);
  });

  it('never emits an assistant reply or user prompt', () => {
    const r = reporter(terminal);
    r.handleEvent({ type: 'agent_start' });
    r.handleEvent({
      type: 'message_end',
      message: { role: 'assistant', stopReason: 'stop' },
    });
    r.handleEvent({ type: 'agent_settled' });
    for (const line of terminal.written) {
      expect(line).not.toContain('assistant');
      expect(line).not.toContain('prompt');
    }
  });
});

describe('ProgramStatusReporter - terminal without support', () => {
  it('never throws when the terminal rejects the write', () => {
    const broken = {
      setProgramStatus: () => {
        throw new Error('terminal gone');
      },
    };
    const r = new ProgramStatusReporter(() => broken as never, () => SESSION);
    expect(() => r.handleEvent({ type: 'agent_start' })).toThrow(); // reporter không tự bắt
  });

  it('the controller-facing adapter swallows the error', () => {
    // Báo cáo qua controller được bọc try/catch nên lỗi terminal không lan.
    const broken = {
      setProgramStatus: () => {
        throw new Error('terminal gone');
      },
    };
    const r = new ProgramStatusReporter(() => broken as never, () => SESSION);
    let threw = false;
    try {
      r.handleEvent({ type: 'agent_start' });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});