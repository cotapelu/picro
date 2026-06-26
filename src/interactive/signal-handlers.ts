// Signal handlers for graceful shutdown
// Backend logic - should be called from mode entry point

let cleanupSignalHandlers: (() => void) | null = null;

/**
 * Setup signal handlers for graceful shutdown
 */
export function setupSignalHandlers(runtime: any): () => void {
  const handleSignal = async (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    try {
      await runtime.dispose?.();
    } catch (err) {
      console.error('Error during shutdown:', err);
    }
    process.exit(0);
  };

  const onSigTerm = () => handleSignal('SIGTERM');
  const onSigHup = () => handleSignal('SIGHUP');

  process.on('SIGTERM', onSigTerm);
  process.on('SIGHUP', onSigHup);

  const onSigCont = () => {
    console.log('Resumed from suspend');
  };
  process.on('SIGCONT', onSigCont);

  cleanupSignalHandlers = () => {
    process.off('SIGTERM', onSigTerm);
    process.off('SIGHUP', onSigHup);
    process.off('SIGCONT', onSigCont);
  };

  return cleanupSignalHandlers;
}

/**
 * Remove signal handlers (call on cleanup)
 */
export function removeSignalHandlers(): void {
  if (cleanupSignalHandlers) {
    cleanupSignalHandlers();
    cleanupSignalHandlers = null;
  }
}
