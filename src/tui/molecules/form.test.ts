// SPDX-License-Identifier: Apache-2.0
/**
 * Tests for Form molecule component
 */

import { describe, it, expect } from 'vitest';
import { Form } from './form';
import { Input } from './input';
import type { RenderContext } from '../atoms/base';

const defaultContext: RenderContext = {
  width: 80,
  height: 24,
  theme: {},
};

describe('Form', () => {
  it('should create form with fields', () => {
    const form = new Form({
      fields: [
        { label: 'Name', component: new Input({}) },
        { label: 'Email', component: new Input({}) },
      ],
    });
    expect(form).toBeInstanceOf(Form);
    expect(form.children.length).toBe(4); // 2 labels + 2 inputs
  });

  it('should render labels with colon', () => {
    const form = new Form({
      fields: [{ label: 'Username', component: new Input({}) }],
    });
    const result = form.draw(defaultContext);
    expect(result.some(line => line.includes('Username:'))).toBe(true);
  });

  it('should include input components', () => {
    const input = new Input({ value: 'test' });
    const form = new Form({
      fields: [{ label: 'Field', component: input }],
    });
    const result = form.draw(defaultContext);
    expect(result.some(line => line.includes('test'))).toBe(true);
  });

  it('should handle empty fields array', () => {
    const form = new Form({ fields: [] });
    expect(form.children.length).toBe(0);
  });

  it('should clear cache on all children', () => {
    const input = new Input({});
    const form = new Form({ fields: [{ label: 'A', component: input }] });
    form.clearCache();
    // No exception
  });
});