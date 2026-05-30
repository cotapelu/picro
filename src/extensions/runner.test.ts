// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExtensionRunner, createExtensionRuntime } from './runner.js';

describe('ExtensionRunner', () => {
  let runner: ExtensionRunner;

  beforeEach(() => {
    runner = new ExtensionRunner();
  });

  describe('createExtensionRuntime', () => {
    it('creates runtime with empty flagValues and pendingProviderRegistrations', () => {
      const runtime = createExtensionRuntime();
      expect(runtime.flagValues).toBeInstanceOf(Map);
      expect(runtime.flagValues.size).toBe(0);
      expect(runtime.pendingProviderRegistrations).toEqual([]);
    });
  });

  describe('ExtensionRunner', () => {
    it('registers and calls event handlers', async () => {
      const handler = vi.fn().mockResolvedValue('result');
      runner.on('test', handler);
      const result = await runner.emit({ type: 'test' });
      expect(handler).toHaveBeenCalledWith({ type: 'test' });
      expect(result).toBe('result');
    });

    it('returns undefined when no handlers', async () => {
      const result = await runner.emit({ type: 'nonexistent' });
      expect(result).toBeUndefined();
    });

    it('handles multiple handlers for same event type', async () => {
      const handler1 = vi.fn().mockResolvedValue('r1');
      const handler2 = vi.fn().mockResolvedValue('r2');
      runner.on('event', handler1);
      runner.on('event', handler2);
      const result = await runner.emit({ type: 'event' });
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      // Returns last handler result
      expect(result).toBe('r2');
    });

    it('catches and logs handler errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const goodHandler = vi.fn().mockResolvedValue('good');
      const badHandler = vi.fn().mockImplementation(() => { throw new Error('fail'); });

      runner.on('test', goodHandler);
      runner.on('test', badHandler);

      const result = await runner.emit({ type: 'test' });
      // Should still call good handler, error logged
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      // Return from last handler (which threw) is not returned? Actually catch inside emit swallows, so result is undefined after throw? Let's check: emit returns result of last handler if no throw, but if throw, result remains from previous? Implementation sets result each iteration; if throw, result not updated. So result from first handler remains.
      expect(result).toBe('good'); // because bad threw after good

      consoleSpy.mockRestore();
    });

    it('unsubscribes handlers', async () => {
      const handler = vi.fn();
      const unsubscribe = runner.on('test', handler);
      unsubscribe();
      await runner.emit({ type: 'test' });
      expect(handler).not.toHaveBeenCalled();
    });

    it('loadExtensions sets extensions and runtime', () => {
      const loadResult = {
        extensions: [{ name: 'ext1' } as any],
        errors: [],
        runtime: createExtensionRuntime(),
      };
      runner.loadExtensions(loadResult);
      expect(runner['extensions']).toHaveLength(1);
      expect(runner['runtime']).toBe(loadResult.runtime);
    });

    it('hasHandlers returns true/false correctly', () => {
      expect(runner.hasHandlers('none')).toBe(false);
      runner.on('test', () => {});
      expect(runner.hasHandlers('test')).toBe(true);
    });
  });
});
