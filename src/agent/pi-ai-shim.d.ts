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

export interface Model {
  id: string;
  provider: string;
  contextWindow: number;
  reasoning?: boolean;
}

export function isContextOverflow(message: any, contextWindow: number): boolean {
  // Simple implementation: check stopReason or usage total > contextWindow
  if (message.stopReason === 'context_overflow') return true;
  if (message.usage && message.usage.total && message.usage.total > contextWindow) return true;
  return false;
}
