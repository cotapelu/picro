/** @jsxImportSource react */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetTimings, time, printTimings } from './timings.js';

describe('timings', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.PI_TIMING;
    // Ensure clean state
    if (originalEnv !== undefined) {
      process.env.PI_TIMING = originalEnv;
    } else {
      delete process.env.PI_TIMING;
    }
  });

  afterEach(() => {
    // Clean up module state between tests: reset timings to avoid bleed
    try {
      // Only reset if enabled, but safe to call always
      resetTimings();
    } catch {}
    // Restore env
    if (originalEnv !== undefined) {
      process.env.PI_TIMING = originalEnv;
    } else {
      delete process.env.PI_TIMING;
    }
  });

  describe('when PI_TIMING is not set to "1"', () => {
    beforeEach(() => {
      delete process.env.PI_TIMING;
    });

    it('resetTimings should be a no-op (no error)', () => {
      expect(() => resetTimings()).not.toThrow();
    });

    it('time should be a no-op (no error) and not record', () => {
      expect(() => time('test')).not.toThrow();
      // Should not have recorded any timings; printTimings should not output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      printTimings();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('printTimings should be a no-op', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => printTimings()).not.toThrow();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('when PI_TIMING is set to "1"', () => {
    beforeEach(() => {
      process.env.PI_TIMING = '1';
      // Reset timings before each test
      resetTimings();
    });

    it('resetTimings clears timings and resets lastTime without error', () => {
      expect(() => resetTimings()).not.toThrow();
      // After reset, timings should be empty; time() should start fresh
      time('first');
      // No assert on state, just test it works
    });

    it('time records timings', () => {
      expect(() => time('init')).not.toThrow();
      expect(() => time('step1')).not.toThrow();
      expect(() => time('step2')).not.toThrow();
    });

    it('printTimings prints header, entries, total, and footer', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      time('init');
      time('load config');
      time('connect');
      time('ready');

      printTimings();

      // Collect all messages
      const calls = consoleErrorSpy.mock.calls.map(call => call[0].trim());
      // We expect at least 7 lines: header, 4 entries, total, footer
      expect(calls.length).toBeGreaterThanOrEqual(7);
      // Header
      expect(calls[0]).toContain('Startup Timings');
      // Entries: should contain labels and 'ms' suffix
      const entryLines = calls.slice(1, 5);
      entryLines.forEach(line => {
        // The line should match pattern like "  init: 0ms" but we just check it contains 'ms' and the label
        expect(line).toMatch(/ms$/);
        expect(line).toMatch(/^.*:\s*\d+ms$/);
      });
      // Total line
      const totalLine = calls.find(line => line.startsWith('TOTAL:'));
      expect(totalLine).toBeDefined();
      // Footer
      expect(calls[calls.length - 1]).toContain('------------------------');

      consoleErrorSpy.mockRestore();
    });

    it('printTimings does nothing if no timings recorded', () => {
      // Ensure no timings: reset
      resetTimings();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      printTimings();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('resetTimings clears previously recorded timings', () => {
      time('a');
      time('b');
      // After reset, these should be gone
      resetTimings();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      printTimings();
      const calls = consoleErrorSpy.mock.calls.map(call => call[0].trim());
      // Should not contain 'a' or 'b' in any line
      const allText = calls.join(' ');
      expect(allText).not.toContain('a');
      expect(allText).not.toContain('b');
      consoleErrorSpy.mockRestore();
    });
  });
});
