/** @jsxImportSource react */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitForChildProcess } from './child-process.js';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';

// Helper to create a mock ChildProcess
function createMockChild(options: {
  stdout?: EventEmitter | null;
  stderr?: EventEmitter | null;
  autoDestroy?: boolean;
} = {}): any {
  const child = new EventEmitter();

  // Default to PassThrough streams for stdout/stderr if not provided
  child.stdout = options.stdout !== undefined ? options.stdout : new PassThrough();
  child.stderr = options.stderr !== undefined ? options.stderr : new PassThrough();

  // Track destroyed
  child._stdoutDestroyed = false;
  child._stderrDestroyed = false;

  // Wrap destroy to track calls only if streams exist
  if (child.stdout) {
    const originalStdoutDestroy = child.stdout.destroy;
    child.stdout.destroy = (...args: any[]) => {
      child._stdoutDestroyed = true;
      if (originalStdoutDestroy) return originalStdoutDestroy.apply(child.stdout, args);
    };
  }

  if (child.stderr) {
    const originalStderrDestroy = child.stderr.destroy;
    child.stderr.destroy = (...args: any[]) => {
      child._stderrDestroyed = true;
      if (originalStderrDestroy) return originalStderrDestroy.apply(child.stderr, args);
    };
  }

  // child.on, child.once, child.removeListener are already from EventEmitter
  // Ensure removeListener works as expected (will be called by cleanup)
  return child;
}

describe('waitForChildProcess', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basics', () => {
    it('resolves with exit code when child exits and both streams end', async () => {
      const child = createMockChild();

      const promise = waitForChildProcess(child);

      // Emit exit event
      child.emit('exit', 0);

      // Streams end
      child.stdout.emit('end');
      child.stderr.emit('end');

      const exitCode = await promise;
      expect(exitCode).toBe(0);
    });

    it('resolves with exit code via close event', async () => {
      const child = createMockChild();

      const promise = waitForChildProcess(child);

      // Emit close (simulating process fully closed)
      child.emit('close', 1);

      const exitCode = await promise;
      expect(exitCode).toBe(1);
    });

    it('rejects on error event', async () => {
      const child = createMockChild();

      const promise = waitForChildProcess(child);

      const err = new Error('child process error');
      child.emit('error', err);

      await expect(promise).rejects.toThrow('child process error');
    });

    it('handles null stdout and stderr (no streams) and resolves on exit', async () => {
      const child = createMockChild({ stdout: null, stderr: null });

      const promise = waitForChildProcess(child);

      child.emit('exit', 2);

      const exitCode = await promise;
      expect(exitCode).toBe(2);
    });

    it('resolves with null exit code if exit code is null', async () => {
      const child = createMockChild();

      const promise = waitForChildProcess(child);

      child.emit('exit', null);
      child.stdout.emit('end');
      child.stderr.emit('end');

      const exitCode = await promise;
      expect(exitCode).toBeNull();
    });

    it('destroys stdout and stderr on finalize', async () => {
      const child = createMockChild();

      const promise = waitForChildProcess(child);

      child.emit('exit', 0);
      child.stdout.emit('end');
      child.stderr.emit('end');

      await promise;

      expect(child._stdoutDestroyed).toBe(true);
      expect(child._stderrDestroyed).toBe(true);
    });
  });

  describe('timer fallback', () => {
    it('finalizes after grace period if streams never end', async () => {
      const child = createMockChild();

      const promise = waitForChildProcess(child);

      // Emit exit but do not emit 'end' on streams
      child.emit('exit', 3);

      // Fast-forward time past the grace period (100ms)
      vi.runAllTimers();

      const exitCode = await promise;
      expect(exitCode).toBe(3);
    });

    it('does not finalize twice if close arrives after timer', async () => {
      const child = createMockChild();

      const promise = waitForChildProcess(child);

      child.emit('exit', 4);

      // Advance timers to trigger timer finalize
      vi.advanceTimersByTime(100);

      // After promise resolves, emit close to try double finalize
      child.emit('close', 5); // should be ignored

      const exitCode = await promise;
      expect(exitCode).toBe(4); // should be exit code from timer, not close
    });

    it('timer is cleared if finalize occurs before timer fires', async () => {
      const child = createMockChild();

      const promise = waitForChildProcess(child);

      child.emit('exit', 6);
      // End streams quickly
      child.stdout.emit('end');
      child.stderr.emit('end');

      // No need to tick; promise should resolve immediately because streams ended
      const exitCode = await promise;
      expect(exitCode).toBe(6);
      // The timer set in onExit should have been cleared in finalize's cleanup
    });
  });

  describe('event listener cleanup', () => {
    it('removes listeners on finalize', async () => {
      const child = createMockChild();

      // Spy on removeListener for child and for streams
      const childRemoveSpy = vi.spyOn(child, 'removeListener');
      const stdoutRemoveSpy = vi.spyOn(child.stdout, 'removeListener');
      const stderrRemoveSpy = vi.spyOn(child.stderr, 'removeListener');

      const promise = waitForChildProcess(child);

      child.emit('exit', 0);
      child.stdout.emit('end');
      child.stderr.emit('end');

      await promise;

      // Expect child.removeListener called for 'error', 'exit', 'close'
      expect(childRemoveSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(childRemoveSpy).toHaveBeenCalledWith('exit', expect.any(Function));
      expect(childRemoveSpy).toHaveBeenCalledWith('close', expect.any(Function));

      // Expect streams' removeListener called for 'end'
      expect(stdoutRemoveSpy).toHaveBeenCalledWith('end', expect.any(Function));
      expect(stderrRemoveSpy).toHaveBeenCalledWith('end', expect.any(Function));
    });
  });

  describe('exactly-once resolution', () => {
    it('does not resolve twice if both exit and close fire', async () => {
      const child = createMockChild();

      const promise = waitForChildProcess(child);

      // Emit exit, then close quickly before timer fires
      child.emit('exit', 7);
      child.emit('close', 8);

      const exitCode = await promise;
      // Since streams did not end, exit sets timer; close fires first (synchronously after exit) and finalizes with its code.
      // The resolved code should be from close (8) because it finalizes before timer.
      expect(exitCode).toBe(8);
    });
  });
});
