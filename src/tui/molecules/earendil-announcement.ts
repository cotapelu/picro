/**
 * Earendil Announcement Component (stub)
 * Shows an announcement about pi joining Earendil.
 *
 * Legacy reference: pi-tui-legacy/interactive/components/earendil-announcement.ts
 */

import type { UIElement, RenderContext } from '../core/base';
import { truncateText } from '../core/internal-utils';

export class EarendilAnnouncementComponent implements UIElement {
	draw(context: RenderContext): string[] {
		const totalWidth = context.width;
		const borderWidth = totalWidth - 2;
		const innerWidth = borderWidth - 2; // space between side spaces
		const lines: string[] = [];
		lines.push('┌' + '─'.repeat(borderWidth) + '┐');
		lines.push('│ ' + truncateText('pi has joined Earendil', innerWidth).padEnd(innerWidth) + ' │');
		lines.push('│ ' + truncateText('Read the blog post:', innerWidth).padEnd(innerWidth) + ' │');
		const url = 'https://mariozechner.at/posts/2026-04-08-ive-sold-out/';
		lines.push('│ ' + truncateText(url, innerWidth).padEnd(innerWidth) + ' │');
		lines.push('└' + '─'.repeat(borderWidth) + '┘');
		return lines;
	}

	clearCache(): void {
		// No cache
	}
}
