import { vi } from 'vitest';

// Mock arabic-reshaper - it's optional and only used for Arabic text shaping
vi.mock('arabic-reshaper', () => ({
  default: {
    reshape: (text: string) => text,
  },
}));

// Mock any other problematic modules if needed
