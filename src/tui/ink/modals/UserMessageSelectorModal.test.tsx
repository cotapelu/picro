import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { UserMessageSelectorModal } from './UserMessageSelectorModal';

vi.mock('../../../runtime.js', () => ({}));

describe('UserMessageSelectorModal', () => {
  it('should render without crashing', () => {
    const runtime = { session: { sessionManager: { getEntries: () => [] } } } as any;
    const onClose = vi.fn();
    const instance = render(<UserMessageSelectorModal runtime={runtime} onClose={onClose} />);
    expect(instance.stdin).toBeDefined();
  });
});
