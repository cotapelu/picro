/**
 * Branch Summary Message Component (stub)
 * Displays a summary of branch-related information.
 */

import type { UIElement, RenderContext } from './base.js';

export class BranchSummaryMessageComponent implements UIElement {
	draw(context: RenderContext): string[] {
		return ['Branch summary: stub'];
	}
	clearCache(): void {}
}
