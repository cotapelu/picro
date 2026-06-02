/** @jsxImportSource react */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { Modal } from './Modal';
import { ThemeProvider } from '../hooks/useTheme.js';

function renderModal() {
  return render(
    <ThemeProvider initialMode="dark">
      <Modal onClose={() => {}}>
        <Text>Hello World</Text>
      </Modal>
    </ThemeProvider>
  );
}

describe('Modal', () => {
  it('renders without crashing', () => {
    const result = renderModal();
    // Ensure render succeeded
    expect(result.stdin).toBeDefined();
  });
});
