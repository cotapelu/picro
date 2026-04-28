/**
 * SelectList Component
 * Interactive list for selecting items
 */

import { CURSOR_MARKER } from './base.js';
import type { UIElement, InteractiveElement, RenderContext, KeyEvent } from './base.js';
import { visibleWidth, truncateText } from './internal-utils.js';
import { getKeybindings } from './keybindings.js';

export interface SelectItem {
	value: string;
	label: string;
	description?: string;
}

export interface SelectListTheme {
	selectedPrefix?: (text: string) => string;
	selectedText?: (text: string) => string;
	description?: (text: string) => string;
	scrollInfo?: (text: string) => string;
	noMatch?: (text: string) => string;
}

/**
 * SelectList - scrollable list with selection
 */
export class SelectList implements UIElement, InteractiveElement {
	private items: SelectItem[];
	private visibleRows: number;
	private theme: SelectListTheme;
	private selectedIndex = 0;
	private scrollOffset = 0;
	private filter = '';
	private onSelect?: (value: string) => void;
	private onCancel?: () => void;
	private multiSelect = false;
	private selectedIndices = new Set<number>();
	private onSelectionChange?: (indices: number[]) => void;

	public isFocused = false;

	constructor(
		items: SelectItem[],
		visibleRows: number,
		theme: SelectListTheme = {},
		onSelect?: (value: string) => void,
		onCancel?: () => void
	) {
		this.items = items;
		this.visibleRows = visibleRows;
		this.theme = theme;
		this.onSelect = onSelect;
		this.onCancel = onCancel;
	}

	setMultiSelect(enabled: boolean): void {
		this.multiSelect = enabled;
		if (!enabled) this.selectedIndices.clear();
	}

	isMultiSelect(): boolean {
		return this.multiSelect;
	}

	getSelectedIndices(): number[] {
		return Array.from(this.selectedIndices).sort((a,b)=>a-b);
	}

	toggleSelection(index: number): void {
		if (this.selectedIndices.has(index)) this.selectedIndices.delete(index);
		else this.selectedIndices.add(index);
		this.onSelectionChange?.(this.getSelectedIndices());
	}

	setItems(items: SelectItem[]): void {
		this.items = items;
		this.selectedIndex = Math.min(this.selectedIndex, items.length - 1);
		this.selectedIndex = Math.max(0, this.selectedIndex);
	}

	handleKey(key: KeyEvent): void {
		const data = key.raw;
		const kb = getKeybindings();

		if (kb.matches(data, 'tui.select.cancel')) {
			this.onCancel?.();
			return;
		}

		// Space toggles selection in multi-select mode (precedes confirm)
		if (this.multiSelect && (key.name === ' ' || data === ' ')) {
			this.toggleSelection(this.selectedIndex);
			return;
		}

		if (kb.matches(data, 'tui.select.confirm')) {
			if (this.items[this.selectedIndex]) {
				this.onSelect?.(this.items[this.selectedIndex].value);
			}
			return;
		}

		if (kb.matches(data, 'tui.select.up')) {
			if (this.selectedIndex > 0) {
				this.selectedIndex--;
				this.adjustScroll();
			}
			return;
		}

		if (kb.matches(data, 'tui.select.down')) {
			if (this.selectedIndex < this.items.length - 1) {
				this.selectedIndex++;
				this.adjustScroll();
			}
			return;
		}

		// Page Up/Down
		if (kb.matches(data, 'tui.select.pageup')) {
			this.selectedIndex = Math.max(0, this.selectedIndex - this.visibleRows);
			this.adjustScroll();
			return;
		}

		if (kb.matches(data, 'tui.select.pagedown')) {
			this.selectedIndex = Math.min(this.items.length - 1, this.selectedIndex + this.visibleRows);
			this.adjustScroll();
			return;
		}

		// Type-to-filter: capture printable characters
		if (data.length === 1 && !key.modifiers && key.name && key.name.length === 1 && data >= ' ' && data <= '~') {
			this.filter += data;
			this.selectedIndex = 0;
			return;
		}
		// Backspace to remove last char from filter
		if (key.name === 'Backspace' || data === '\x7f') {
			this.filter = this.filter.slice(0, -1);
			this.selectedIndex = 0;
			return;
		}

	}

	draw(context: RenderContext): string[] {
		const width = context.width;
		const lines: string[] = [];

		// Filter items if filter is set
		let displayItems = this.items;
		if (this.filter) {
			const lower = this.filter.toLowerCase();
			displayItems = this.items.filter(
				item => item.label.toLowerCase().includes(lower) || item.value.toLowerCase().includes(lower)
			);
		}

		// Show "no match" if filtered and empty
		if (this.filter && displayItems.length === 0) {
			const msg = this.theme.noMatch ? this.theme.noMatch('No matches') : 'No matches';
			lines.push(truncateText(msg, width));
			return lines;
		}

		// Calculate visible range
		const startIdx = this.scrollOffset;
		const endIdx = Math.min(startIdx + this.visibleRows, displayItems.length);
		const visibleItems = displayItems.slice(startIdx, endIdx);

		// Calculate label width
		const maxLabelWidth = visibleItems.reduce((max, item) => Math.max(max, visibleWidth(item.label)), 0);
		const maxDescWidth = visibleItems.reduce((max, item) => {
			if (!item.description) return max;
			return Math.max(max, visibleWidth(item.description));
		}, 0);

		for (let i = 0; i < visibleItems.length; i++) {
			const item = visibleItems[i];
			const isSelected = startIdx + i === this.selectedIndex;
			const isMultiSelected = this.multiSelect && this.selectedIndices.has(startIdx + i);

			// Prefix: marker for multi-select, arrow for single-selected
			let prefix = '';
			if (isMultiSelected) {
			  prefix = '\x1b[32m[✓]\x1b[0m ';
			} else if (isSelected) {
			  prefix = this.theme.selectedPrefix ? this.theme.selectedPrefix('> ') : '\x1b[36m> \x1b[0m';
			} else {
			  prefix = '  ';
			}
			let label = item.label;
			let desc = item.description || '';

			if (isSelected) {
				if (this.theme.selectedText) {
					label = this.theme.selectedText(label);
				}
				if (desc && this.theme.description) {
					desc = this.theme.description(desc);
				}
			} else {
				label = '\x1b[2m' + label + '\x1b[22m';
				if (desc) {
					desc = '\x1b[2m' + desc + '\x1b[22m';
				}
			}

			// Build line: prefix + label + (desc)
			const padding = ' '.repeat(maxLabelWidth - visibleWidth(item.label) + 2);
			const line = prefix + label + padding + desc;
			lines.push(truncateText(line, width));
		}

		// Scroll indicator if needed
		if (displayItems.length > this.visibleRows) {
			const scrollInfo = this.theme.scrollInfo ? this.theme.scrollInfo(`[${startIdx + 1}-${endIdx}/${displayItems.length}]`) : `[${startIdx + 1}-${endIdx}/${displayItems.length}]`;
			lines.push(truncateText(scrollInfo, width));
		}

		if (this.isFocused) {
			lines[0] = CURSOR_MARKER + lines[0];
		}

		return lines;
	}

	/** Handle mouse click to select an item */
	handleMouse?(event: { row: number; col: number; button: string }): void {
		if (event.button !== 'left') return;
		const index = event.row;
		if (index >= 0 && index < this.items.length) {
			this.selectedIndex = index;
			const item = this.items[index];
			this.onSelect?.(item.value);
		}
	}

	clearCache(): void {
		// No caching
	}

	private adjustScroll(): void {
		// Filter items if filtered
		let displayItems = this.items;
		if (this.filter) {
			const lower = this.filter.toLowerCase();
			displayItems = this.items.filter(
				item => item.label.toLowerCase().includes(lower) || item.value.toLowerCase().includes(lower)
			);
		}

		// Ensure selected is visible
		if (this.selectedIndex < this.scrollOffset) {
			this.scrollOffset = this.selectedIndex;
		} else if (this.selectedIndex >= this.scrollOffset + this.visibleRows) {
			this.scrollOffset = this.selectedIndex - this.visibleRows + 1;
		}

		// Clamp scroll
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, Math.max(0, displayItems.length - this.visibleRows)));
	}

	/** Set the selected index */
	setSelectedIndex(index: number): void {
		this.selectedIndex = Math.max(0, Math.min(index, this.items.length - 1));
		this.adjustScroll();
	}
}
