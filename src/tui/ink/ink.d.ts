// Minimal declarations for ink to avoid type errors
declare module 'ink' {
  import * as React from 'react';
  export function render(element: React.ReactElement): { waitUntilExit: () => Promise<void> };
  export const Box: React.ComponentType<any>;
  export const Text: React.ComponentType<any>;
  export const useInput: (handler: (input: string, key: any) => void) => void;
  export const useStdin: () => any;
  export const useStdout: () => any;
  export const useApp: () => any;
  export const Stdout: React.ComponentType<any>;
}
