/**
 * Daxnuts Component (stub)
 * Easter egg component.
 *
 * Legacy reference: pi-tui-legacy/interactive/components/daxnuts.ts
 */

import type { UIElement, RenderContext } from './base';

export class DaxnutsComponent implements UIElement {
	draw(context: RenderContext): string[] {
		// Stub - original presumably shows a daxnut pattern or similar
		return ['  ***   *** ',
			' ***** ***** ',
			'**************',
			' ***** ***** ',
			'  ***   *** '];
	}

	clearCache(): void {
		// No cache
	}
}
