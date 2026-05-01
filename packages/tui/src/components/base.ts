/**
 * Base types for TUI Components
 *
 * Core interfaces and types that all components depend on.
 * This file should NOT import from any component file.
 */

/**
 * Base interface for all UI elements.
 * Each element can draw itself to a list of text lines.
 */
export interface UIElement {
  /**
   * Draw the element to lines for the given viewport width
   * @param context - Rendering context with width and other info
   * @returns Array of strings, each representing a line
   */
  draw(context: RenderContext): string[];

  /**
   * Optional handler for keyboard input when element has focus
   */
  handleKey?(key: KeyEvent): void;

  /**
   * If true, element receives key release events.
   * Default is false - release events are filtered out.
   */
  wantsKeyRelease?: boolean;

  /**
   * Clear any cached rendering state.
   * Called when theme changes or when element needs to redraw from scratch.
   */
  clearCache(): void;
}

/**
 * Rendering context passed to draw methods
 */
export interface RenderContext {
  /** Available width for rendering */
  width: number;
  /** Available height for rendering */
  height: number;
  /** Current theme for styling */
  theme?: UITheme;
}

/**
 * Interface for elements that can receive focus and display a cursor.
 * When focused, the element should emit CURSOR_MARKER at the cursor position
 * in its draw output. TerminalUI will find this marker and position the cursor there.
 */
export interface InteractiveElement {
  /** Set by TerminalUI when focus changes. Element should emit CURSOR_MARKER when true. */
  isFocused: boolean;
}

/**
 * Type guard to check if an element implements InteractiveElement
 */
export function isInteractive(element: UIElement | null): element is UIElement & InteractiveElement {
  return element !== null && 'isFocused' in element;
}

/**
 * Keyboard event data
 */
export interface KeyEvent {
  /** Raw key data from terminal */
  raw: string;
  /** Key name if recognized (e.g., 'Enter', 'Escape') */
  name?: string;
  /** Modifier keys */
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
}

/**
 * Mouse event data
 */
export interface MouseEvent {
  /** Row (0-indexed) */
  row: number;
  /** Column (0-indexed) */
  col: number;
  /** Mouse button */
  button: 'left' | 'right' | 'middle' | 'release';
  /** Modifier keys */
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
}

/**
 * Cursor position marker - APC (Application Program Command) sequence.
 * This is a zero-width escape sequence that terminals ignore.
 * Elements emit this at the cursor position when focused.
 * TerminalUI finds and strips this marker, then positions the cursor there.
 */
export const CURSOR_MARKER = '\x1b_pi:c\x07';

/**
 * Value that can be absolute (number) or percentage (string like "50%")
 */
export type Dimension = number | `${number}%`;

/**
 * Parse a Dimension into absolute value given a reference size
 */
export function resolveDimension(value: Dimension | undefined, referenceSize: number): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === 'string' && value.endsWith('%')) {
    const percent = parseFloat(value.slice(0, -1));
    const clamped = Math.max(0, Math.min(100, percent));
    return Math.round((clamped / 100) * referenceSize);
  }
  return undefined;
}

/**
 * Result of key event handling
 */
export type KeyHandlerResult = { consume?: boolean; data?: string } | undefined;

/**
 * Handler for keyboard events
 */
export type KeyHandler = (key: KeyEvent) => KeyHandlerResult;

/**
 * Input listener for preprocessing raw data
 * Can modify or consume input before key parsing
 */
export type InputListener = (data: string) => { consume?: boolean; data?: string } | undefined;

/**
 * Anchor position for floating panels
 */
export type PanelAnchor =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center'
  | 'left-center'
  | 'right-center';

/**
 * Margin configuration for panels
 */
export interface PanelMargin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/**
 * Options for panel positioning
 */
export interface PanelOptions {
  anchor?: PanelAnchor;
  /** Minimum width in columns */
  minWidth?: number;
  /** Height in rows, or percentage of terminal height (e.g., "50%") */
  panelHeight?: Dimension;
  /** Maximum height in rows, or percentage of terminal height (e.g., "50%") */
  maxHeight?: Dimension;
  /** Horizontal offset from anchor position (positive = right) */
  offsetX?: number;
  /** Vertical offset from anchor position (positive = down) */
  offsetY?: number;
  /** Margin from terminal edges. Number applies to all sides. */
  padding?: PanelMargin | number;
	/** Alias for padding (legacy API compatibility) */
	margin?: PanelMargin | number;
  /** Control panel visibility based on terminal dimensions. */
  visible?: (termWidth: number, termHeight: number) => boolean;
  /** If true, don't capture keyboard focus when shown */
  nonCapturing?: boolean;
  /** Row position: absolute number, or percentage (e.g., "25%" = 25% from top) */
  row?: Dimension;
  /** Column position: absolute number, or percentage (e.g., "50%" = centered horizontally) */
  col?: Dimension;
  width?: Dimension;
  height?: Dimension;
  /** Stacking order for panels. Higher values appear on top. */
  zIndex?: number;
}

/**
 * Handle returned by showPanel for controlling the panel
 */
export interface PanelHandle {
  /** Permanently remove the panel (cannot be shown again) */
  close(): void;
  /** Temporarily hide or show the panel */
  setHidden(hidden: boolean): void;
  /** Check if panel is temporarily hidden */
  isHidden(): boolean;
  /** Focus this panel and bring it to the visual front */
  focus(): void;
  /** Release focus to the previous target */
  unfocus(): void;
  /** Check if this panel currently has focus */
  isFocused(): boolean;
  /** Change the z-index of this panel */
  setZIndex(zIndex: number): void;
  /** Get current z-index */
  getZIndex(): number;
  /** Increase z-index to be on top of all other panels */
  bringToFront(): void;
  /** Decrease z-index to be below all other panels */
  sendToBack(): void;
}

/**
 * Theme configuration for UI elements
 */
export interface UITheme {
  /** Default text color */
  textColor?: string;
  /** Default background color */
  bgColor?: string;
  /** Border color */
  borderColor?: string;
  /** Accent color */
  accentColor?: string;
  /** Error color */
  errorColor?: string;
  /** Warning color */
  warningColor?: string;
  /** Success color */
  successColor?: string;
}

/**
 * Container element that holds child elements.
 * Base implementation - can be extended by components that need composition.
 */
export class ElementContainer implements UIElement {
  public children: UIElement[] = [];

  /** Draw all child elements */
  draw(context: RenderContext): string[] {
    const lines: string[] = [];
    for (const child of this.children) {
      const childLines = child.draw(context);
      for (const line of childLines) {
        lines.push(line);
      }
    }
    return lines;
  }

  /** Add a child element */
  append(element: UIElement): void {
    this.children.push(element);
  }

  /** Remove a child element */
  remove(element: UIElement): void {
    const index = this.children.indexOf(element);
    if (index !== -1) {
      this.children.splice(index, 1);
    }
  }

  /** Remove all child elements */
  clear(): void {
    this.children = [];
  }

  /** Clear cache for all child elements */
  clearCache(): void {
    for (const child of this.children) {
      child.clearCache?.();
    }
  }
}

/**
 * Interface for elements that can be expanded/collapsed.
 */
export interface Expandable {
	setExpanded(expanded: boolean): void;
}

/**
 * Utility types for component styling
 */
export type BorderStyle = 'single' | 'double' | 'solid' | 'dotted' | 'dashed' | 'none';

export type TextAlignment = 'left' | 'center' | 'right';

export type VerticalAlignment = 'top' | 'middle' | 'bottom';
