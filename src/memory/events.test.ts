// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryEventLog } from './events.js';

describe('MemoryEventLog', () => {
  let log: MemoryEventLog;

  beforeEach(() => {
    log = new MemoryEventLog();
  });

  describe('log()', () => {
    it('should record save event', () => {
      log.log('SAVE', 'mem1', 'content data');
      const events = log.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].action).toBe('SAVE');
      expect(events[0].memoryId).toBe('mem1');
      expect(events[0].content).toBe('content data');
    });

    it('should record retrieve event with query', () => {
      log.log('RETRIEVE', 'mem2', undefined, 'search query');
      const events = log.getEvents();
      expect(events[0].action).toBe('RETRIEVE');
      expect(events[0].query).toBe('search query');
    });

    it('should record update event with before and after hash', () => {
      log.log('UPDATE', 'mem3', undefined, undefined, 'oldhash', 'newhash');
      const events = log.getEvents();
      expect(events[0].action).toBe('UPDATE');
      expect(events[0].beforeHash).toBe('oldhash');
      expect(events[0].afterHash).toBe('newhash');
    });

    it('should record delete event', () => {
      log.log('DELETE', 'mem4');
      const events = log.getEvents();
      expect(events[0].action).toBe('DELETE');
      expect(events[0].memoryId).toBe('mem4');
    });

    it('should include timestamp for each event', () => {
      const before = Date.now();
      log.log('SAVE', 'mem1', 'content');
      const after = Date.now();
      const ts = log.getEvents()[0].timestamp;
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe('getByAction()', () => {
    it('should filter events by action type', () => {
      log.log('SAVE', 'm1', 'c1');
      log.log('RETRIEVE', 'm2', 'c2', 'q');
      log.log('SAVE', 'm3', 'c3');
      log.log('DELETE', 'm4');

      const saves = log.getByAction('SAVE');
      expect(saves.length).toBe(2);
      expect(saves.every(e => e.action === 'SAVE')).toBe(true);

      const retrieves = log.getByAction('RETRIEVE');
      expect(retrieves.length).toBe(1);
    });
  });

  describe('getByMemoryId()', () => {
    it('should return events for specific memory', () => {
      log.log('SAVE', 'mem1', 'c1');
      log.log('UPDATE', 'mem1', 'c2', undefined, 'h1', 'h2');
      log.log('RETRIEVE', 'mem1', undefined, 'query');
      log.log('DELETE', 'mem2');

      const mem1Events = log.getByMemoryId('mem1');
      expect(mem1Events.length).toBe(3);
      expect(mem1Events.every(e => e.memoryId === 'mem1')).toBe(true);
    });
  });

  describe('getRecent()', () => {
    it('should return most recent events', () => {
      for (let i = 0; i < 5; i++) {
        log.log('SAVE', `mem${i}`, `content${i}`);
      }

      const recent2 = log.getRecent(2);
      expect(recent2.length).toBe(2);
      expect(recent2[0].memoryId).toBe('mem3'); // actually chronological; last added = most recent
      expect(recent2[1].memoryId).toBe('mem4');
    });

    it('should return all if limit exceeds count', () => {
      log.log('SAVE', 'm1', 'c1');
      const all = log.getRecent(10);
      expect(all.length).toBe(1);
    });
  });

  describe('replay()', () => {
    it('should return verified true with no errors for empty log', () => {
      const result = log.replay();
      expect(result.verified).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should verify hash consistency across operations (placeholder)', () => {
      log.log('SAVE', 'm1', 'c1', undefined, undefined, 'hash1');
      log.log('UPDATE', 'm1', 'c2', undefined, 'hash1', 'hash2');
      const result = log.replay();
      expect(result.verified).toBe(true);
    });
  });

  describe('clear()', () => {
    it('should remove all events', () => {
      log.log('SAVE', 'm1', 'c1');
      log.log('SAVE', 'm2', 'c2');
      expect(log.count()).toBe(2);

      log.clear();
      expect(log.count()).toBe(0);
      expect(log.getEvents()).toEqual([]);
    });
  });

  describe('count()', () => {
    it('should return number of events', () => {
      expect(log.count()).toBe(0);
      log.log('SAVE', 'm1', 'c1');
      expect(log.count()).toBe(1);
      log.log('DELETE', 'm2');
      expect(log.count()).toBe(2);
    });
  });
});
