import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { ConfirmationModal } from './ConfirmationModal';

describe('ConfirmationModal', () => {
  it('renders without crashing', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const instance = render(
      <ConfirmationModal
        title="Confirm"
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    expect(instance.stdin).toBeDefined();
  });
});
