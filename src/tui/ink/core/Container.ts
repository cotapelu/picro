// Container - flex container cho layout
// Bắt chước nguyên tắc pi-tui layout.ts:
//   - Flexbox semantics: basis/grow/shrink/minSize/maxSize
//   - Tính toán layout con, render children
// Port sang TSX riêng, không copy code trực tiếp.

import { Component, FlexProps, TuiMouseEvent, TuiMouseEventResult } from "./TuiTypes.js";

interface ChildWithProps {
  component: Component;
  props: FlexProps;
}

/**
 * Container - flex container đơn giản.
 * Children được layout theo trục dọc (column) mặc định.
 */
export class Container implements Component {
  private children: ChildWithProps[] = [];
  private lastWidth = 0;
  private lastRenderedLines: string[] = [];

  addChild(child: Component, props: FlexProps = {}): void {
    this.children.push({ component: child, props: { ...props } });
    this.invalidate();
  }

  removeChild(child: Component): void {
    const idx = this.children.findIndex((c) => c.component === child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      this.invalidate();
    }
  }

  clear(): void {
    this.children = [];
    this.invalidate();
  }

  getChildren(): Component[] {
    return this.children.map((c) => c.component);
  }

  invalidate(): void {
    this.lastWidth = 0;
    this.lastRenderedLines = [];
    for (const { component } of this.children) {
      component.invalidate();
    }
  }

  render(width: number): string[] {
    // Nếu width không đổi và không có child invalidate, trả về cached
    if (width === this.lastWidth && this.lastRenderedLines.length > 0) {
      let allValid = true;
      for (const { component } of this.children) {
        // Simple check - in real impl, track dirty flags
      }
      if (allValid) return this.lastRenderedLines;
    }

    this.lastWidth = width;

    // Tính layout cho children
    const childLayouts = this.calculateLayout(width);

    // Render each child
    const lines: string[] = [];
    for (const { component, rect } of childLayouts) {
      const childLines = component.render(rect.width);
      // Pad/truncate to rect.width
      for (const line of childLines) {
        const lineWidth = this.visibleWidth(line);
        if (lineWidth < rect.width) {
          lines.push(line + " ".repeat(rect.width - lineWidth));
        } else {
          lines.push(this.truncateToWidth(line, rect.width));
        }
      }
    }

    this.lastRenderedLines = lines;
    return lines;
  }

  private calculateLayout(width: number): Array<{ component: Component; rect: { x: number; y: number; width: number; height: number } }> {
    const results: Array<{ component: Component; rect: { x: number; y: number; width: number; height: number } }> = [];

    // Calculate total flex
    let totalGrow = 0;
    let totalBasis = 0;
    let fixedHeight = 0;

    for (const { props } of this.children) {
      const basis = props.basis === "auto" ? 0 : (props.basis ?? 0);
      totalBasis += basis;
      totalGrow += props.grow ?? 0;
      const minSize = props.minSize ?? 0;
      if ((props.grow ?? 0) === 0 && basis === 0 && minSize > 0) {
        fixedHeight += minSize;
      }
    }

    const availableHeight = Math.max(0, 1000 - totalBasis - fixedHeight); // Large available space
    let currentY = 0;

    for (const { component, props } of this.children) {
      const basis = props.basis === "auto" ? 0 : (props.basis ?? 0);
      const grow = props.grow ?? 0;
      const shrink = props.shrink ?? 1;
      const minSize = props.minSize ?? 0;
      const maxSize = props.maxSize ?? Infinity;

      let height = basis;
      if (grow > 0 && availableHeight > 0) {
        height += (availableHeight * grow) / (totalGrow || 1);
      }
      height = Math.max(minSize, Math.min(maxSize, height));

      results.push({
        component,
        rect: { x: 0, y: currentY, width, height },
      });
      currentY += height;
    }

    return results;
  }

  handleInput(data: string): void {
    // Forward to focused child or last child
    for (let i = this.children.length - 1; i >= 0; i--) {
      const { component } = this.children[i];
      if (component.handleInput) {
        component.handleInput(data);
        if (this.isFocused(component)) return;
      }
    }
  }

  handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
    // Forward to child under mouse
    for (const { component } of this.children) {
      if (component.handleMouse) {
        const result = component.handleMouse(event);
        if (result?.handled) return result;
      }
    }
    return undefined;
  }

  destroy(): void {
    for (const { component } of this.children) {
      component.destroy?.();
    }
    this.children = [];
  }

  private isFocused(component: Component): boolean {
    return "focused" in component && (component as any).focused === true;
  }

  private visibleWidth(text: string): number {
    // Simple width calculation ignoring ANSI
    return text.replace(/\x1b\[[0-9;]*m/g, "").length;
  }

  private truncateToWidth(text: string, width: number): string {
    const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
    if (plain.length <= width) return text;
    return plain.slice(0, width) + "\x1b[0m";
  }
}

/**
 * VStack - vertical stack (column layout).
 * Alias cho Container với column direction.
 */
export class VStack extends Container {
  constructor(children: Array<{ component: Component } & FlexProps> = []) {
    super();
    for (const { component, ...props } of children) {
      this.addChild(component, props);
    }
  }
}

/**
 * HStack - horizontal stack (row layout).
 * Children được layout ngang.
 */
export class HStack implements Component {
  private children: ChildWithProps[] = [];
  private lastWidth = 0;
  private lastRenderedLines: string[] = [];

  addChild(child: Component, props: FlexProps = {}): void {
    this.children.push({ component: child, props: { ...props } });
    this.invalidate();
  }

  removeChild(child: Component): void {
    const idx = this.children.findIndex((c) => c.component === child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      this.invalidate();
    }
  }

  clear(): void {
    this.children = [];
    this.invalidate();
  }

  invalidate(): void {
    this.lastWidth = 0;
    this.lastRenderedLines = [];
    for (const { component } of this.children) {
      component.invalidate();
    }
  }

  render(width: number): string[] {
    if (width === this.lastWidth && this.lastRenderedLines.length > 0) {
      return this.lastRenderedLines;
    }
    this.lastWidth = width;

    // Calculate widths
    const childWidths = this.calculateWidths(width);

    // Render each child to its width
    const childLines: string[][] = [];
    let maxHeight = 0;

    for (let i = 0; i < this.children.length; i++) {
      const { component } = this.children[i];
      const w = childWidths[i];
      const lines = component.render(w);
      childLines.push(lines);
      maxHeight = Math.max(maxHeight, lines.length);
    }

    // Combine horizontally
    const result: string[] = [];
    for (let row = 0; row < maxHeight; row++) {
      let line = "";
      for (let i = 0; i < this.children.length; i++) {
        const w = childWidths[i];
        const childLine = childLines[i][row] ?? "";
        const plainWidth = childLine.replace(/\x1b\[[0-9;]*m/g, "").length;
        line += childLine + " ".repeat(Math.max(0, w - plainWidth));
      }
      result.push(line);
    }

    this.lastRenderedLines = result;
    return result;
  }

  private calculateWidths(totalWidth: number): number[] {
    let totalBasis = 0;
    let totalGrow = 0;
    let fixedCount = 0;

    for (const { props } of this.children) {
      const basis = props.basis === "auto" ? 0 : (props.basis ?? 0);
      totalBasis += basis;
      totalGrow += props.grow ?? 0;
      if ((props.grow ?? 0) === 0 && basis === 0) fixedCount++;
    }

    const remaining = Math.max(0, totalWidth - totalBasis);
    const widths: number[] = [];

    for (const { props } of this.children) {
      const basis = props.basis === "auto" ? 0 : (props.basis ?? 0);
      const grow = props.grow ?? 0;
      let w = basis;
      if (grow > 0 && remaining > 0) {
        w += Math.floor((remaining * grow) / (totalGrow || 1));
      }
      widths.push(w);
    }

    return widths;
  }

  handleInput(data: string): void {
    for (const { component } of this.children) {
      if (component.handleInput) component.handleInput(data);
    }
  }

  handleMouse(event: TuiMouseEvent): TuiMouseEventResult | undefined {
    for (const { component } of this.children) {
      if (component.handleMouse) {
        const result = component.handleMouse(event);
        if (result?.handled) return result;
      }
    }
    return undefined;
  }

  destroy(): void {
    for (const { component } of this.children) {
      component.destroy?.();
    }
    this.children = [];
  }
}