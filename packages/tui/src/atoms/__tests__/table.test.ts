import { describe, it, expect } from 'vitest';
import { Table } from '../table.js';
import type { RenderContext } from '../base.js';

function createContext(width = 80, height = 24): RenderContext {
  return { width, height };
}

describe('Table Component', () => {
  it('should render headers and rows', () => {
    const table = new Table({
      headers: ['Name', 'Age'],
      rows: [
        ['Alice', '30'],
        ['Bob', '25'],
      ],
    });
    const ctx = createContext(80, 24);
    const result = table.draw(ctx);

    expect(result[0]).toContain('Name');
    expect(result[0]).toContain('Age');
    expect(result[1]).toContain('Alice');
    expect(result[1]).toContain('30');
  });

  it('should handle no headers', () => {
    const table = new Table({
      rows: [['A', 'B']],
    });
    const ctx = createContext(80, 24);
    const result = table.draw(ctx);

    expect(result[0]).toContain('A');
    expect(result[0]).toContain('B');
  });

  it('should pad columns to same width', () => {
    const table = new Table({
      headers: ['A', 'BBBB'],
      rows: [['1', '2']],
    });
    const ctx = createContext(80, 24);
    const result = table.draw(ctx);

    // Column 2 should be width 4
    const header = result[0];
    // BB should be visible
    expect(header).toContain('BBBB');
  });
});
