/**
 * Compaction Summary Message Component (stub)
 * Displays summary after memory compaction.
 */

import type { UIElement, RenderContext } from './base';

export class CompactionSummaryMessageComponent implements UIElement {
	draw(context: RenderContext): string[] {
		return ['Compaction summary: stub'];
	}
	clearCache(): void {}
}
