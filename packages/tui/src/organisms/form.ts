/**
 * Form Component
 *
 * A simple vertical form layout with labels and input components.
 */

import type { UIElement, RenderContext } from '../atoms/base.js';
import { ElementContainer } from '../atoms/base.js';
import { Text } from '../atoms/text.js';

export interface FormField {
  /** Field label (displayed above input) */
  label: string;
  /** Input component (e.g., Input, SelectList) */
  component: UIElement;
}

export interface FormOptions {
  /** Array of fields */
  fields: FormField[];
}

/**
 * Form - arranges fields in a vertical stack with labels on top.
 */
export class Form extends ElementContainer {
  constructor(public options: FormOptions) {
    super();
    for (const field of options.fields) {
      // Add label
      this.append(new Text(field.label + ':'));
      // Add input component
      this.append(field.component);
    }
  }

  clearCache(): void {
    for (const child of this.children) {
      child.clearCache?.();
    }
  }
}
