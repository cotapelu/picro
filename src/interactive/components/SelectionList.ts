// SelectionList component - for selecting from a list (like sessions, models)
// BoxProps not used; if needed import fromtypes if defined there


export interface SelectionListItem {
  id: string;
  label: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface SelectionListProps {
  /**
   * List of items
   */
  items: SelectionListItem[];
  /**
   * Selected index (-1 if none)
   */
  selectedIndex?: number;
  /**
   * Width of the list
   */
  width?: number;
  /**
   * Max visible items (scroll if more)
   */
  maxVisible?: number;
  /**
   * Show index numbers
   */
  showIndex?: boolean;
  /**
   * Formatter function
   */
  formatItem?: (item: SelectionListItem, index: number, selected: boolean) => string;
}

export function renderSelectionList(props: SelectionListProps): string {
  const width = props.width || 60;
  const maxVisible = props.maxVisible || 10;
  const items = props.items;
  const selected = props.selectedIndex ?? -1;

  // Determine visible range (centered on selected if possible)
  let startIdx = 0;
  if (selected >= 0) {
    startIdx = Math.max(0, selected - Math.floor(maxVisible / 2));
  }
  const visibleItems = items.slice(startIdx, startIdx + maxVisible);

  const lines: string[] = [];

  for (let i = 0; i < visibleItems.length; i++) {
    const item = visibleItems[i];
    const globalIndex = startIdx + i;
    const isSelected = globalIndex === selected;

    let line: string;
    if (props.formatItem) {
      line = props.formatItem(item, globalIndex, isSelected);
    } else {
      line = formatDefault(item, globalIndex, isSelected, !!props.showIndex);
    }

    // Truncate to width
    if (line.length > width) {
      line = line.slice(0, width - 3) + '...';
    }

    lines.push(line);
  }

  // Add scroll indicators if needed
  if (startIdx > 0) {
    lines.unshift('▲ More above');
  }
  if (startIdx + maxVisible < items.length) {
    lines.push('▼ More below');
  }

  return lines.join('\n');
}

function formatDefault(
  item: SelectionListItem,
  index: number,
  selected: boolean,
  showIndex: boolean
): string {
  const prefix = selected ? '❯ ' : (showIndex ? `  ${index + 1}. ` : '   ');
  const label = selected ? `\x1b[7m${item.label}\x1b[0m` : item.label;
  const description = item.description ? ` - ${item.description}` : '';

  return prefix + label + description;
}

export function moveSelection(
  current: number,
  direction: 'up' | 'down',
  itemCount: number,
  wrap?: boolean
): number {
  const wrapMode = wrap ?? false;
  if (itemCount === 0) return -1;

  if (direction === 'up') {
    if (current <= 0) {
      return wrapMode ? itemCount - 1 : 0;
    }
    return current - 1;
  } else {
    if (current >= itemCount - 1) {
      return wrapMode ? 0 : itemCount - 1;
    }
    return current + 1;
  }
}

export function createSelectionList(
  items: SelectionListItem[],
  selectedIndex = -1
): SelectionListProps {
  return {
    items,
    selectedIndex,
    width: 60,
    maxVisible: 10,
    showIndex: true,
  };
}
