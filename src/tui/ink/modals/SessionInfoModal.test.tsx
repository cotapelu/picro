import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { SessionInfoModal } from './SessionInfoModal';

vi.mock('../../../runtime.js', () => ({}));

describe('SessionInfoModal', () => {
  it('should render without crashing', () => {
    const runtime = { session: { messages: [] }, cwd: '/test' } as any;
    const onClose = vi.fn();
    const instance = render(<SessionInfoModal runtime={runtime} onClose={onClose} />);
    expect(instance.stdin).toBeDefined();
  });
});
