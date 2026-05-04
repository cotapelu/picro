import { describe, it, expect, vi } from 'vitest';
import { ModelSelector, ModelOption } from '../model-selector';
import type { RenderContext, KeyEvent } from '../base';

const ctx = (w = 80, h = 24): RenderContext => ({ width: w, height: h });
const k = (key: string): KeyEvent => ({ key, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, preventDefault: vi.fn(), stopPropagation: vi.fn() });

describe('ModelSelector', () => {
  const models: ModelOption[] = [
    { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
    { id: 'claude-3', name: 'Claude 3', provider: 'anthropic' },
  ];

  it('should create selector', () => {
    expect(new ModelSelector(models, 10)).toBeDefined();
  });

  it('should render models', () => {
    const lines = new ModelSelector(models, 10).draw(ctx());
    expect(lines.length).toBeGreaterThan(0);
  });

  it('should fit width', () => {
    const lines = new ModelSelector(models, 10).draw(ctx(30, 24));
    for (const line of lines) {
      expect(line.replace(/\x1b\[[0-9;]*m/g, '').length).toBeLessThanOrEqual(30);
    }
  });
});