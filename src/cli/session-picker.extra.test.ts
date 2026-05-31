import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock node:readline's createInterface before module import
vi.mock('node:readline', () => ({
  createInterface: vi.fn(),
}));

import { selectSession } from './session-picker.js';

function fakeInterfaceFactory(answer: string) {
  return {
    question: (_prompt: string, cb: (answer: string) => void) => {
      setImmediate(() => cb(answer));
    },
    close: vi.fn(),
  };
}

describe('selectSession (extra)', () => {
  let createInterfaceMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { createInterface } = require('node:readline');
    createInterfaceMock = createInterface as any;
  });

  it('returns null when no sessions', async () => {
    createInterfaceMock.mockReturnValue(fakeInterfaceFactory('0'));
    const result = await selectSession(() => Promise.resolve([]));
    expect(result).toBeNull();
  });

  it('returns selected session path for valid input', async () => {
    const sessions = [{ id: 's1', path: '/proj/s1' }];
    createInterfaceMock.mockReturnValue(fakeInterfaceFactory('1'));
    const result = await selectSession(() => Promise.resolve(sessions));
    expect(result).toBe('/proj/s1');
  });

  it('returns null for cancel input 0', async () => {
    createInterfaceMock.mockReturnValue(fakeInterfaceFactory('0'));
    const result = await selectSession(() => Promise.resolve([{ id: 's1', path: '/p' }]));
    expect(result).toBeNull();
  });

  it('returns null for invalid numeric input', async () => {
    createInterfaceMock.mockReturnValue(fakeInterfaceFactory('99'));
    const result = await selectSession(() => Promise.resolve([{ id: 's1', path: '/p' }]));
    expect(result).toBeNull();
  });
});
