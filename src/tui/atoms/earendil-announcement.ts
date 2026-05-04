/**
 * Earendil Announcement Component (stub)
 * Shows an announcement about pi joining Earendil.
 *
 * Legacy reference: pi-tui-legacy/interactive/components/earendil-announcement.ts
 */

import type { UIElement, RenderContext } from './base';

export class EarendilAnnouncementComponent implements UIElement {
	draw(context: RenderContext): string[] {
		const width = Math.max(10, context.width - 4);
		const lines: string[] = [];
		lines.push('┌' + '─'.repeat(width) + '┐');
		lines.push('│ ' + 'pi has joined Earendil'.padEnd(width - 2) + ' │');
		lines.push('│ ' + 'Read the blog post:'.padEnd(width - 2) + ' │');
		const url = 'https://mariozechner.at/posts/2026-04-08-ive-sold-out/';
		lines.push('│ ' + url.padEnd(width - 2) + ' │');
		lines.push('└' + '─'.repeat(width) + '┘');
		return lines;
	}

	clearCache(): void {
		// No cache
	}
}
