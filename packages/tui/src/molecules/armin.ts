/**
 * Armin Component (stub)
 * Easter egg component.
 *
 * Legacy reference: pi-tui-legacy/interactive/components/armin.ts
 */

import type { UIElement, RenderContext } from '../atoms/base.js';

export class ArminComponent implements UIElement {
	draw(context: RenderContext): string[] {
		// Stub implementation - original presumably shows a horse or something
		return ['     ,//,',
			'    // //',
			'   // //',
			'  // //',
			' // //',
			'//_//___...---..___'];
	}

	clearCache(): void {
		// No cache to clear
	}
}
