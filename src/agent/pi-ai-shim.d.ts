// Type declarations for pi-ai shim
export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  total: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}

export function isContextOverflow(message: any, contextWindow: number): boolean;
