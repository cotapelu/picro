// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import { EventRecorder } from './event-recorder.js';
import type { AgentEvent } from './events.js';

// Helper to create a simple event
function createEvent(type: string, overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    type,
    timestamp: Date.now(),
    round: 0,
    ...overrides,
  } as AgentEvent;
}

describe('EventRecorder', () => {
  let writeSpy: any;
  let readSpy: any;

  beforeEach(() => {
    writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation((path, enc) => {
      if (path === '/tmp/in.json') {
        return JSON.stringify([{ type: 'a', timestamp: 1, round: 0 }, { type: 'b', timestamp: 2, round: 0 }]);
      }
      return '';
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    writeSpy.mockRestore();
    readSpy.mockRestore();
  });

  describe('construction', () => {
    it('creates with default options', () => {
      const recorder = new EventRecorder();
      expect(recorder.count).toBe(0);
    });

    it('respects maxEvents option', () => {
      const recorder = new EventRecorder({ maxEvents: 2 });
      recorder.record(createEvent('a'));
      recorder.record(createEvent('b'));
      recorder.record(createEvent('c'));
      expect(recorder.count).toBe(2);
      const events = recorder.getEvents();
      expect(events.map(e => e.type)).toEqual(['b', 'c']);
    });

    it('supports unlimited events when maxEvents=0', () => {
      const recorder = new EventRecorder({ maxEvents: 0 });
      for (let i = 0; i < 100; i++) {
        recorder.record(createEvent(`e${i}`));
      }
      expect(recorder.count).toBe(100);
    });

    it('respects filterTypes to only record certain event types', () => {
      const recorder = new EventRecorder({ filterTypes: ['agent:start', 'error'] });
      recorder.record(createEvent('agent:start'));
      recorder.record(createEvent('tool:call:start'));
      recorder.record(createEvent('error', { message: 'oops' }));
      expect(recorder.count).toBe(2);
      const types = recorder.getEvents().map(e => e.type);
      expect(types).toEqual(['agent:start', 'error']);
    });
  });

  describe('record', () => {
    it('adds event to internal list', () => {
      const recorder = new EventRecorder();
      const ev = createEvent('test');
      recorder.record(ev);
      expect(recorder.count).toBe(1);
      expect(recorder.getEvents()[0]).toEqual(ev);
    });

    it('makes a copy of recorded event in getEvents', () => {
      const recorder = new EventRecorder();
      const ev = createEvent('test', { round: 5 });
      recorder.record(ev);
      const copy = recorder.getEvents();
      copy[0].round = 99;
      // Original should be unchanged
      expect(recorder.getEvents()[0].round).toBe(5);
    });

    it('calls _persistIfNeeded when persistPath set in constructor', () => {
      const recorder = new EventRecorder({ persistPath: '/tmp/recording.json' });
      recorder.record(createEvent('a'));
      // _persistIfNeeded called, which calls save (and thus writeFileSync)
      expect(writeSpy).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('removes all recorded events', () => {
      const recorder = new EventRecorder();
      recorder.record(createEvent('1'));
      recorder.record(createEvent('2'));
      recorder.clear();
      expect(recorder.count).toBe(0);
    });
  });

  describe('replay', () => {
    it('replays events to target emitter in order', async () => {
      const recorder = new EventRecorder();
      const ev1 = createEvent('type1');
      const ev2 = createEvent('type2');
      recorder.record(ev1);
      recorder.record(ev2);

      const target = { emit: vi.fn() };
      await recorder.replay(target);

      expect(target.emit).toHaveBeenCalledTimes(2);
      expect(target.emit).toHaveBeenNthCalledWith(1, ev1);
      expect(target.emit).toHaveBeenNthCalledWith(2, ev2);
    });

    it('respects speed delay', async () => {
      const recorder = new EventRecorder();
      recorder.record(createEvent('a'));
      recorder.record(createEvent('b'));

      const target = { emit: vi.fn() };
      const start = Date.now();
      await recorder.replay(target, 50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });
  });

  describe('save and load', () => {
    it('saves events to specified path', () => {
      const recorder = new EventRecorder();
      recorder.record(createEvent('x', { round: 1 }));
      recorder.save('/tmp/out.json');
      expect(writeSpy).toHaveBeenCalledWith(
        '/tmp/out.json',
        expect.any(String)
      );
      const savedArg = writeSpy.mock.calls[0][1];
      const parsed = JSON.parse(savedArg);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].type).toBe('x');
      expect(parsed[0].round).toBe(1);
    });

    it('loads events from file', () => {
      const recorder = EventRecorder.load('/tmp/in.json');
      expect(recorder.count).toBe(2);
      expect(recorder.getEvents().map(e => e.type)).toEqual(['a', 'b']);
    });

    it('handles load errors gracefully', () => {
      readSpy.mockImplementation((path) => {
        if (path === '/bad/path') throw new Error('read fail');
        return '';
      });
      const recorder = EventRecorder.load('/bad/path');
      expect(recorder.count).toBe(0);
    });
  });
});
