/**
 * SettingsList Component
 * List for toggling settings
 */

import { CURSOR_MARKER, type UIElement, type InteractiveElement, type RenderContext, type KeyEvent } from '../atoms/base';
import { truncateText, visibleWidth } from '../atoms/internal-utils';
import { getKeybindings } from '../atoms/keybindings';

export interface SettingsListSettingItem {
	id: string;
	label: string;
	currentValue: string;
	values: string[];
}

export interface SettingsListTheme {
	selected?: (text: string) => string;
	normal?: (text: string) => string;
	value?: (text: string) => string;
}

/**
 * SettingsList - list of settings with toggle values
 */
export class SettingsList implements UIElement, InteractiveElement {
	private items: SettingsListSettingItem[];
	private visibleRows: number;
	private theme: SettingsListTheme;
	private selectedIndex = 0;
	private scrollOffset = 0;
	private onChange?: (id: string, newValue: string) => void;
	private onClose?: () => void;

	public isFocused = false;

	constructor(
		items: SettingsListSettingItem[],
		visibleRows: number,
		theme: SettingsListTheme = {},
		onChange?: (id: string, value: string) => void,
		onClose?: () => void
	) {
		this.items = items;
		this.visibleRows = visibleRows;
		this.theme = theme;
		this.onChange = onChange;
		this.onClose = onClose;
	}

	setItems(items: SettingsListSettingItem[]): void {
		this.items = items;
		this.selectedIndex = Math.min(this.selectedIndex, items.length - 1);
	}

	handleKey(key: KeyEvent): void {
		const data = key.raw;
		const kb = getKeybindings();

		if (kb.matches(data, 'tui.select.cancel')) {
			this.onClose?.();
			return;
		}

		if (kb.matches(data, 'tui.select.confirm')) {
			const item = this.items[this.selectedIndex];
			if (item) {
				const currentIdx = item.values.indexOf(item.currentValue);
				const nextIdx = (currentIdx + 1) % item.values.length;
				const newValue = item.values[nextIdx];
				item.currentValue = newValue;
				this.onChange?.(item.id, newValue);
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
	}

	draw(context: RenderContext): string[] {
		const width = context.width;
		const lines: string[] = [];

		const startIdx = this.scrollOffset;
		const endIdx = Math.min(startIdx + this.visibleRows, this.items.length);
		const visibleItems = this.items.slice(startIdx, endIdx);

		for (let i = 0; i < visibleItems.length; i++) {
			const item = visibleItems[i];
			const isSelected = startIdx + i === this.selectedIndex;

			const prefix = isSelected ? '> ' : '  ';
			const label = isSelected ? (this.theme.selected ? this.theme.selected(item.label) : `\x1b[36m${item.label}\x1b[0m`) : `\x1b[2m${item.label}\x1b[22m`;
			const value = item.currentValue;
			const valueStr = this.theme.value ? this.theme.value(`[${value}]`) : `\x1b[33m[${value}]\x1b[0m`;

			const line = prefix + label + ' '.repeat(Math.max(1, width - visibleWidth(prefix + label + value) - 1)) + valueStr;
			lines.push(truncateText(line, width));
		}

		// Scroll indicator
		if (this.items.length > this.visibleRows) {
			const info = `[${startIdx + 1}-${endIdx}/${this.items.length}]`;
			lines.push(truncateText(info, width));
		}

		if (this.isFocused) {
			lines[0] = CURSOR_MARKER + lines[0];
		}

		return lines;
	}

	clearCache(): void {
		// No caching
	}

	private adjustScroll(): void {
		if (this.selectedIndex < this.scrollOffset) {
			this.scrollOffset = this.selectedIndex;
		} else if (this.selectedIndex >= this.scrollOffset + this.visibleRows) {
			this.scrollOffset = this.selectedIndex - this.visibleRows + 1;
		}
		this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, Math.max(0, this.items.length - this.visibleRows)));
	}
}
