import { describe, it, expect } from 'vitest';
import { ProcessTerminal } from '../terminal.js';

describe('Terminal', () => {
  it('should be instantiable', () => {
    const term = new ProcessTerminal();
    expect(term).toBeDefined();
  });

  it('should have default properties', () => {
    const term = new ProcessTerminal();
    expect(term.columns).toBeGreaterThan(0);
    expect(term.rows).toBeGreaterThan(0);
    expect(term.kittyProtocolActive).toBe(false);
  });
});
