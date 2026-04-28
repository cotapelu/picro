import { describe, it, expect } from 'vitest';
import { ChatInterface } from '../src/interactive-mode.js';
import { Text } from '../src/components/text.js';

// Minimal mock TUI with required methods
const createMockTUI = () => ({
  append: () => {},
  requestRender: () => {},
  setFocus: () => {},
});

describe('ChatInterface Widgets', () => {
  it('should render widget set via setWidget', () => {
    const tui = createMockTUI() as any;
    const chat = new ChatInterface(tui, 'You: ', () => {});
    chat.setWidget('w1', new Text('Widget content'));

    // Draw with enough height
    const lines = chat.draw({ width: 40, height: 6 });
    const output = lines.join('\n');
    expect(output).toContain('Widget content');
  });

  it('should remove widget when setWidget(null)', () => {
    const tui = createMockTUI() as any;
    const chat = new ChatInterface(tui, 'You: ', () => {});

    chat.setWidget('w1', new Text('Hello'));
    chat.setWidget('w1', null);

    const lines = chat.draw({ width: 40, height: 6 });
    expect(lines.join('\n')).not.toContain('Hello');
  });

  it('should render multiple widgets if they fit', () => {
    const tui = createMockTUI() as any;
    const chat = new ChatInterface(tui, 'You: ', () => {});
    chat.setWidget('w1', new Text('First'));
    chat.setWidget('w2', new Text('Second'));

    const lines = chat.draw({ width: 40, height: 10 });
    const output = lines.join('\n');
    expect(output).toContain('First');
    expect(output).toContain('Second');
  });

  it('should truncate widgets if more than max height (3)', () => {
    const tui = createMockTUI() as any;
    const chat = new ChatInterface(tui, 'You: ', () => {});
    // Add 5 widgets, each one line
    for (let i = 0; i < 5; i++) {
      chat.setWidget(`w${i}`, new Text(`Widget ${i}`));
    }

    const lines = chat.draw({ width: 40, height: 10 });
    const output = lines.join('\n');
    // Only top 3 widgets should be rendered (maxWidgetHeight)
    expect(output).toContain('Widget 0');
    expect(output).toContain('Widget 1');
    expect(output).toContain('Widget 2');
    // Widget 3 and 4 should be truncated
    expect(output).not.toContain('Widget 3');
    expect(output).not.toContain('Widget 4');
  });
});
