/**
 * Thinking Selector Component
 * Interactive selector for thinking/reasoning level
 */

import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from '../atoms/base';
import { SelectList, type SelectItem } from '../molecules/select-list';

export type ThinkingLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';

const LEVEL_DESCRIPTIONS: Record<ThinkingLevel, string> = {
	off: 'No reasoning',
	minimal: 'Very brief reasoning (~1k tokens)',
	low: 'Light reasoning (~2k tokens)',
	medium: 'Moderate reasoning (~8k tokens)',
	high: 'Deep reasoning (~16k tokens)',
	xhigh: 'Maximum reasoning (~32k tokens)',
};

/**
 * Options for ThinkingSelector
 */
export interface ThinkingSelectorOptions {
	/** Current thinking level */
	currentLevel: ThinkingLevel;
	/** Available thinking levels to show (usually from session.getAvailableThinkingLevels()) */
	availableLevels: ThinkingLevel[];
	/** Called when a level is selected */
	onSelect: (level: ThinkingLevel) => void;
	/** Called when selector is cancelled */
	onCancel: () => void;
}

/**
 * ThinkingSelector - A dialog for selecting the thinking level
 *
 * Displays a bordered box with a list of thinking levels and their descriptions.
 * Supports keyboard navigation and selection.
 */
export class ThinkingSelector implements UIElement, InteractiveElement {
	private selectList: SelectList;
	public isFocused = false;

	constructor(options: ThinkingSelectorOptions) {
		const items: SelectItem[] = options.availableLevels.map((level) => ({
			value: level,
			label: level,
			description: LEVEL_DESCRIPTIONS[level],
		}));

		this.selectList = new SelectList(
			items,
			items.length, // visibleRows: show all
			{}, // theme: use defaults
			(value) => options.onSelect(value as ThinkingLevel),
			options.onCancel
		);

		// Preselect current level
		const currentIndex = items.findIndex((item) => item.value === options.currentLevel);
		if (currentIndex !== -1) {
			this.selectList.setSelectedIndex(currentIndex);
		}
	}

	draw(context: RenderContext): string[] {
		const width = context.width;
		const lines: string[] = [];

		// Border top
		lines.push('┌' + '─'.repeat(Math.max(0, width - 2)) + '┐');

		// Title line
		const title = ' Thinking Level ';
		const titlePad = ' '.repeat(Math.max(0, Math.floor((width - 2 - title.length) / 2)));
		lines.push('│' + titlePad + title + titlePad + '│');

		// Separator
		lines.push('├' + '─'.repeat(Math.max(0, width - 2)) + '┤');

		// Select list content
		const selectLines = this.selectList.draw({ width, height: context.height });
		lines.push(...selectLines);

		// Border bottom
		lines.push('└' + '─'.repeat(Math.max(0, width - 2)) + '┘');

		return lines;
	}

	handleKey(key: KeyEvent): void {
		// Forward key events to the select list
		this.selectList.handleKey?.(key);
	}

	clearCache(): void {
		this.selectList.clearCache?.();
	}
}
